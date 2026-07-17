# 0004. Projects: submission, approval voting, and financial lifecycle

**Date**: 2026-07-17
**Status**: Proposed

## Summary

This spec defines how a member proposes a project, how the group approves or rejects it by vote, and how an approved project runs its own income and spending until it is closed. It builds entirely on data already in the database (`Project`, `Vault`, `Vote`, `FlowRule`) but adds the service layer, one small schema addition, and a shared place for vote resolution logic so a project vote and a member removal vote can both use it without the two feature areas depending on each other in a circle.

## Requirements

**User stories**:
- As an active group member, I want to propose a project with its own budget and vaults so the group can fund and track it separately from general group money.
- As an active group member, I want to vote on a proposed project the same way I vote on other group decisions, so approval is fair and recorded.
- As an active group member, I want to declare income and spending for an active project so its finances stay visible and correct.
- As an active group member, I want to close a finished project and see its money settled, so it does not sit open forever.

**Acceptance criteria** (the contract, each criterion is independently checkable):
- **AC-1**: Any active member can submit a project (title, description, requestedBudget, one sourceVault of type `GROUP`, one or more project vaults, an optional payoutVault among them, one or more project flow rules). Submission creates the `Project` in `PENDING` and automatically opens a `Vote` (`subjectType: PROJECT`) using the group's current default vote configuration (approvalThreshold, minQuorum, durationHours).
- **AC-2**: A project vote resolves the same way any generalized vote does (lazy, on next read or response): threshold met moves the project to `APPROVED` and immediately attempts activation (AC-3/AC-4); threshold not met sets the project to `REJECTED` (terminal, no funds move); quorum not met sets the vote to `INVALID`, and any active member can then open a fresh vote session for the same still `PENDING` project (per the cahier des charges invariant: one open vote per project, but a history of sessions).
- **AC-3**: When a project reaches `APPROVED`, the system attempts activation in the same transaction: if sourceVault has enough balance for requestedBudget, it debits sourceVault and credits the project's payoutVault (if one was designated) in one `PROJECT_PAYOUT` transaction, and the project moves to `ACTIVE`. Vote resolution and activation are guarded by a status conditional update so two concurrent lazy resolutions cannot both execute the payout.
- **AC-4**: When a project reaches `APPROVED` but sourceVault balance is insufficient, activation does not happen: the project stays at `APPROVED` (a real, visible status, never `ACTIVE` and never silently retried forever). The same lazy evaluation convention already used for vote resolution retries activation on the project's next read, until it succeeds.
- **AC-5**: Once `ACTIVE`, any active member can declare a project revenue entry. It is automatically split (a credit) across the destinations of the project's active `PROJECT_REVENUE` flow rule (a project vault, or the members' withdrawable vaults by share).
- **AC-6**: Once `ACTIVE`, any active member can declare a project expense entry. It is automatically split (a debit) across the destinations of the project's active `PROJECT_EXPENSE` flow rule, using the identical destination model as revenue (a project vault, or the members' withdrawable vaults by share, e.g. a profit payout or reimbursement leaving the project).
- **AC-7**: A declared project revenue or expense entry can be reversed by any active member, following the same reversal convention already used for contributions (the original is never edited or deleted; a paired reversal transaction is created).
- **AC-8**: Any active member can close an `ACTIVE` project at any time. Closing it auto liquidates whatever balance remains in each project vault per that vault's applicable active flow rule (or leaves it at zero if none applies), then moves the project to `CLOSED`.
- **AC-9**: Members can view a project's financial tracking: each project vault's balance, total money in and out, net balance, and full transaction history, scoped to that project.
- **AC-10**: Every project event is written to the existing immutable audit log, under the category that already matches its nature: project lifecycle transitions (submitted, approved, activated, closed) under `PROJECT`; money movements (payout, revenue entry, expense entry, reversal) under `FINANCIAL`; vote events (opened, responded, resolved) under `VOTE`, consistent with how vaults/contributions already use `FINANCIAL` and how the cahier des charges reserves these as separate categories.
- **AC-11**: Members are notified of project events (new proposal, vote outcome, closure) per their existing notification preferences.
- **AC-12**: Group data isolation holds for every project resource (project, its vaults, its votes, its entries): invisible and unreachable to a non member, with zero exception for a platform `ADMIN`, matching the existing `GroupMembershipGuard` model.
- **AC-13**: Vote resolution is served by a shared module that both the projects feature and the existing group membership feature register a resolver with, so resolving a project vote can activate a project without the projects module and the group membership module depending on each other in a circle.

## Decision

**Chosen option**: Extract a shared `VotesModule`; each domain registers a resolver. `VotesModule` becomes the sole owner of `Vote`/`VoteResponse` reads, writes, and the lazy resolution timing (evaluate on next read or response, no cron). It does not know what a project or a group membership removal is: each domain module (`GroupsModule`, `ProjectsModule`) registers an injectable resolver for its `subjectType` (`MEMBER_REMOVAL`, `PROJECT`) at startup, and `VotesModule` calls whichever resolver matches when a vote closes. Full options and rationale: see `rationale.md`.

## Feature design

**Data model sketch**:

The core entities already exist and are migrated (`Project`, `Vault`, `Vote`, `VoteResponse`, `FlowRule`, `FlowDestination`, `Transaction`). Two small additions are needed:

- `FlowSourceType` enum gains `PROJECT_EXPENSE` (alongside the existing `CONTRIBUTION`, `PROJECT_REVENUE`, `MANUAL_ENTRY`, `OTHER`), so a project's expense distribution rule is distinguishable from its revenue distribution rule. Its `FlowDestination` rows use the same `FlowDestinationType` (`VAULT` or `MEMBER_WITHDRAWABLE_VAULTS`) as a revenue rule; nothing new is needed there.
- `Project` gains `payoutVaultId String? @map("payout_vault_id")` plus `payoutVault Vault? @relation("ProjectPayoutVault", fields: [payoutVaultId], references: [id])`: a single nullable FK naming which of the project's own vaults receives the `PROJECT_PAYOUT` credit on activation. Validated at the application layer (must reference one of this project's own `PROJECT` type vaults); no database level constraint is needed since it is a simple nullable FK, not a cross row uniqueness rule.
- `FlowRule.sourceRefId` scopes a `PROJECT_REVENUE` or `PROJECT_EXPENSE` rule to one project (its id); `FlowRule.groupId` still applies since a `FlowRule` row always belongs to a group.
- No new table for vote configuration. The group's default `approvalThreshold` / `minQuorum` / `durationHours` for future project votes lives in `Group.metadata` (the existing free form JSON column, the same convention already used for other per group flexible settings), read at the moment a project is submitted and copied onto that submission's `Vote` row. Changing the default only affects votes opened after the change, matching the cahier des charges ("modifiable at any time, for votes to come").

**State transitions**:

`ProjectStatus`: `PENDING` → `APPROVED` → `ACTIVE` → `CLOSED`, or `PENDING` → `REJECTED` (terminal). `APPROVED` is a real, distinct status: the vote resolving with threshold met moves the project there and the system attempts activation in the same transaction; on success `APPROVED` becomes `ACTIVE` immediately (the normal case, feels instantaneous); on insufficient sourceVault balance, the project stays at `APPROVED` and activation is retried lazily on the project's next read (the same "no background job" convention already used for vote and invite expiry) until it succeeds. A vote that goes `INVALID` (quorum not met) leaves the project `PENDING`, and any active member may open a new vote session for it; a vote that resolves `REJECTED` (threshold not met) is terminal for that project, matching the cahier des charges state diagram (no arrow back to `PENDING` from `REJECTED`).

`VoteStatus` (existing, reused as is): `OPEN` → `APPROVED` / `REJECTED` / `INVALID`.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/groups/:groupId/projects` | POST | title, description?, requestedBudget, sourceVaultId (GROUP type), vaults[] (name), payoutVaultName?, flowRules[] | project id, status: PENDING, vote id | member (active) | 422 sourceVault not GROUP type, 422 payoutVault not one of the submitted project vaults, 422 flow rule percentages not summing to 100 |
| `/groups/:groupId/projects` | GET | pagination | list of projects with status | member (active) | - |
| `/groups/:groupId/projects/:id` | GET | - | project (lazily re-evaluated: retries activation if APPROVED), its vaults, its flow rules, its vote history | member (active) | 404 not found or not in this group |
| `/groups/:groupId/projects/:id/votes` | POST | - | new vote id | member (active) | 422 project not PENDING, 422 an OPEN vote already exists for this project |
| `/groups/:groupId/votes/:voteId/respond` | POST | choice: FOR/AGAINST/ABSTAIN | vote response | member (active) | 409 already responded, 422 vote not OPEN (reused, existing endpoint, extended to dispatch PROJECT resolution on close) |
| `/groups/:groupId/vote-config` | PATCH | approvalThreshold?, minQuorum?, durationHours? | the group's updated default vote config | member (active) | 422 invalid threshold/quorum/duration |
| `/groups/:groupId/projects/:id/revenue` | POST | amount, description? | transaction(s), new vault balances | member (active) | 422 project not ACTIVE, 422 no active PROJECT_REVENUE rule |
| `/groups/:groupId/projects/:id/expense` | POST | amount, description? | transaction(s), new vault balances | member (active) | 422 project not ACTIVE, 422 no active PROJECT_EXPENSE rule, 422 insufficient balance |
| `/groups/:groupId/projects/:id/entries/:transactionId/reverse` | POST | - | reversal transaction | member (active) | 422 already reversed, 422 not this project's entry |
| `/groups/:groupId/projects/:id/close` | POST | - | project status: CLOSED, liquidation transactions | member (active) | 422 project not ACTIVE |
| `/groups/:groupId/projects/:id/transactions` | GET | pagination, vaultId? | transaction list scoped to the project | member (active) | - |

**Key invariants**:
- `sourceVaultId` must reference a `Vault` of type `GROUP` in the same group (never `WITHDRAWABLE`, never another project's `PROJECT` vault).
- `payoutVaultId`, when set, must reference one of this project's own submitted vaults.
- A `FlowRule`'s destination percentages sum to exactly 100% (existing rule, reused unchanged), for both `PROJECT_REVENUE` and `PROJECT_EXPENSE` rules.
- Only one `Vote` may be `OPEN` for a given project at a time (existing invariant, reused unchanged); an `INVALID` outcome allows a new session, `REJECTED` does not.
- Vote resolution and the resulting project activation happen inside one database transaction with a status guarded conditional update (the project row is only moved out of `PENDING`/`APPROVED` when its current status still matches what the resolver read), so two concurrent lazy resolutions of the same vote or the same pending activation can never both execute the `PROJECT_PAYOUT`.
- Once `ACTIVE`, a project's set of vaults and flow rules is fixed; there is no endpoint to add either after approval.
- All money and percentage arithmetic goes through `Prisma.Decimal` (existing rule, reused unchanged).
- Audit log entries are never edited or deleted, at any privilege level (existing rule, reused unchanged).

**Security model**:
Every project route sits behind the existing `JwtAuthGuard` plus `GroupMembershipGuard`: the caller must be an `ACTIVE` `GroupMember` of `:groupId`. No project level role exists, matching group membership's zero exception model (a platform `ADMIN` gets no special access). Financial data, the same compliance sensitivity as the existing vaults/contributions feature (spec 0003), no new compliance scope is introduced.

**Configuration required**: none. No new environment variables or third party credentials.

**Critical test scenarios**:
- Happy path: submit a project, quorum and threshold met, PROJECT_PAYOUT moves funds and activates it, a revenue entry distributes correctly, closure liquidates remaining balances, verifies **AC-1**, **AC-3**, **AC-5**, **AC-8**
- Failure case: threshold met but sourceVault balance has dropped below requestedBudget since submission, project stays at APPROVED (not ACTIVE) and a later read retries activation successfully once funds return, verifies **AC-4**
- Concurrency: two simultaneous reads of the same OPEN vote both trigger lazy resolution; only one `PROJECT_PAYOUT` is ever created, verifies **AC-3**
- Auth/permission: a non member of the group gets 403/404 on every project route, verifies **AC-12**

## Build plan

1. Migration: add `PROJECT_EXPENSE` to `FlowSourceType`, add `Project.payoutVaultId`, satisfies **AC-1**, **AC-3**, **AC-6**
2. Extract `VotesModule` from the groups module (Vote/VoteResponse CRUD, the lazy resolution engine with its status guarded conditional update, the resolver registry), move the existing `MEMBER_REMOVAL` resolver into `GroupsModule` registering against it, carry over its existing test coverage unchanged, satisfies **AC-13** (prerequisite for AC-2)
3. Group default vote configuration: read/write `approvalThreshold`/`minQuorum`/`durationHours` in `Group.metadata`, with the `PATCH /groups/:groupId/vote-config` endpoint, satisfies **AC-1**
4. `ProjectsModule` scaffold: submit a project (validates sourceVault type, payoutVault membership, flow rule percentage sums), creates the `Project`, its vaults, its flow rules, and opens its `Vote` using the group's current default config, in one transaction; registers the `PROJECT` resolver with `VotesModule`, satisfies **AC-1**
5. `PROJECT` vote resolver: on threshold met, move the project to `APPROVED` and attempt activation in the same guarded transaction; sufficient balance issues the `PROJECT_PAYOUT` transaction and moves it to `ACTIVE`; insufficient balance leaves it at `APPROVED` for lazy retry; `REJECTED` and `INVALID` handled per the state transitions above; the "open a new vote session" endpoint for an `INVALID`, still `PENDING` project, satisfies **AC-2**, **AC-3**, **AC-4**
6. Project financial entries: revenue endpoint (credit split via the project's active `PROJECT_REVENUE` rule) and expense endpoint (debit split via its active `PROJECT_EXPENSE` rule), both using the existing flow distribution logic generalized to a project scoped `sourceRefId` and the shared destination model, satisfies **AC-5**, **AC-6**
7. Reversal of a project entry, extending the existing contribution reversal convention, satisfies **AC-7**
8. Project closure: liquidate remaining project vault balances per each vault's active flow rule (or leave at zero), move the project to `CLOSED`, satisfies **AC-8**
9. Read surfaces: project list/get (with vaults, flow rules, vote history), project scoped transaction ledger, satisfies **AC-9**
10. Audit logging (split across `PROJECT`/`FINANCIAL`/`VOTE` categories per event) and notifications wired to every project event above, satisfies **AC-10**, **AC-11**
11. Authorization: apply the existing `GroupMembershipGuard` to every new project route, satisfies **AC-12**

This spec's build approach assumption: no build approach is recorded in `AGENTS.md` or the scope header, so this plan defaults to end to end slices (a Tracer Bullet style order: the migration and the vote dispatch extraction first since every later task depends on both, then one working submit-to-activate slice, then the entry/closure/read slices). State this assumption in `/develop` if a different approach is later declared project wide.

## Consequences

**Positive**:
- Projects become the first feature to exercise the schema's already migrated `Project`/`Vote` (`PROJECT` subject)/`PROJECT` vault relationships, closing the gap the vaults spec (0003) explicitly deferred.
- The vote resolution refactor (`VotesModule`) pays down a coupling risk before it is ever hit in production, not after a second feature already depends on the tangled version.
- A real `APPROVED` status (distinct from `ACTIVE`) gives "approved but funds temporarily short" a defined, visible home instead of an implicit or undefined state.

**Negative / tradeoffs**:
- Extracting `VotesModule` touches already shipped, tested group membership code (spec 0002); it is a refactor risk on working code, not purely additive.
- A project's vaults and flow rules being fixed at approval time (no later edits) means a group that misjudges its project structure at submission must close the project and resubmit rather than adjust it in place.
- Every one of a project's revenue and expense entries requires an active matching flow rule to be applied at all; a project with no `PROJECT_EXPENSE` rule configured cannot record an expense, which the spec treats as a validation error (422) rather than a silent fallback.
- A project stuck at `APPROVED` with no lasting sourceVault balance retries forever on every read with no automatic alert; members must notice and fund the sourceVault themselves (no background job exists to page anyone).

**Neutral**:
- One new migration (`PROJECT_EXPENSE` enum value, `Project.payoutVaultId` column).
- The resolver registry pattern introduced for votes is a new pattern in the codebase; the next module needing this pattern (if any) should reuse `VotesModule`'s shape rather than invent a second one.

## Follow-up

- [ ] No scope row currently links this spec in `docs/scope/api/scope.md`; enroll a "Projects" feature row pointing here before `/develop` picks this up.
- [ ] Whether a `CLOSED` project can ever be reopened is left undefined, mirroring the same open question already flagged for group closure in spec 0002.
- [ ] What "no active flow rule" should mean long term (a hard validation error today, per this spec) may need revisiting if a group wants to record entries before configuring rules.
- [ ] A project stuck at `APPROVED` for lack of funds has no notification/alert today, only a lazy retry on next read; consider whether this needs its own notification event once the notification system is built out further.

## Rationale

Full reasoning and the options record: see `rationale.md`.
