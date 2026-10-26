# Tasks

## 1. Schema

- [ ] 1.1 Add a `votes` migration with `user_id`, `idea_id`, `value`, a unique `(user_id, idea_id)` key, and an index on `idea_id`. Verify the migration applies on a throwaway database and a second insert of the same pair fails.
- [ ] 1.2 Remove the upvote and downvote many-to-many mappings from `IdeaEntity`. Verify idea reads no longer join those tables.

## 2. Set-vote API

- [ ] 2.1 Implement `PUT /ideas/:id/vote` and GraphQL `setVote` as an upsert that returns `{ score, viewerVote }`. Verify value `1`, `-1`, and `0` against a database, including `400` for any other value and `404` for a missing idea.
- [ ] 2.2 Delete the upvote and downvote HTTP routes and GraphQL mutations. Verify those operations are no longer in the schema or router.

## 3. Reads

- [ ] 3.1 Return numeric vote counts on idea reads and do not return voter ids. Verify a read payload has `score` and has no vote user array.
- [ ] 3.2 Replace offset `page` on `GET /ideas` and `GET /ideas/newest` with cursor pagination ordered by `created` descending then `id` descending. Verify two successive pages do not overlap and the last page has `nextCursor: null`.

## 4. Required tests

- [ ] 4.1 Add a Postgres test where two users vote on one idea at the same time. Verify both rows exist and `score` equals the sum of the values.
- [ ] 4.2 Add a test that sends the same vote twice. Verify the second response matches the first, one row remains, and `score` does not change.
- [ ] 4.3 Add a test that votes `1` and then `-1` for the same user and idea. Verify `viewerVote` is `-1`, the row was updated rather than deleted, and `score` moved by `-2`.
