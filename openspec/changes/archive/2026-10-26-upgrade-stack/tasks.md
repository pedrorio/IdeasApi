# Tasks

## 1. Dependencies

- [x] 1.1 Upgrade the NestJS packages, TypeORM, and `typescript` to the versions in `design.md`, and install. Verify `yarn install` finishes and `package.json` shows NestJS 12, TypeScript 5.9, and TypeORM 0.3.
- [x] 1.2 Remove `tslint` and add ESLint with the rule mapping in `design.md`. Verify `yarn lint` invokes ESLint and exits 0.

## 2. Compile fixes

- [x] 2.1 Update TypeORM 0.2 `findOne` call sites to the 0.3 signature. Verify `yarn build` exits 0 and a focused test or manual read still returns the same idea fields.
- [x] 2.2 Update renamed NestJS and Swagger decorators until `yarn build` exits 0. Verify the Swagger `/docs` page still lists the existing operations.

## 3. Images and CI

- [x] 3.1 Remove the unused Redis service and its wait, and replace `postgres:latest`, `node:alpine`, and untagged `nginx` with explicit version tags. Verify `docker compose config` shows no `latest` tag, no untagged base image, and no Redis service.
- [x] 3.2 Point CI at a Node version NestJS 12 supports. Verify the workflow's build, lint, and unit-test steps pass.
- [x] 3.3 Run the existing unit tests. Verify the four `toBeDefined` specs pass and no route, status code, or response field was intentionally changed.
