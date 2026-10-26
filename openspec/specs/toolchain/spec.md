# toolchain Specification

## Purpose
Defines the framework, compiler, linter, and container image tags used to build and run the API.

## Requirements

### Requirement: NestJS 12 and TypeORM 0.3
The API SHALL compile and the existing unit tests SHALL pass on NestJS 12 and TypeORM 0.3. HTTP and GraphQL behavior SHALL stay the same for the same input.

#### Scenario: Build and tests pass
- **WHEN** dependencies are installed and the build and unit-test scripts run
- **THEN** both scripts exit successfully
- **AND** the installed `@nestjs/core` major is 12 and the installed `typeorm` minor line is 0.3

#### Scenario: Same response as before the upgrade
- **WHEN** a client calls an existing route with the same authentication and body as before this change
- **THEN** the status code and response body match the pre-upgrade result

### Requirement: TypeScript 5
The project SHALL typecheck with TypeScript 5.9 and SHALL NOT take a TypeScript 6 or newer compiler in this change.

#### Scenario: Compiler line
- **WHEN** the installed `typescript` package version is read
- **THEN** the version is 5.9.x

### Requirement: ESLint replaces TSLint
The lint script SHALL run ESLint, and the TSLint package SHALL be absent from the project's dependencies.

#### Scenario: Lint command
- **WHEN** the lint script runs on the upgraded source
- **THEN** it executes ESLint and exits successfully
- **AND** `tslint` is not listed as a dependency

### Requirement: Version-pinned container images
The Postgres image tag in Compose SHALL name an explicit version and SHALL NOT be `latest`. The API and nginx Docker base images SHALL name an explicit version. Compose SHALL NOT define a Redis service, because the application does not connect to Redis.

#### Scenario: Compose images
- **WHEN** the Compose config is rendered
- **THEN** the Postgres service image contains a version other than `latest`
- **AND** no Redis service is defined

#### Scenario: Dockerfiles
- **WHEN** `api/Dockerfile` and `nginx/Dockerfile` are read
- **THEN** each `FROM` instruction includes a version tag
