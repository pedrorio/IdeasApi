# Spec Delta

## Purpose

Defines the JWT secret the process requires before it listens and the algorithm used to sign and verify bearer tokens.

## ADDED Requirements

### Requirement: Boot checks JWT secret length
The process SHALL exit before it listens when `JWT_SECRET` is missing, empty, or shorter than 32 UTF-8 bytes. It SHALL listen when `JWT_SECRET` is at least 32 UTF-8 bytes.

#### Scenario: Secret missing
- **WHEN** the process starts with `JWT_SECRET` unset
- **THEN** it exits with a non-zero status
- **AND** it does not log that the server is running

#### Scenario: Secret too short
- **WHEN** the process starts with a `JWT_SECRET` of 31 UTF-8 bytes
- **THEN** it exits with a non-zero status
- **AND** it does not log that the server is running

#### Scenario: Secret long enough
- **WHEN** the process starts with a `JWT_SECRET` of 32 UTF-8 bytes and a reachable database
- **THEN** it logs that the server is running

### Requirement: Issued tokens are HS256
The server SHALL sign bearer tokens with HS256.

#### Scenario: Login token header
- **WHEN** a client logs in with a valid username and password
- **THEN** the issued token's algorithm is HS256

### Requirement: Other algorithms are rejected
A bearer token whose algorithm is not HS256, including `alg: none`, SHALL be rejected with HTTP 403 on REST and SHALL NOT authenticate. A token with a bad signature SHALL still be rejected with HTTP 403.

#### Scenario: alg none
- **WHEN** a client calls `GET /auth/me` with an `alg: none` bearer token
- **THEN** the status is 403
- **AND** the caller is not authenticated

#### Scenario: Bad signature
- **WHEN** a client calls `GET /auth/me` with a token signed by the wrong secret
- **THEN** the status is 403
- **AND** the caller is not authenticated
