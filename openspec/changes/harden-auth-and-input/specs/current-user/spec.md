# Spec Delta

## Purpose

Defines authentication for the GraphQL findMe query so it uses the same session guard as the current-user REST route.

## ADDED Requirements

### Requirement: findMe rejects a missing session
GraphQL `findMe` with no Authorization header SHALL NOT return a user. It SHALL be rejected the same way as a guarded GraphQL mutation with no Authorization header.

#### Scenario: findMe without a header
- **WHEN** a client sends `findMe` with no Authorization header
- **THEN** the HTTP status is 200
- **AND** the response does not contain a user
- **AND** the error matches an unauthenticated `createIdea` mutation

### Requirement: findMe returns the current user
GraphQL `findMe` with a valid token SHALL return the same username as `GET /auth/me` for that token.

#### Scenario: findMe with a valid token
- **WHEN** a client sends `findMe` with a valid bearer token
- **THEN** the returned username is the username `GET /auth/me` returns for that token
