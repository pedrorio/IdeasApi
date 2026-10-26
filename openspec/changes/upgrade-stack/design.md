# Design

## Context

See `proposal.md` for why this is first. The checked-in compiler was TypeScript 3.2.4. CI already pins 3.9.10 and `skipLibCheck` so the old lockfile typechecks. Those are temporary. `Repository.findOne` in this codebase is the TypeORM 0.2 form (`findOne(id)` and `findOne(id, { relations })`). TypeORM 0.3 changed that signature. Swagger decorators imported from `@nestjs/swagger` v2 were renamed in later majors.

## Goals / Non-Goals

**Goals:**

- A green `yarn build`, `yarn lint`, and `yarn test` on the new toolchain.
- Image tags that cannot move under a rebuild.
- The same routes, status codes, and JSON or GraphQL shapes as before.

**Non-Goals:**

- Turning off `synchronize` or `dropSchema` (`add-migrations`).
- Replacing vote storage, auth status codes, or adding e2e coverage.
- Adopting TypeScript 6 or 7, or reformatting the repo beyond what the new linter requires to pass.

## Decisions

- Target NestJS 12.2.x, the stable line current on 2026-10-26, and the matching `@nestjs/graphql`, `@nestjs/swagger`, `@nestjs/testing`, and `@nestjs/typeorm` releases. If 12.2 has a newer patch at implementation time, use that patch, not a new major.
- Target `typescript@5.9.3` (or a later 5.9 patch if one exists). Stay on major 5.
- Target the latest TypeORM 0.3 patch, not 0.2 and not a 0.4 or 1.x line.
- Translate TypeORM 0.2 `findOne` calls to the 0.3 options object (`where`, `relations`) without changing which row or relations come back.
- ESLint flat config or eslintrc is an implementation choice. The rule set mirrors `tslint.json`. Enable `allowShortCircuit` (or the equivalent) so existing `condition && logger.log(...)` statements do not have to be rewritten.
- Pin Postgres and Redis to the current stable major tags at implementation time, written as explicit tags such as `postgres:17` and `redis:7`, never `latest`. Pin the API base image to a Node major that satisfies NestJS 12, and pin nginx to a major tag. Record the chosen tags in the implementation PR.
- Keep `skipLibCheck` only if the upgraded declaration files still need it. Prefer a clean `tsc` without it when the new stack allows that.

## Risks / Trade-offs

- [Nest 12 or TypeORM 0.3 changes a default] → Compare one read and one write of an idea, a login, and a vote against the old process before merging. Any difference blocks the change.
- [A pinned major tag still receives minor image rebuilds] → Pinning the major is the requirement. A digest pin can follow later and is not required here.
- [Compile fixes hide a behavior change] → Do not "clean up" vote, bookmark, or guard logic in this change.
