# Tasks

## 1. Baseline

- [ ] 1.1 Create a throwaway Postgres and capture the schema synchronize creates from the current entities. Verify the capture includes `user`, `idea`, `comment`, and the upvote, downvote, and bookmark join tables.
- [ ] 1.2 Add a baseline migration that reproduces that schema, and point TypeORM's migrations path at it. Verify a second empty database migrated from files matches the captured schema.

## 2. Runtime flags

- [ ] 2.1 Set `synchronize` and `dropSchema` to `false` and run migrations on startup. Verify a boot against an empty database creates the tables and a second boot does not drop them.
- [ ] 2.2 Add an e2e test on throwaway Postgres that inserts a user or idea, restarts the app, and reads the same row. Verify the test fails if `dropSchema` is turned back on.

## 3. Guardrail

- [ ] 3.1 Note in the API readme or `openspec/project.md` that schema changes require a migration. Verify the note names the migrations directory used by the baseline.
