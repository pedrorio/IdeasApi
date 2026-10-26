# Design

## Context

See `proposal.md`. Today's `voteIdea` treats "counts differ" as "remove the user from both arrays". Equal counts (including both zero) push the user onto the requested array. Swagger text that says an upvote deletes an existing downvote describes that cancel, and it also cancels a repeated upvote. `IdeaRO` already maps the arrays to lengths. The bug is storage and the toggle, not the read DTO's types.

## Goals / Non-Goals

**Goals:**

- One row per user and idea.
- A set operation that is safe to retry.
- A score that matches the rows, including under concurrent voters.
- Cursor pages that do not skip or repeat rows when the data is stable.

**Non-Goals:**

- Changing bookmarks or comments.
- Changing the auth guard's status codes (`auth-guard`).
- Keeping the upvote and downvote routes as deprecated aliases.

## Decisions

- Table `votes`: `user_id` uuid not null, `idea_id` uuid not null, `value` smallint not null. Primary key or unique key on `(user_id, idea_id)`. Index `idea_id` for the aggregate and for deletes when an idea is removed. `value` stored in the table is only `1` or `-1`. A request value of `0` deletes the row.
- Upsert in one transaction. If the stored value already equals the request, write nothing. If the request is `0` and no row exists, write nothing. Return `score` (sum of `value` for the idea) and `viewerVote` (`0` when the caller has no row).
- Prefer `SUM(value)` (an indexed aggregate) inside the same transaction as the upsert, so there is no counter to drift. A denormalized counter updated by `new - old` in that same transaction also meets the spec. Do not do the read-modify-write of the whole idea.
- Do not load `author`, vote relations, or `comments` in order to cast a vote.
- Cursor pagination for `GET /ideas` and `GET /ideas/newest`: opaque cursor over `(created DESC, id DESC)`, default limit 25, maximum 100. Response body `{ items, nextCursor }` with `nextCursor: null` on the last page. Each item includes numeric `score` and does not include voter ids. `GET /ideas/:id` returns one idea with `score` and no voter list.
- GraphQL `setVote(ideaId: ID!, value: Int!): VoteResult` with `VoteResult { score, viewerVote }`. List query takes `cursor` and `limit` and returns the same page shape.
- Reject a missing or non-integer `value`, and any integer other than `-1`, `0`, or `1`, with `400` and no write. Unknown idea id is `404`. Missing or invalid auth is rejected and writes nothing. The exact unauthenticated status stays whatever the guard does until `auth-guard`.
- Delete `votes` rows when an idea is deleted. User deletion is not specified today; the foreign key should restrict or cascade, and the migration must pick one and test idea deletion.

## Risks / Trade-offs

- [Aggregate score is slower than a counter] → The index on `idea_id` is required. Switch to a transactional counter only if a measured list query is too slow. Both remain spec-legal.
- [Cursor order changes the unordered `GET /ideas` list] → That change is intentional and called out as breaking. Offset `page` is removed so two styles cannot disagree.
- [Clients retry a toggle] → Retries of `PUT` with the same value no longer flip the vote off. That is the point of the change.
