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
- **Auth** (`api/src/user/authentication`): `POST /auth/register`, `POST /auth/login`, `GET /auth/me`. GraphQL `registerUser`, `loginUser`, `findMe`. `UserAuthenticationGuard` checks `Authorization: Bearer`.
- **Ideas** (`api/src/idea`): create, read, update, delete. Reads load `author`, `upvotes`, `downvotes`, and `comments`. `IdeaRO` turns the vote relations into **numbers** before responding.
- **Votes** (`api/src/idea/vote`): `POST /ideas/:id/upvote` and `POST /ideas/:id/downvote`, GraphQL `upvoteIdea` and `downvoteIdea`. Both call `IdeaVoteService.voteIdea`. Storage is two `ManyToMany` arrays on `IdeaEntity`, not a votes table.
- **Bookmarks** (`api/src/idea/bookmark`): `POST /ideas/:id/bookmark` and `DELETE /ideas/:id/bookmark`. Storage is a `ManyToMany` on `UserEntity`.
- **Comments** (`api/src/comment`): this module exists in addition to the five areas above. `GET /comments`, `GET /comments/:id`, idea-scoped comment CRUD under `/ideas/:ideaId/comments`, and `GET /users/:userId/comments`.
- **Newest** (`api/src/idea/newest`): `GET /ideas/newest` orders by `created DESC` and uses the same offset paging.

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

`yarn test:e2e` loads `AppModule`, which connects to Postgres. The only e2e case calls `GET /` and expects `Hello World!`. No controller serves that route.

## Data model

TypeORM entity metadata is the schema. `api/ormconfig.js` sets `synchronize: true` and `dropSchema: true`. Every API process drops the schema and recreates it from entities. `migrations` points at `./src/migration/**/*.ts`, and that directory does not exist. `cli.migrationsDir` is `./src`, not a migrations folder. The `cli` key is TypeORM 0.2-only; `AppModule` strips it before `TypeOrmModule.forRoot` and does not change `synchronize` or `dropSchema`.

TypeORM 0.3 synchronize still matches the previous 0.2 schema: `uuid_generate_v4()` ids, `timestamp without time zone` timestamps defaulting to `now()`, and join tables `idea_upvotes_user`, `idea_downvotes_user`, and `user_bookmarks_idea` with camelCase foreign keys (`ideaId`, `userId`, `authorId`). `add-migrations` should capture this 0.3 output. It does not need a new naming scheme.

Entities:

- `user`: uuid id, timestamps, unique username, password text, one-to-many ideas and comments, many-to-many bookmarks.
- `idea`: uuid id, timestamps, idea text, description text, many-to-one author, many-to-many `upvotes`, many-to-many `downvotes`, one-to-many comments.
- `comment`: uuid id, timestamps, comment text, many-to-one author and idea.

## Known problems

Checked against the code, not only against the original notes.

1. **Votes are read-modify-write on relation arrays.** `IdeaVoteService.voteIdea` loads the idea with relations `author`, `upvotes`, `downvotes`, and `comments` (every relation declared on `IdeaEntity`), pushes or filters users in memory, and `save`s the idea. Two concurrent votes can lose an update. The same user's repeated vote, and a switch from up to down, both take the branch that **removes the user from both arrays**. A switch does not leave a downvote in place. The unit specs do not exercise this. They only call `toBeDefined`, and until the CI fix they did not construct the services at all (Nest could not resolve repositories or the auth guard).
2. **Idea HTTP and GraphQL responses already expose vote counts, not voter lists.** `IdeaRO.fromIdea` assigns `upvotes` and `downvotes` to the array lengths. `idea.graphql` types those fields as `Int!`. The voter lists exist only in the database relations. List endpoints use an offset `page` query (`take: 25`), not a cursor. `GET /ideas` has no `order`.
3. **The auth guard does not crash when the token's user row is missing.** `findRegistration` throws `HttpException` `403` with message `Invalid Token`. `jwt.verify` already catches expiry (`expiresIn: "7d"`) and answers `403` with `Token error: ...`. A missing `Authorization` header returns `false`, which Nest turns into `403`. The HTTP path logs `request.user` after `UserAuthenticationRO.fromUser`. That object is `{ id, username, created, token }`. The password column is not copied. The `token` getter signs a **new** JWT, so the log line contains a bearer token.
4. **`dropSchema: true` wipes data on every boot.** Turning off only `synchronize` would still drop the schema.
5. **Redis is unused.** `redisConfig` in `app.constants.ts` is commented out. Compose does not start Redis, and the API container does not wait for it. The commented config and the unused session prefix constants are still in `app.constants.ts`.
6. **Bookmark and unbookmark are unsafe.** `bookmarkIdea` calls `user.bookmarks.filter` without loading the `bookmarks` relation, so a normal `findOne` result throws. `unbookmarkIdea` filters with `===` against the idea, which **keeps** the matching bookmark and drops the others.
7. **Authorisation compares `JSON.stringify` of the user and the author.** `IdeaPolicy.authorize` does not compare ids.
8. **Image tags are major pins, not digests.** `postgres:18`, `node:22-alpine`, and `nginx:1.30`. A later digest pin is out of scope.

## Planned changes

Proposals only, in this order:

1. `upgrade-stack` — done in this tree: NestJS 12, TypeScript 5.9, TypeORM 0.3, ESLint, pinned images, Redis removed. Request and response behavior was kept. The next change is `add-migrations`.
2. `add-migrations` — baseline migration, `synchronize: false`, `dropSchema: false`.
3. `votes-table` — `votes(user_id, idea_id, value)` and an idempotent set-vote API.
4. `auth-guard` — `401` when the user row is missing, no secret logging, explicit expiry handling.
5. `e2e-tests` — throwaway Postgres for auth and voting. `add-migrations`, `votes-table`, and `auth-guard` each land with their own e2e tests.

## CI baseline

`.github/workflows/ci.yml` runs on Node 22, which was verified locally to install the lockfile, build, lint, and run the unit tests. It does not run e2e and does not start Postgres.
