# Design

## Context

See `proposal.md`. `dropSchema: true` is set next to `synchronize: true` in `api/ormconfig.js`. Entities are `UserEntity`, `IdeaEntity`, and `CommentEntity`. Join tables are unnamed `@JoinTable()` relations, so their names are whatever TypeORM 0.2 synchronize creates today. Capture that shape. Do not invent a new naming scheme in the baseline.

## Goals / Non-Goals

**Goals:**

- One migration that reproduces the current schema on an empty database.
- Startup that migrates and does not drop or auto-alter tables.
- A test that inserts a row, restarts the app, and reads the row back.

**Non-Goals:**

- Editing columns for the votes table (`votes-table`).
- Changing HTTP or GraphQL contracts.
- Seeding data.

## Decisions

- Generate the baseline by letting the current synchronize path create a throwaway database, then diff that schema into a TypeORM 0.3 migration. If `upgrade-stack` has already landed, generate against TypeORM 0.3's synchronize once, and diff that. The migration is the source of truth afterwards.
- Set both `synchronize` and `dropSchema` to `false` in `ormconfig.js`. Point `migrations` at the directory that contains the baseline file, and fix `cli.migrationsDir` so it is that directory rather than `./src`.
- Run migrations from the Nest TypeORM bootstrap (`migrationsRun: true` or an explicit `runMigrations()` before `listen`). Do not shell out by hand in production startup.
- The e2e test uses a throwaway Postgres (Testcontainers, or a CI service database created for the job). It does not use the Compose volume.

## Risks / Trade-offs

- [Baseline misses a join table or index] → Diff the migrated empty database against a synchronize-created database and require no table or column difference before merging.
- [Existing developers have local volumes created by synchronize] → Document that local databases should be recreated once. Production data does not exist yet because `dropSchema` has been wiping it.
- [A later entity edit silently drifts] → CI for this change does not need a drift checker, but review policy is: a schema change without a new migration file is incomplete.
