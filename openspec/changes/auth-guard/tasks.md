# Tasks

## 1. Guard

- [x] 1.1 Return `401` when a verified token's username has no user row, on HTTP and GraphQL. Verify an e2e request gets status `401` and the process is still serving the next request.
- [x] 1.2 Return `401` with a message that identifies expiry when `jwt.verify` reports `TokenExpiredError`. Verify an expired token is `401` and a token with a bad signature is still `403`.
- [x] 1.3 Remove the log of `request.user`. Verify a unit test fails if the guard logs the password hash or the bearer token.

## 2. Filter

- [x] 2.1 Skip the HTTP response write in `HttpErrorExceptionFilter` when the host has no HTTP response. Verify a GraphQL request with a token for a missing user returns a GraphQL error and does not throw inside the filter.

## 3. Regression

- [x] 3.1 Verify login, a current token on `GET /auth/me`, and a request with no `Authorization` header keep their current status codes (`400` for bad credentials, success for a live token, `403` for a missing header).
