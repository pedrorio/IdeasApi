# Proposal

## Why

`IdeaVoteService.voteIdea` loads the idea with every relation (`author`, `upvotes`, `downvotes`, `comments`), edits the `upvotes` or `downvotes` arrays in memory, and saves the whole idea. Concurrent votes lose updates. The branch used when the user already has either vote removes the user from **both** arrays, so repeating a vote cancels it and switching from up to down cancels both instead of leaving a downvote. The HTTP and GraphQL idea reads already return numeric counts via `IdeaRO`, not voter lists. List reads use an offset `page` of 25 and `GET /ideas` has no order. This follows `add-migrations`, so the new table arrives as a migration.

## What Changes

- **BREAKING.** Replace the two many-to-many vote relations with `votes(user_id, idea_id, value)` and a unique `(user_id, idea_id)` key.
- **BREAKING.** Replace `POST /ideas/:id/upvote` and `POST /ideas/:id/downvote` with `PUT /ideas/:id/vote` and body `{ value: 1 | -1 | 0 }`. The handler sets the value. It does not toggle.
- **BREAKING.** Replace GraphQL `upvoteIdea` and `downvoteIdea` with `setVote(ideaId, value)`.
- The write upserts. Sending the same request twice is a no-op. The response is `{ score, viewerVote }`.
- Score is the sum of stored values for that idea, updated in the same transaction by the difference between the old and new value, or computed with an indexed aggregate. Either is acceptable.
- Idea reads return numeric vote counts and no voter list, and list reads use cursor pagination.
- Required automated tests, on a real Postgres: concurrent votes from different users, repeating the same vote, and switching from up to down.
- This change lands those tests itself. `e2e-tests` is the shared harness, not a place to defer them.

## Capabilities

### New Capabilities

- `idea-votes`: Setting, reading, and paging idea votes.

### Modified Capabilities

## Impact

- `api/src/idea/vote/**`, `IdeaEntity`, `IdeaRO`, idea GraphQL, `GET /ideas`, and `GET /ideas/newest`.
- A migration that creates `votes` and drops the upvote and downvote join tables.
- Clients of the upvote and downvote routes and of `?page=` must change.
- Bookmarks, comments, and auth status codes are out of scope.
