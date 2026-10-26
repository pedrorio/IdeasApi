# Spec Delta

## Purpose

Makes Postgres schema changes happen only through TypeORM migrations, starting from the schema the entities already describe.

## ADDED Requirements

### Requirement: Baseline migration matches the current schema
The repository SHALL contain a baseline migration that creates every table and column the current entities produce, including upvote, downvote, and bookmark join tables.

#### Scenario: Empty database matches synchronize
- **WHEN** the baseline migration runs on an empty database
- **THEN** the resulting tables and columns match a database created by the pre-change synchronize path

### Requirement: Startup does not sync or drop the schema
Application startup SHALL apply pending migrations and SHALL NOT set schema synchronize or schema drop.

#### Scenario: Restart keeps rows
- **WHEN** a row is inserted and the application process starts again against the same database
- **THEN** that row is still present
- **AND** no migration is generated automatically from entity edits at startup

### Requirement: Later schema changes are migrations
The running application SHALL NOT alter the database to match entity metadata. A persisted column, table, or key SHALL change only when a migration file runs.

#### Scenario: Entity drift is not applied
- **WHEN** an entity property is added in code and the application starts without a new migration
- **THEN** the database does not gain a column for that property

### Requirement: Migration e2e
This change SHALL add an automated test, against a throwaway Postgres, that writes a row and reads it back after a restart.

#### Scenario: Restart test
- **WHEN** the migration e2e test runs
- **THEN** it uses a database created for that run
- **AND** the row written before restart is returned after restart
