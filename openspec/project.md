# Ideas API

This file is the current-state description of the repository. OpenSpec's current CLI (1.15.0, schema `spec-driven`) injects `openspec/config.yaml` into planning runs and does not generate `project.md`. This file is kept so the narrative has a stable place to live.

The application code is in `api/`. Nothing in this baseline change is allowed to change request handling except the minimum needed to make the existing build, lint, and unit tests pass.

## Stack

| Piece | What the repo uses |
| --- | --- |
| Framework | NestJS 12.2.0. `@nestjs/graphql` and `@nestjs/apollo` are 14.0.3 (the release that peers with Nest 12). `@nestjs/swagger` 12.0.4, `@apollo/server` 5.5.1, `graphql` 16.14.2 |
| Language | TypeScript 5.9.3. `skipLibCheck` stays on. |
| ORM | TypeORM 0.3.31 via `@nestjs/typeorm` 12.0.2, driver `pg` 8.23.1 |
| Lint | ESLint 9 flat config (`api/eslint.config.mjs`) and typescript-eslint 8. TSLint is gone. Prettier 1 remains. |
| Tests | Jest 29 and ts-jest 29. Four unit specs, each asserting `toBeDefined`. Jest rewrites `@nestjs` and `@apollo` ESM in `api/test/jest-esm-transformer.js`. One starter e2e spec. |
| API style | REST (Express 5) and schema-first GraphQL (`typePaths: ["./**/*.graphql"]`, Apollo driver). Swagger UI at `/docs` (bare `/docs` redirects to `/docs/`). OpenAPI 3 document at `/docs-json`, server URL `/api`. |
| Auth | Hand-rolled JWT (`jsonwebtoken`), password hash `bcryptjs`, expiry `7d` |
| Containers | `docker-compose.yml`: nginx, api, `postgres:18`. No Redis service. |

`api/Dockerfile` is `FROM node:22-alpine`. `nginx/Dockerfile` is `FROM nginx` (unpinned). The API image waits on `postgres:5432`, then runs `yarn start:dev`.

## Modules

`AppModule` imports TypeORM, GraphQL, `IdeaModule`, `UserModule`, and `CommentModule`.

- **Users** (`api/src/user`): `UserEntity` (`user` table) with username, password hash, ideas, bookmarks, comments. `GET /users` and `GET /users/:username` page with `take: 25` and `skip`.
- **Auth** (`api/src/user/authentication`): `POST /auth/register`, `POST /auth/login`, `GET /auth/me`. GraphQL `registerUser`, `loginUser`, `findMe`. `UserAuthenticationGuard` checks `Authorization: Bearer`. A missing header or a bad signature is 403. An expired token or a token whose user row is gone is 401. The guard does not log the user or the bearer token.
- **Ideas** (`api/src/idea`): create, read, update, delete. Reads load `author` and `comments` and a numeric `score`. `GET /ideas` and `GET /ideas/newest` return `{ items, nextCursor }`, ordered by `created` descending then `id` descending. The default limit is 25 and the maximum is 100.
- **Votes** (`api/src/idea/vote`): `PUT /ideas/:id/vote` with `{ value: 1 | -1 | 0 }` and GraphQL `setVote`. Storage is the `votes` table, one row per user and idea. The write response is `{ score, viewerVote }`. Idea reads do not include `viewerVote`.
- **Bookmarks** (`api/src/idea/bookmark`): `POST /ideas/:id/bookmark` and `DELETE /ideas/:id/bookmark`. Storage is a `ManyToMany` on `UserEntity`.
- **Comments** (`api/src/comment`): this module exists in addition to the five areas above. `GET /comments`, `GET /comments/:id`, idea-scoped comment CRUD under `/ideas/:ideaId/comments`, and `GET /users/:userId/comments`.
- **Newest**: `GET /ideas/newest` and GraphQL `newestIdeas` use the same cursor page as `GET /ideas`. The route is declared before `GET /ideas/:id`.

There is no global route prefix in Nest. nginx listens on port 4000 and rewrites `/api/*` to the API container, which listens on `SERVER_PORT` or **5000**.

## How to run

From `api/`, with Yarn 1 (the lockfile is v1):

```bash
yarn install --frozen-lockfile
yarn build
yarn lint
yarn test
yarn start          # ts-node src/main.ts
```

Docker Compose from the repo root expects environment variables listed in `docker-compose.yml` (`POSTGRES_*`, `JWT_SECRET`, `SESSION_SECRET`, hosts and ports). `ormconfig.js` reads the Postgres variables. `JWT_SECRET` has no default in `api/src/app.constants.ts`.

`yarn test:e2e` creates throwaway databases on the Postgres given by `POSTGRES_*` and runs `test/schema-migration.e2e.js`, `test/idea-votes.e2e.js`, and `test/auth-guard.e2e.js`. It fails if that Postgres is unreachable. It does not request `GET /`. `yarn test:migration` registers a user, restarts the app, and reads that user back. `yarn test:votes` runs the votes migration up and down, then checks set-vote, cursor pages, and `GET /ideas/newest`. `yarn test:auth` checks login, a live token, a missing header, a bad signature, an expired token, and a deleted user on REST and GraphQL. `yarn migration:run` applies `api/src/migration` without listening for HTTP.

## Data model

TypeORM entity metadata describes the schema. `api/ormconfig.js` sets `synchronize: false`, `dropSchema: false`, and `migrationsRun: true`. Pending files in `api/src/migration` run on startup. `yarn migration:run` applies that directory without listening for HTTP. The baseline file is `api/src/migration/1761508800000-Baseline.ts`. A column, table, or key changes only when a new file in that directory runs. The `cli` key is TypeORM 0.2-only. `AppModule` strips it before `TypeOrmModule.forRoot`. `cli.migrationsDir` is `./src/migration`.

The baseline matches TypeORM 0.3 synchronize for users, ideas, comments, and bookmarks: `uuid_generate_v4()` ids, `timestamp without time zone` timestamps defaulting to `now()`, and `user_bookmarks_idea` with camelCase foreign keys. `1761600000000-Votes.ts` adds `votes(user_id, idea_id, value)` and drops `idea_upvotes_user` and `idea_downvotes_user`. Recreate a local database that was built by the old synchronize path. That path deleted rows on every boot, so no production data exists yet.

Entities:

- `user`: uuid id, timestamps, unique username, password text, one-to-many ideas and comments, many-to-many bookmarks.
- `idea`: uuid id, timestamps, idea text, description text, many-to-one author, one-to-many comments. Vote rows live in `votes`, not on the idea.
- `votes`: `user_id` and `idea_id` uuid primary key, `value` smallint (`1` or `-1`), both foreign keys `ON DELETE CASCADE`, index on `idea_id`. A request value of `0` deletes the row.
- `comment`: uuid id, timestamps, comment text, many-to-one author and idea.

## Known problems

Checked against the code, not only against the original notes.

1. **Redis is unused.** `redisConfig` in `app.constants.ts` is commented out. Compose does not start Redis, and the API container does not wait for it. The commented config and the unused session prefix constants are still in `app.constants.ts`.
2. **Bookmark and unbookmark are unsafe.** `bookmarkIdea` calls `user.bookmarks.filter` without loading the `bookmarks` relation, so a normal `findOne` result throws. `unbookmarkIdea` filters with `===` against the idea, which **keeps** the matching bookmark and drops the others.
3. **Authorisation compares `JSON.stringify` of the user and the author.** `IdeaPolicy.authorize` does not compare ids.
4. **Image tags are major pins, not digests.** `postgres:18`, `node:22-alpine`, and `nginx:1.30`. A later digest pin is out of scope.
5. **The other unit specs still only call `toBeDefined`.** Vote behavior is covered by `yarn test:votes`. The guard's log and status codes are covered by `user-authentication.guard.spec.ts` and `yarn test:auth`.

## Planned changes

Proposals only, in this order:

1. `upgrade-stack` — done in this tree: NestJS 12, TypeScript 5.9, TypeORM 0.3, ESLint, pinned images, Redis removed. Request and response behavior was kept.
2. `add-migrations` — done in this tree: baseline migration in `api/src/migration`, `synchronize: false`, `dropSchema: false`.
3. `votes-table` — done in this tree: `votes(user_id, idea_id, value)`, `PUT /ideas/:id/vote`, GraphQL `setVote`, and cursor pages. Idea reads do not include `viewerVote`.
4. `auth-guard` — done in this tree: `401` when the user row is missing or the token is expired, `403` for a missing header or a bad signature, and the guard does not log a bearer token.
5. `e2e-tests` — done in this tree: `yarn test:e2e` runs the migration, vote, and auth checks on a throwaway database. The unit CI job does not start Postgres.

## CI baseline

`.github/workflows/ci.yml` runs on Node 22. The unit job installs the lockfile, builds, lints, and runs the unit tests. It does not start Postgres. A separate job starts Postgres 18 and runs `yarn test:e2e`.
