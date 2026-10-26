# Spec Delta

## Purpose

Records one vote per user and idea and lets a client set that vote idempotently, then read scores with cursor pages.

## ADDED Requirements

### Requirement: One vote row per user and idea
The system SHALL store votes in a `votes` table with `user_id`, `idea_id`, and `value`, and SHALL enforce a unique `(user_id, idea_id)` key. A stored value SHALL be `1` or `-1`.

#### Scenario: Second row for the same pair is rejected
- **WHEN** a vote row already exists for a user and an idea
- **THEN** another row for that same pair cannot be inserted

### Requirement: Set vote
An authenticated client SHALL set their vote with `PUT /ideas/:id/vote` and body `{ "value": 1 | -1 | 0 }`, and with GraphQL `setVote(ideaId, value)`. The operation SHALL upsert. The response SHALL be `{ score, viewerVote }`, where `score` is the sum of stored values for that idea and `viewerVote` is the caller's value or `0` when the caller has no row.

#### Scenario: Upvote sets the value
- **WHEN** an authenticated user sends `PUT /ideas/:id/vote` with `{ "value": 1 }` for an idea they have not voted on
- **THEN** the response is `{ "score": 1, "viewerVote": 1 }`
- **AND** one vote row exists for that user and idea

#### Scenario: Clear vote
- **WHEN** an authenticated user who has a vote sends `{ "value": 0 }`
- **THEN** that user's row is removed
- **AND** `viewerVote` is `0` and `score` no longer includes the removed value

#### Scenario: Invalid value
- **WHEN** the body value is missing or is not the integer `-1`, `0`, or `1`
- **THEN** the response status is 400
- **AND** no vote row is written or deleted

#### Scenario: Missing idea
- **WHEN** the idea id does not exist
- **THEN** the response status is 404
- **AND** no vote row is written

#### Scenario: GraphQL setVote
- **WHEN** an authenticated caller runs `setVote` with `value` `-1` on an idea they have not voted on
- **THEN** the payload is `{ score: -1, viewerVote: -1 }`

### Requirement: Repeating a vote is a no-op
Sending the same set-vote request twice SHALL NOT change the stored vote or the score. The second response SHALL match the first.

#### Scenario: Same upvote twice
- **WHEN** a user successfully sends `{ "value": 1 }` and then sends `{ "value": 1 }` again
- **THEN** the second response equals the first
- **AND** exactly one row exists and `score` is unchanged

#### Scenario: Clear when already clear
- **WHEN** a user with no vote sends `{ "value": 0 }`
- **THEN** `viewerVote` is `0` and `score` is unchanged

### Requirement: Switching replaces the vote
Sending the opposite value SHALL update the existing row. It SHALL NOT remove the vote.

#### Scenario: Up then down
- **WHEN** a user has voted `1` and then sends `{ "value": -1 }`
- **THEN** `viewerVote` is `-1`
- **AND** one row remains and `score` changes by `-2`

### Requirement: Concurrent votes from different users
Two different users voting on the same idea SHALL both be stored. `score` SHALL equal the sum of stored values.

#### Scenario: Two users vote at once
- **WHEN** two users submit different votes for one idea concurrently
- **THEN** both votes are stored
- **AND** a following read reports `score` equal to the sum of those values

### Requirement: Idea reads return counts and cursor pages
Idea reads SHALL include a numeric `score` and SHALL NOT include voter ids or voter objects. `GET /ideas` and `GET /ideas/newest` SHALL page with a cursor ordered by `created` descending and then `id` descending. The default page size SHALL be 25. A limit below 1 or above 100 SHALL be rejected with status 400.

#### Scenario: Detail hides voters
- **WHEN** a client reads one idea that has votes
- **THEN** the payload includes numeric `score`
- **AND** the payload does not include a list of voters

#### Scenario: Cursor pages do not overlap
- **WHEN** a client requests a page and then requests the next page with the returned cursor, and no idea is inserted or deleted in between
- **THEN** no idea id appears on both pages
- **AND** the last page has `nextCursor` null

#### Scenario: Limit out of range
- **WHEN** a client requests a limit of 0 or 101
- **THEN** the response status is 400
