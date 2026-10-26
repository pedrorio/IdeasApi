# Proposal

## Why

`api/ormconfig.js` sets `synchronize: true` and `dropSchema: true`. Every process recreates the schema from entities and deletes existing rows. There is no `src/migration` directory. Schema changes have to become commits, and a restart has to keep data. This follows `upgrade-stack`, so the migration is generated with TypeORM 0.3.

## What Changes

- Generate one baseline migration that creates the schema the entities already describe: `user`, `idea`, `comment`, and the join tables TypeORM currently creates for upvotes, downvotes, and bookmarks.
- Set `synchronize` to `false` and `dropSchema` to `false`. Leaving `dropSchema` on would still wipe the database after `synchronize` is off.
- Run migrations on startup. New schema changes after this change go through a new migration file, not entity synchronize.
- Add an e2e test that proves a row survives a process restart. `e2e-tests` describes the shared harness. This change lands its own test even if that harness PR is not merged yet.

## Capabilities

### New Capabilities

- `schema-migrations`: How the Postgres schema is created and changed.

### Modified Capabilities

## Impact

- `api/ormconfig.js` and the TypeORM startup options in `AppModule`.
- A new baseline migration under the TypeORM 0.3 migrations directory.
- No change to route contracts. Restart behavior changes: data is kept.
- Depends on `upgrade-stack` for the TypeORM 0.3 migration API. Do not change vote storage here (`votes-table` adds its own migration).
