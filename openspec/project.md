# Ideas API

This file is the current-state description of the repository. OpenSpec's current CLI (1.15.0, schema `spec-driven`) injects `openspec/config.yaml` into planning runs and does not generate `project.md`. This file is kept so the narrative has a stable place to live.

The application code is in `api/`. Nothing in this baseline change is allowed to change request handling except the minimum needed to make the existing build, lint, and unit tests pass.

## Stack

| Piece | What the repo uses |
| --- | --- |
| Framework | NestJS 5 (`@nestjs/common`, `@nestjs/core`, `@nestjs/graphql`, `@nestjs/swagger` `^5` / swagger `^2`) |
| Language | TypeScript. `package.json` declared `^3.0.1` and the lockfile resolved **3.2.4**. CI pins **3.9.10** (still TypeScript 3) because 3.2.4 cannot parse declaration files already in the lockfile. |
| ORM | TypeORM `^0.2.25` via `@nestjs/typeorm` `^5.2.2`, driver `pg` 7 |
| Lint | TSLint 5.11 (`tslint:recommended`), Prettier 1 |
| Tests | Jest 23 and ts-jest 23. Four unit specs, each asserting `toBeDefined`. One starter e2e spec. |
| API style | REST (Express) and schema-first GraphQL (`typePaths: ["./**/*.graphql"]`). Swagger UI at `/docs`. |
| Auth | Hand-rolled JWT (`jsonwebtoken`), password hash `bcryptjs`, expiry `7d` |
| Containers | `docker-compose.yml`: nginx, api, `redis:latest`, `postgres:latest` |

`api/Dockerfile` is `FROM node:alpine` (unpinned). `nginx/Dockerfile` is `FROM nginx` (unpinned). The API image waits on `postgres:5432` and `redis:6379`, then runs `yarn start:dev`.

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

TypeORM entity metadata is the schema. `api/ormconfig.js` sets `synchronize: true` and `dropSchema: true`. Every API process drops the schema and recreates it from entities. `migrations` points at `./src/migration/**/*.ts`, and that directory does not exist. `cli.migrationsDir` is `./src`, not a migrations folder.

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
5. **Redis is unused.** `redisConfig` in `app.constants.ts` is commented out. Compose still starts `redis:latest`, and the API container waits for it.
6. **Bookmark and unbookmark are unsafe.** `bookmarkIdea` calls `user.bookmarks.filter` without loading the `bookmarks` relation, so a normal `findOne` result throws. `unbookmarkIdea` filters with `===` against the idea, which **keeps** the matching bookmark and drops the others.
7. **Authorisation compares `JSON.stringify` of the user and the author.** `IdeaPolicy.authorize` does not compare ids.
8. **Images float.** `postgres:latest`, `redis:latest`, `node:alpine`, and untagged `nginx`.

## Planned changes

Proposals only, in this order:

1. `upgrade-stack` — NestJS 12, TypeScript 5, TypeORM 0.3, ESLint, pinned images. No request-behavior change.
2. `add-migrations` — baseline migration, `synchronize: false`, `dropSchema: false`.
3. `votes-table` — `votes(user_id, idea_id, value)` and an idempotent set-vote API.
4. `auth-guard` — `401` when the user row is missing, no secret logging, explicit expiry handling.
5. `e2e-tests` — throwaway Postgres for auth and voting. `add-migrations`, `votes-table`, and `auth-guard` each land with their own e2e tests.

## CI baseline

`.github/workflows/ci.yml` runs on Node 22, which was verified locally to install the lockfile, build, lint, and run the unit tests. It does not run e2e and does not start Postgres.
