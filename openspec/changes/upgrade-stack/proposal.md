# Proposal

## Why

The API is stuck on NestJS 5, TypeScript 3, TypeORM 0.2, and TSLint, and the Compose images float on `:latest` or an untagged base. Later changes (migrations, a votes table, auth fixes, e2e) should land on a toolchain that still receives releases. This change is mechanical: request and response behavior stays as it is.

## What Changes

- Move the NestJS packages the app already uses onto the current stable NestJS 12 line (12.2.0 as of 2026-10-26), including `@nestjs/typeorm` at the release that peers with NestJS 12.
- Move TypeORM to the latest 0.3.x and update call sites that no longer compile, including `Repository.findOne(id)` and `findOne(id, { relations })`. Results of those calls stay the same.
- Move the compiler to TypeScript 5.9 (the last 5.x; 5.9.3). Do not adopt TypeScript 6 or 7 in this change. The current npm `typescript` major is 7, and this change intentionally stops at 5 as requested.
- Replace TSLint with ESLint. Carry over the current `tslint.json` choices where ESLint has an equivalent (double quotes, max line length 150, member ordering and interface-name checks off).
- Pin the Postgres and Redis image tags in `docker-compose.yml`. Also pin `api/Dockerfile` (`node:alpine` today) and `nginx/Dockerfile` (untagged `nginx` today).
- Leave HTTP routes, GraphQL fields, status codes, and the database schema unchanged.

## Capabilities

### New Capabilities

- `toolchain`: Which framework, compiler, linter, and container image tags the API is built and run with.

### Modified Capabilities

## Impact

- `api/package.json`, `api/yarn.lock`, `api/tslint.json` (removed), ESLint config, `api/tsconfig*.json`.
- NestJS 5 decorators that were renamed (`ApiModelProperty`, `ApiUseTags`, `ApiImplicitQuery`, and GraphQL `forRoot`) need compile-only updates.
- `docker-compose.yml`, `api/Dockerfile`, `nginx/Dockerfile`.
- `.github/workflows/ci.yml` Node version, if NestJS 12 requires a different Node than 22.
- No schema migration in this change. `synchronize` and `dropSchema` stay as they are until `add-migrations`.
