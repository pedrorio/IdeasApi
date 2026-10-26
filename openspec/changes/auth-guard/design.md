# Design

## Context

See `proposal.md` for the current status codes. `UserAuthenticationRO.fromUser` copies `id`, `created`, `username`, and the `token` getter. `UserEntity.password` stays on the entity. The guard assigns the response object to `request.user` and logs that object only in the HTTP branch. The GraphQL branch sets `ctx.user` and does not log it.

## Goals / Non-Goals

**Goals:**

- A deleted user cannot authenticate, and the process stays up.
- Logs from the guard contain no password and no JWT.
- Expired tokens are distinguishable from a bad signature.

**Non-Goals:**

- Refresh tokens, sessions in Redis, or changing the `7d` lifetime.
- Changing login's `400` for a bad password.
- Returning `401` for a missing header. That stays `403`.

## Decisions

- After `jwt.verify` succeeds, load the user by the token username. If no row exists, throw Nest's `UnauthorizedException` (`401`) with a stable message such as `Unknown user`. Do not call `fromUser` and do not log the lookup result.
- Branch on `error.name === "TokenExpiredError"` before the generic token catch. Throw `UnauthorizedException` with a message that contains the word `expired`. Leave other `jwt.verify` failures as `403` `Invalid Token` or the existing `Token error` text, as long as the body does not include the raw token.
- Delete `Logger.log(request.user, ...)`. If a log line remains, it may include the username and must not include `password` or `token`.
- Make `HttpErrorExceptionFilter` return without touching `response.status` when the host has no HTTP response (GraphQL). GraphQL already surfaces the `HttpException` through its own error path when the filter does not crash.
- Tests: e2e on throwaway Postgres for "valid signature, user row deleted" and for an expired token. A unit test spies on `Logger` and asserts the password hash and the bearer string are absent.

## Risks / Trade-offs

- [Clients match the `403` body `Invalid Token` for a deleted user] → The status change is breaking and listed in the proposal. The message `Unknown user` is the new contract.
- [Filter change hides real HTTP errors] → Only skip the HTTP response write when `getResponse()` is missing. HTTP exceptions still return the JSON body they return today.
