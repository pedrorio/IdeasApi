# Design

## Context

See `proposal.md`. Checked on `b0bed65`:

- `ValidatorPipe` validates a class instance and returns the raw body (`validator.pipe.ts:34`). `class-validator` 0.9.1 already implements `whitelist` and `forbidNonWhitelisted`. The pipe never passes those options.
- Registration does `create(data)` then `save` (`user-authentication-registration.service.ts:30-31`). Idea create spreads `data` (`idea.service.ts:87`). Idea update calls `update(id, data)` (`idea.service.ts:105`).
- `jwt.verify(token, process.env.JWT_SECRET || jwtSecret)` is `user-authentication.guard.ts:59`. `jwtSecret` is `process.env.JWT_SECRET` captured at import (`app.constants.ts:28`). Installed `jsonwebtoken` 8.4.0 accepts an `alg: none` token when the secret is `undefined` or `""`. `jwt.sign` throws when the secret is missing, so issuance already fails. A non-empty secret already rejects `alg: none`.
- `formatError` (`app.module.ts:33-46`) copies `extensions.stacktrace` onto `extensions.exception.stacktrace`.
- `findMe` (`user-authentication-session.resolver.ts:23-28`) uses `Query` from `@nestjs/common` (`:4` and `:8`). That decorator does not register a GraphQL resolver. The schema still declares `findMe`. A live query returned HTTP 200, `data: null`, and `Cannot return null for non-nullable field Query.findMe` with a stack. `createIdea` without a header returned HTTP 200 and `Forbidden resource` with `extensions.code` `FORBIDDEN`. REST `GET /auth/me` is guarded at `user-authentication-session.controller.ts:31-32`.
- Both policies compare `JSON.stringify` at line 13. Comment update authorizes and then writes `{ ...data, idea, author: user }` (`comment-idea.service.ts:84-88`), so a client author did not stick. The review's line range 85-87 is that update.
- The review's Postgres 17 note does not match this repo's Postgres 18. The findings above still reproduced.

`@IsString()` on `IdeaDTO` rejects a body that omits `idea`. Do not loosen that.

## Goals / Non-Goals

**Goals:**

- Unknown JSON properties never reach `create` or `update`.
- The process does not listen without a 32-byte secret, and tokens are HS256.
- GraphQL clients do not receive stack frames outside development.
- `findMe` is a real guarded query.
- Ownership uses ids.

**Non-Goals:**

- CORS, Swagger, `csrfPrevention`, rate limits, enumeration, timing, logging, Compose, CI action pinning, and dependency bumps other than the two named packages.
- A password-change API, refresh tokens, or a secret-strength check beyond length.
- Replacing `ValidatorPipe` with Nest's `ValidationPipe`.
- Changing a missing `Authorization` header from 403 to 401.
- Explicit field copies for comments or votes. The global pipe covers those bodies.

## Decisions

- Keep `ValidatorPipe`. Call `validate(object, { whitelist: true, forbidNonWhitelisted: true })` and return `object`, not the raw body. Keep the empty-body message `Validation failed: No body submited`.
- `createRegistration` persists `{ username, password }` only. The database assigns `id`. `@BeforeInsert` hashes the password on that insert. Do not add hashing for a general update.
- `createIdea` persists `{ idea, description, author: authenticated user }`. `updateIdea` writes only the `idea` and `description` strings that are present, never `id` or `author`.
- Check `process.env.JWT_SECRET` in `main.ts` before `NestFactory.create`. Missing, empty, or fewer than 32 UTF-8 bytes exits non-zero and does not listen. `jwt.sign` uses `{ algorithm: "HS256", expiresIn: "7d" }`. `jwt.verify` uses `{ algorithms: ["HS256"] }`. The sign option is singular.
- Install `jsonwebtoken` 9.0.3 and `class-validator` 0.14.4. `class-validator` 0.14 defaults `forbidUnknownValues` to true; DTO instances have metadata, so leave that default. Bump `class-transformer` or `@types/jsonwebtoken` only if install or `tsc` fails. This is the only dependency exception to `upgrade-stack`.
- Lengthen every in-repo `JWT_SECRET` that boots the API, including `ci-secret`, `migration-e2e`, `votes-e2e`, `auth-e2e`, and the guard spec fixture, to at least 32 bytes.
- In `formatError`, when `NODE_ENV === "development"`, keep the current copy onto `exception.stacktrace`. Otherwise delete `stacktrace` and `exception`. Unset `NODE_ENV` strips. Do not add a log sink.
- Replace the `Query` cast with `@Query()` from `@nestjs/graphql` and add `@UseGuards(UserAuthenticationGuard)`. Missing header matches `createIdea`: HTTP 200, an error, no user. A valid token returns that username.
- Policies: missing entity stays 404. If `user` or `author` is missing, or `user.id !== author.id`, respond 401. Do not read `author.id` when `author` is missing.

## Risks / Trade-offs

- [Clients send extra JSON properties] → Those requests become 400. The proposal marks that breaking.
- [Deployments use a short `JWT_SECRET`] → The process will not listen until the secret is 32 UTF-8 bytes. Test and CI secrets change in the same change.
- [`class-validator` 0.14 rejects a DTO 0.9 accepted] → Fix the DTO or the call. Do not turn whitelist off.
- [Local `yarn start` hides stacks] → Only `NODE_ENV=development` keeps them. That is the contract.

## Migration Plan

No database migration. Set `JWT_SECRET` to at least 32 UTF-8 bytes before start, including Compose and CI. Existing HS256 tokens stay valid. Rollback is reverting the commit.
