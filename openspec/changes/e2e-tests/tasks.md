# Tasks

## 1. Harness

- [x] 1.1 Start a throwaway Postgres from the e2e setup and point `POSTGRES_*` and `JWT_SECRET` at it. Verify the suite fails fast when Docker or the CI database service is missing, and that it never uses the Compose volume.
- [x] 1.2 Remove the `GET /` `Hello World` expectation. Verify `yarn test:e2e` does not request `/`.

## 2. Auth and voting

- [x] 2.1 Add e2e coverage for register, login, `GET /auth/me`, and a wrong password. Verify a wrong password returns `400` and a good login returns a token that `GET /auth/me` accepts.
- [x] 2.2 Add e2e coverage for set-vote, a repeated vote, an up-to-down switch, and two users, if `votes-table` has not already added those tests. Verify a repeated `PUT /ideas/:id/vote` leaves `score` unchanged and a switch to `-1` does not clear the vote.
- [x] 2.3 Confirm the e2e tests from `add-migrations` and `auth-guard` run in this suite. Verify the CI e2e job runs those files and the unit-test job still does not start Postgres.

## 3. CI

- [x] 3.1 Add a CI job that runs `yarn test:e2e` with Testcontainers or a Postgres service. Verify the job is green on a pull request and the existing unit-test job stays green without a database.
