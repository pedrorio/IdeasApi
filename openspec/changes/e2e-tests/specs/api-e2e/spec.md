# Spec Delta

## Purpose

Runs end-to-end auth and voting tests against a Postgres instance that exists only for that test run.

## ADDED Requirements

### Requirement: Throwaway Postgres
The e2e suite SHALL run against a Postgres database created for the run, using Testcontainers or a CI database service, and SHALL discard that database afterwards. It SHALL NOT use the Compose data volume or a shared developer database.

#### Scenario: Isolated database
- **WHEN** the e2e suite starts
- **THEN** it connects to a database that was created for that run
- **AND** that database is gone or empty of the suite's data after the suite finishes

#### Scenario: Missing database runtime
- **WHEN** neither Docker nor a CI database service is available
- **THEN** the e2e command fails
- **AND** it does not report success by skipping the suite

### Requirement: Auth e2e
The suite SHALL register a user, log that user in, call `GET /auth/me` with the returned token, and reject a wrong password with status `400`.

#### Scenario: Register and login
- **WHEN** the suite registers a new user and logs in with that password
- **THEN** login returns a bearer token
- **AND** `GET /auth/me` with that token returns the same username

#### Scenario: Wrong password
- **WHEN** the suite logs in with the right username and the wrong password
- **THEN** the status is 400
- **AND** no token is returned

### Requirement: Voting e2e
The suite SHALL cover setting a vote, repeating that vote, switching from up to down, and two users voting on one idea, through `PUT /ideas/:id/vote`.

#### Scenario: Repeat and switch
- **WHEN** a user sets a vote of `1`, sends `1` again, then sends `-1`
- **THEN** the repeated `1` leaves `score` and `viewerVote` unchanged
- **AND** the following `-1` returns `viewerVote` `-1` and changes `score` by `-2`

#### Scenario: Two users
- **WHEN** two authenticated users each set a vote of `1` on the same idea
- **THEN** a following read reports `score` `2`

### Requirement: Sibling changes keep their own e2e tests
`add-migrations`, `votes-table`, and `auth-guard` SHALL each include the e2e tests for their own specs. This suite SHALL run those tests. It SHALL NOT be the only change allowed to add them.

#### Scenario: Migration restart test is present
- **WHEN** the e2e suite runs after `add-migrations`
- **THEN** it includes a test that reads back a row written before an application restart

#### Scenario: Auth guard tests are present
- **WHEN** the e2e suite runs after `auth-guard`
- **THEN** it includes a `401` case for a token whose user row is missing and a `401` case for an expired token

### Requirement: Unit CI stays database-free
The existing unit-test CI job SHALL keep running build, lint, and unit tests without starting Postgres. E2E SHALL be a separate job or script.

#### Scenario: Unit job
- **WHEN** the unit-test CI job runs
- **THEN** it does not start a database
- **AND** it still runs the unit tests
