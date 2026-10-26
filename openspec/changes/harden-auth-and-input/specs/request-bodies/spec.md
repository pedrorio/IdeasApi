# Spec Delta

## Purpose

Defines which fields a client may send when registering or writing an idea, and rejects every other JSON property on validated bodies.

## ADDED Requirements

### Requirement: Unknown JSON properties are rejected
A JSON body for register, login, idea create, idea update, comment create, comment update, or set-vote SHALL be rejected with HTTP 400 when it contains a property that is not a field of that operation.

#### Scenario: Login with an extra property
- **WHEN** a client posts login JSON that includes `username`, `password`, and `id`
- **THEN** the status is 400
- **AND** no session token is issued

### Requirement: Empty body stays a 400
A JSON object with no keys SHALL still be rejected with HTTP 400.

#### Scenario: Empty registration body
- **WHEN** a client posts `{}` to register
- **THEN** the status is 400
- **AND** the message reports that no body was submitted

### Requirement: Registration rejects a client id
A registration body that includes `id` SHALL be rejected with HTTP 400. That request SHALL NOT create a user and SHALL NOT change an existing user's username or password hash.

#### Scenario: Register with a victim id
- **WHEN** a client posts a new username and password with an existing user's `id`
- **THEN** the status is 400
- **AND** the existing user's username and password hash are unchanged
- **AND** no user exists for the submitted username

### Requirement: Registration stores a hash and a server id
A successful registration SHALL store a password hash that is not the submitted password and an id that the client did not send.

#### Scenario: Normal registration
- **WHEN** a client posts only `username` and `password`
- **THEN** the status is a successful create
- **AND** the stored password is not the submitted password
- **AND** the stored id is not a value from the request body

### Requirement: Idea create rejects id and author
An idea create body that includes an existing idea `id` or an `author` SHALL be rejected with HTTP 400. That idea's text and author id SHALL stay unchanged.

#### Scenario: Create with an existing idea id
- **WHEN** an authenticated client posts idea JSON that includes another idea's `id`
- **THEN** the status is 400
- **AND** that idea's text and author id are unchanged

### Requirement: Idea create stores the caller as author
A successful idea create SHALL store the submitted idea text, the submitted description, and the authenticated user as the author.

#### Scenario: Create with idea and description
- **WHEN** an authenticated client posts only `idea` and `description`
- **THEN** the created idea's author id is that user's id
- **AND** the created idea's id was not in the request body

### Requirement: Idea update rejects author and id
An idea update body that includes `author` or `id` SHALL be rejected with HTTP 400, and the idea's author id SHALL stay unchanged.

#### Scenario: Owner sends a new author
- **WHEN** the owner patches an idea with `idea`, `description`, and `author`
- **THEN** the status is 400
- **AND** the idea's author id is unchanged

### Requirement: Owner update keeps the author
An owner update whose JSON fields are `idea` and `description` strings SHALL update those fields and SHALL keep the same author id.

#### Scenario: Owner updates the description
- **WHEN** the owner patches an idea with `idea` and `description` and no other fields
- **THEN** the status is a success
- **AND** the stored description is the submitted description
- **AND** the author id is unchanged
