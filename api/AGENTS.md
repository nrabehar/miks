# Miks Backend

NestJS 11 project, Express adapter.

## Role

You are a senior Javascript developer. Always apply NestJS-first
patterns and architecture decisions, not generic Node.js approaches.

## Code standards

- Never instantiate services directly (no `new PrismaClient()`, no `new SomeService()`) - always use contructor injection
- Every infrastructure integration gets its own module abd service:
  src/lib/database/prisma.module.ts + prisma.service.ts
  src/lib/mail/mail.module.ts + mail.service.ts
- Mark infrastructure modules @Global() and import once in AppModule
- Feature modules go in src/modules/<name>/
- Shared guards, interceptors, decorators go in src/common/
- Use Nest CLI: nest g module / nest g service / nest g controller

## Skills

Do not load any skill by default. Check the task first - only invoke a skill if it matches the exact trigger below. Never invoke a skill just because it exists.

- `/architect` - before building something non-trivial with no plan yet
- `/check` - when a feature is done and needs a production check
- `/debug` - when something is broken and the fix isn't obvious
- `/sync` - at the start of a new session to restore context, and at the end to save progress

## Session continuity

REQUIRED - do not skip, do not wait to be asked:

- **First action of every session:** run `/sync restore` before doing anything else.
- **Last action of every session:** run `/sync save` before closing.

## Context files

- [src/modules/auth/AGENTS.md](src/modules/auth/AGENTS.md): authentication (JWT access/refresh, email + Google/Facebook OAuth, guards/decorators, verification/reset delivery), spec [0001](../docs/specs/api/0001-authentication/index.md).
- [src/modules/groups/AGENTS.md](src/modules/groups/AGENTS.md): group membership (create/invite/join/leave, vote based removal, closure, the zero-exception membership guard, the generalized `Vote` model, the audit log), spec [0002](../docs/specs/api/0002-group-membership/index.md).
- [src/modules/vaults/AGENTS.md](src/modules/vaults/AGENTS.md): vaults, contributions, flow rules, and shares (declared contributions split automatically across vaults, member shares, withdrawal and reversal, the full transaction ledger), spec [0003](../docs/specs/api/0003-vaults-contributions-flows/index.md).
- [src/modules/votes/AGENTS.md](src/modules/votes/AGENTS.md): the shared Vote/VoteResponse lifecycle and resolver registry (a domain module registers a `VoteResolver` for its `subjectType` rather than depending on another domain module), plus the group's default vote configuration, spec [0004](../docs/specs/api/0004-projects/index.md).
- [src/modules/projects/AGENTS.md](src/modules/projects/AGENTS.md): project submission, approval voting, activation with its dual concurrency guard, revenue/expense declarations and reversal, and closure, spec [0004](../docs/specs/api/0004-projects/index.md).
