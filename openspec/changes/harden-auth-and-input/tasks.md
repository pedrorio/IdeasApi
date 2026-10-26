# Tasks

## 1. Tokens and the two dependency upgrades

- [x] 1.1 Set `jsonwebtoken` to 9.0.3 and `class-validator` to 0.14.4 in `api/package.json` and refresh `api/yarn.lock`. Leave every other direct dependency unchanged unless `class-transformer` or `@types/jsonwebtoken` must move for that install or for `tsc`. Verify `yarn install --frozen-lockfile` and `yarn build` succeed.
- [x] 1.2 Exit before `NestFactory.create` when `JWT_SECRET` is missing, empty, or shorter than 32 UTF-8 bytes. Add `api/test/harden-auth.e2e.js` and register it in `api/test/run-e2e.js`. Verify a child process with an unset secret and with a 31-byte secret exits non-zero and the log does not contain `Server running`, and a 32-byte secret logs `Server running`.
- [x] 1.3 Sign with `algorithm: "HS256"` and verify with `algorithms: ["HS256"]`. Verify a login token's header algorithm is HS256, an `alg: none` token on `GET /auth/me` is 403, and a wrong-secret token is still 403.
- [x] 1.4 Lengthen `JWT_SECRET` in `.github/workflows/ci.yml`, `schema-migration.e2e.js`, `idea-votes.e2e.js`, `auth-guard.e2e.js`, and `user-authentication.guard.spec.ts` to at least 32 UTF-8 bytes. Add one sentence to the root README that the process exits when `JWT_SECRET` is missing or shorter than 32 bytes. Verify `yarn test` passes.

## 2. Request bodies

- [x] 2.1 Pass `whitelist` and `forbidNonWhitelisted` to `validate` in `ValidatorPipe`, return the class instance, and keep the empty-body message. Verify a login body that includes `id` is 400 and `{}` on register is 400.
- [x] 2.2 Persist only `username` and `password` on register, and only `idea`, `description`, and the authenticated author on idea create and idea update. Verify the register-with-victim-id, idea-create-with-existing-id, and owner-patch-with-author cases leave those rows unchanged, and a normal register stores a hash and a server-generated id.

## 3. GraphQL errors and findMe

- [x] 3.1 Delete `stacktrace` and `exception` from GraphQL errors unless `NODE_ENV` is `development`. Verify the e2e file: with `NODE_ENV` unset the error JSON has neither key, and with `NODE_ENV=development` it still has `exception.stacktrace`.
- [x] 3.2 Register `findMe` with `@Query()` from `@nestjs/graphql` and `UserAuthenticationGuard`. Verify no Authorization matches an unauthenticated `createIdea` (HTTP 200, Forbidden, no user) and a valid token returns the same username as `GET /auth/me`.

## 4. Ownership

- [x] 4.1 Compare `user.id` with `author.id` in `IdeaPolicy` and `CommentPolicy`. A missing author is 401 and a missing row stays 404. Verify a non-owner idea update, comment update, and idea delete are 401 and the rows remain, and a missing author does not throw `TypeError`.

## 5. Suite

- [x] 5.1 Verify `yarn test:e2e` runs `harden-auth.e2e.js` plus the migration, vote, and auth files, and `yarn test` does not start Postgres.
