# Spec Delta

## Purpose

Defines how an idea or comment update or delete decides that the caller is the author, using ids rather than a full-object comparison.

## ADDED Requirements

### Requirement: Non-owner writes are 401
A caller whose id is not the author's id SHALL receive HTTP 401 on an idea or comment update or delete, and the row SHALL stay unchanged.

#### Scenario: Non-owner updates an idea
- **WHEN** a user who is not the author patches an idea with `idea` and `description`
- **THEN** the status is 401
- **AND** the idea text and author id are unchanged

#### Scenario: Non-owner updates a comment
- **WHEN** a user who is not the author patches a comment with `comment`
- **THEN** the status is 401
- **AND** the comment text and author id are unchanged

#### Scenario: Non-owner deletes an idea
- **WHEN** a user who is not the author deletes an idea
- **THEN** the status is 401
- **AND** the idea still exists

### Requirement: Missing author is 401
An idea or comment update SHALL respond 401 when the loaded row has no author. It SHALL NOT throw an unhandled exception.

#### Scenario: Author relation missing
- **WHEN** an update is authorized for a row whose author is missing
- **THEN** the status is 401
- **AND** the process does not raise a TypeError

### Requirement: Missing row is 404
An idea or comment update SHALL respond 404 when that row does not exist.

#### Scenario: Unknown idea
- **WHEN** an authenticated client patches an idea id that has no row
- **THEN** the status is 404
