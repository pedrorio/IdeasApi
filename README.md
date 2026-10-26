# Ideas API

The Ideas API is a NestJS service in `api/`. NestJS modules serve REST and schema-first GraphQL. Swagger UI is at `/docs`.

## Run it locally

Use Node 22, Yarn 1, and Postgres 18. Startup runs pending TypeORM migrations and does not drop the schema.

From `api/`, set `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `JWT_SECRET`. The process exits at startup when `JWT_SECRET` is missing or shorter than 32 bytes. Then run:

```bash
yarn install --frozen-lockfile
yarn start
```

The process listens on `SERVER_PORT`. When `SERVER_PORT` is unset, it listens on port 5000. Open `http://localhost:5000/docs` for Swagger UI. A request to `/docs` redirects to `/docs/`. The OpenAPI document is at `/docs-json`.

To run the same API in Docker, from the repository root export the variables named in `docker-compose.yml` and run `docker compose up`. nginx listens on port 4000. A request to `/api/ideas` is proxied to the API as `/ideas`.

## Run the tests

From `api/`, run `yarn test`. `yarn test:migration`, `yarn test:votes`, and `yarn test:auth` need Postgres 18.

`yarn test:e2e` runs the migration, vote, and auth checks against a throwaway database. It needs Postgres 18.

## Where the specs live

Change proposals and the current-state notes are in `openspec/`.
