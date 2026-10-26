# Spec Delta

## Purpose

Defines which GraphQL error fields clients receive outside development so stack frames are not part of the response.

## ADDED Requirements

### Requirement: Stacks are omitted outside development
When `NODE_ENV` is unset or is not `development`, a GraphQL error body SHALL NOT contain a `stacktrace` property or an `exception` property.

#### Scenario: Unset NODE_ENV
- **WHEN** a client sends a GraphQL operation that fails and `NODE_ENV` is unset
- **THEN** the HTTP status is 200
- **AND** the error JSON does not contain `stacktrace`
- **AND** the error JSON does not contain `exception`

### Requirement: Development keeps stack frames
When `NODE_ENV` is `development`, a GraphQL error SHALL include the stack frames under `exception.stacktrace`.

#### Scenario: Development error
- **WHEN** a client sends a GraphQL operation that fails and `NODE_ENV` is `development`
- **THEN** the error JSON contains `exception.stacktrace`
