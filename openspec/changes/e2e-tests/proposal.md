# Proposal

## Why

`api/test/app.e2e-spec.ts` boots `AppModule` and expects `GET /` to return `Hello World!`. No route does that. The unit specs only assert `toBeDefined`. Auth and voting need tests against a real Postgres that is created for the run and thrown away. The CI baseline in this repository does not start a database and does not run e2e.

`add-migrations`, `votes-table`, and `auth-guard` should each land with their own e2e tests. This change does not postpone those tests. It adds the shared throwaway-Postgres harness and the auth and voting coverage that is still missing after those changes.

## What Changes

- Add an e2e harness that starts a throwaway Postgres via Testcontainers or a database service created for the CI job. Tests must not use the Compose volume or a developer database.
- Cover registration, login, and rejection of a bad password.
- Cover set-vote, a repeated vote, a switch from up to down, and two users voting on one idea, against the API from `votes-table`.
- Replace the `Hello World` e2e case. Do not make CI call it.
- Wire the suite into CI only when Docker or the CI database service is available. The existing unit-test job stays database-free.
- Note, as a requirement on the other changes: `add-migrations` lands the restart test, `votes-table` lands the three vote tests, and `auth-guard` lands the `401` tests. If those already exist when this change is applied, keep them and fill only the gaps.

## Capabilities

### New Capabilities

- `api-e2e`: End-to-end tests for auth and voting on a disposable database.

### Modified Capabilities

## Impact

- `api/test/**`, `api/package.json` scripts, and `.github/workflows/ci.yml` (an extra job, not a change to the unit-test job's duties).
- Dev dependency on Testcontainers, unless the CI job uses a service container instead. One of those two must be real, not a mocked repository.
- No production request-path change.
