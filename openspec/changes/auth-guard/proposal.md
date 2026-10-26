# Proposal

## Why

`UserAuthenticationGuard` is supposed to reject a bearer token whose user no longer exists. It does not crash on that path today. `findRegistration` throws `HttpException` `403` `"Invalid Token"`. `jwt.verify` already catches an expired token (`expiresIn: "7d"`) and answers `403` with `Token error: <message>`. A missing `Authorization` header returns `false`, and Nest responds `403`. On the HTTP path the guard then logs `request.user`, which is a `UserAuthenticationRO` of `{ id, username, created, token }`. The password hash is not on that object. The `token` getter signs a fresh JWT, so the log contains a bearer token. The global HTTP exception filter assumes `switchToHttp().getResponse()` and can throw for a GraphQL host.

## What Changes

- **BREAKING** for clients that treated "unknown user" as `403`. When the token verifies and the user row is missing, respond `401` and do not throw an unhandled exception. Do this for HTTP and GraphQL.
- Stop logging the user object, the password hash, and any bearer token.
- Treat an expired token as `401` with a message that says the token is expired, instead of folding it into the generic `403` token error.
- Leave a missing `Authorization` header and a token with a bad signature on the current `403` behavior.
- Land e2e coverage for the `401` cases in this change. Do not wait for `e2e-tests`.

## Capabilities

### New Capabilities

- `request-authentication`: How the guard accepts or rejects a bearer token.

### Modified Capabilities

## Impact

- `api/src/user/authentication/user-authentication.guard.ts`
- `user-authentication-registration.service.ts` (`findRegistration`)
- `api/src/shared/http-error.filter.ts`, only so a GraphQL rejection does not crash the filter
- Logging calls in the guard. Other controllers that log a user id may stay.
