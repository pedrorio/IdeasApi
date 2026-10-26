# Design

## Context

See `proposal.md`. `AppModule` connects through `ormconfig.js`, which reads `POSTGRES_*`. An e2e run has to point those variables at the throwaway instance before the Nest app boots. `dropSchema: true` makes today's boot wipe whatever database it reaches, so this harness must be applied together with, or after, `add-migrations`. Running it earlier would still pass a "row survives" test only by accident if the test never restarts.

## Goals / Non-Goals

**Goals:**

- One command runs auth and voting e2e against a database that did not exist before the command.
- CI can run that command without credentials to a shared database.
- Tests added by `add-migrations`, `votes-table`, and `auth-guard` plug into the same setup.

**Non-Goals:**

- Browser or nginx coverage.
- Replacing the unit specs.
- Load tests.

## Decisions

- Prefer Testcontainers so a laptop and CI start Postgres the same way. A GitHub Actions service container is acceptable if Testcontainers is too slow or blocked in CI. The spec allows either. Do not mock TypeORM.
- Start the container (or service) in Jest's global setup, set `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `JWT_SECRET`, then boot the Nest app. Stop and remove the container in global teardown.
- Put cases in `api/test/` and keep `yarn test` pointed at `src/**/*.spec.ts` so the unit job stays hermetic. `yarn test:e2e` runs the new suite.
- Delete or rewrite `app.e2e-spec.ts` so it no longer requests `GET /`.
- The voting cases call `PUT /ideas/:id/vote`. They belong to the `votes-table` behavior. If this change is applied first, land the harness and skip the voting cases with a failing `it.todo` only when the route does not exist yet. Do not invent a second vote API. The intended order is `votes-table` before this change, so the cases should be real tests.
- Auth cases register a user, log in, call `GET /auth/me`, and assert a wrong password is `400`. The `401` missing-user and expiry cases are owned by `auth-guard`'s tasks. This suite should call them if they are not already present, and should not duplicate them if they are.

## Risks / Trade-offs

- [Docker is unavailable in CI] → Use a Postgres service container on the workflow job instead of Testcontainers. Do not skip the suite silently.
- [Tests share rows and flake] → Give each test its own user and idea, or wrap each test in a transaction that rolls back. Do not depend on `dropSchema`.
- [Harness lands before migrations] → The workflow job for e2e is added in this change, after `add-migrations` is expected to have turned `dropSchema` off. Document that dependency in the implementation PR.
