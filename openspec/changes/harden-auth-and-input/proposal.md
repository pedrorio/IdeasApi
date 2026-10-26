# Proposal

## Why

A client can pass `id` or `author` through registration and idea writes and change another user's account or idea. `JWT_SECRET` is not checked at boot, and `jsonwebtoken` 8 accepts an `alg: none` token when that secret is missing or empty. GraphQL errors include stack frames, and the schema field `findMe` is not a registered query. Ownership checks compare `JSON.stringify` of the user and the author. Size: M.

## What Changes

- **BREAKING.** Reject JSON body properties that are not fields of that operation with HTTP 400. Registration, idea create, and idea update persist an explicit field set. A client cannot set `id` or `author`.
- **BREAKING.** Exit before listening when `JWT_SECRET` is missing, empty, or shorter than 32 UTF-8 bytes. Sign and verify bearer tokens with HS256 only. Upgrade `jsonwebtoken` to 9.0.3 and `class-validator` to 0.14.4. No other dependency upgrades.
- **BREAKING.** Omit `stacktrace` and `exception` from GraphQL errors unless `NODE_ENV` is `development`.
- Register GraphQL `findMe` and require `UserAuthenticationGuard`. A missing header stays the same rejection as other guarded GraphQL mutations, not a new 401.
- Compare `user.id` with `author.id` for idea and comment updates and deletes. This change is an explicit exception to the upgrade-stack-only dependency rule, limited to the two packages above.
- Land e2e coverage for the mass-assignment cases, the boot check, and `findMe` in this change. Stack the implementation on #49. Do not implement it in this proposal.

## Capabilities

### New Capabilities

- `request-bodies`: Which fields registration and idea writes accept.
- `token-signing`: The JWT secret required at boot and the HS256 algorithm.
- `graphql-errors`: Which GraphQL error fields are returned outside development.
- `current-user`: Authentication for GraphQL `findMe`.
- `resource-ownership`: How idea and comment writes decide the caller is the author.

### Modified Capabilities

## Impact

- `api/src/shared/validator.pipe.ts` returns the validated instance and rejects unknown properties.
- `user-authentication-registration.service.ts` persists `username` and `password` only.
- `api/src/idea/idea.service.ts` persists `idea`, `description`, and the authenticated author only.
- `api/src/main.ts` checks `JWT_SECRET` before `NestFactory.create`.
- `api/src/user/user.entity.ts` and `user-authentication.guard.ts` pin HS256.
- `api/src/app.module.ts` strips GraphQL stack frames outside development.
- `user-authentication-session.resolver.ts` registers `findMe` with the guard.
- `api/src/idea/idea.policy.ts` and `api/src/comment/comment.policy.ts` compare ids.
- `api/package.json` and `api/yarn.lock` for `jsonwebtoken` 9.0.3 and `class-validator` 0.14.4.
- Test secrets in the e2e files, the guard spec, and `.github/workflows/ci.yml` must be at least 32 bytes or boot fails.
- CORS, Swagger, `csrfPrevention`, rate limits, enumeration, logging, Compose, other dependency bumps, and CI pinning are a later change.
