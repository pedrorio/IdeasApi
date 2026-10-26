# Spec Delta

## Purpose

Defines how a bearer token is accepted or rejected, including a missing user and an expired token, without writing secrets to the log.

## ADDED Requirements

### Requirement: Missing user is 401
When a bearer token verifies and no user row matches the token username, the guard SHALL respond with HTTP `401` on REST and SHALL reject the GraphQL operation. It SHALL NOT raise an unhandled exception.

#### Scenario: Deleted user on REST
- **WHEN** a client calls a guarded route with a token whose username has no user row
- **THEN** the status is 401
- **AND** a following request to the process still receives a normal response

#### Scenario: Deleted user on GraphQL
- **WHEN** a client sends a guarded GraphQL operation with a token whose username has no user row
- **THEN** the operation is rejected with an authentication error
- **AND** the process does not crash

### Requirement: Expired token is 401
An expired bearer token SHALL be rejected with HTTP `401` and a message that states the token is expired. A token with a bad signature SHALL still be rejected with `403`.

#### Scenario: Expired token
- **WHEN** a client calls a guarded route with a token that is past its expiry
- **THEN** the status is 401
- **AND** the response message identifies the token as expired

#### Scenario: Bad signature
- **WHEN** a client calls a guarded route with a token signed by the wrong secret
- **THEN** the status is 403
- **AND** the caller is not treated as authenticated

### Requirement: Guard logs no secret
The guard SHALL NOT write the user entity, the password hash, or a bearer token to the log.

#### Scenario: Successful authentication log
- **WHEN** a client with a valid token calls a guarded route
- **THEN** log records for that request do not contain the password hash
- **AND** log records for that request do not contain the bearer token

### Requirement: Existing auth results that stay
A missing `Authorization` header SHALL still be rejected with `403`. Login with a wrong password SHALL still fail with `400`. A valid unexpired token for an existing user SHALL still authenticate.

#### Scenario: Missing header
- **WHEN** a client calls a guarded route with no Authorization header
- **THEN** the status is 403

#### Scenario: Valid token
- **WHEN** a client calls `GET /auth/me` with a valid unexpired token for an existing user
- **THEN** the status is 200
- **AND** the body identifies that user
