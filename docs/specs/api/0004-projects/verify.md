# Verify: projects · spec 0004 · updated 2026-07-18
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] As an active member, `POST /groups/:groupId/projects` with a title, requestedBudget, a GROUP-type sourceVaultId, one or more project vault names, and a PROJECT_REVENUE + PROJECT_EXPENSE flow rule → expect 201, project status `PENDING`, an opened `Vote` (subjectType `PROJECT`) using the group's current vote-config defaults → AC-1
- [ ] Submit with a sourceVaultId that is not GROUP type → expect 422 → AC-1
- [ ] Submit with a `payoutVaultName` not among the submitted vault names → expect 422 → AC-1
- [ ] Submit with a flow rule whose destination percentages don't sum to 100 → expect 422 → AC-1
- [ ] Have enough members respond FOR to meet quorum + threshold (`POST /votes/:voteId/responses`), then `GET /groups/:groupId/projects/:id` → expect the vote lazily resolves to `APPROVED` and, since sourceVault has enough balance, the project immediately shows `ACTIVE`, sourceVault debited and payoutVault credited by requestedBudget in one `PROJECT_PAYOUT` transaction pair → AC-2, AC-3
- [ ] Repeat with sourceVault balance below requestedBudget at resolution time → expect the project stops at `APPROVED` (not `ACTIVE`); top up sourceVault, `GET` the project again → expect it activates on that next read → AC-4
- [ ] Vote to threshold-not-met (majority AGAINST) → expect project → `REJECTED`, no funds move, no further vote can be opened → AC-2
- [ ] Vote with quorum not met before scheduledCloseAt → expect vote → `INVALID`, project stays `PENDING`; `POST /groups/:groupId/projects/:id/votes` → expect a fresh vote session opens → AC-2
- [ ] On an `ACTIVE` project, `POST .../revenue` with an amount → expect it split (credited) across the active PROJECT_REVENUE rule's destinations exactly as declared → AC-5
- [ ] On an `ACTIVE` project, `POST .../expense` with an amount → expect it split (debited) across the active PROJECT_EXPENSE rule's destinations; if a destination lacks balance → expect 422 and no partial write → AC-6
- [ ] `POST .../entries/:transactionId/reverse` on a revenue/expense transaction → expect a paired opposite-direction transaction, the original transaction row untouched, and a second reverse attempt on the same transaction → 409 → AC-7
- [ ] `POST .../close` on an `ACTIVE` project with a nonzero project-vault balance → expect status `CLOSED` and the balance left exactly as it was (not zeroed) → AC-8
- [ ] `POST .../close` on a non-`ACTIVE` project, or issue two concurrent close calls on the same project → expect the second to get 409/422, only one `CLOSED` transition → AC-8
- [ ] `GET .../transactions` and `GET :id` on an active project → expect each project vault's balance, in/out totals, and full transaction history scoped to that project → AC-9
- [ ] As a non-member of the group, call every new project route → expect 403/404 on all of them → AC-12

## Commands

- [ ] `npx prisma migrate status` (or equivalent) → confirms `payout_vault_id` column and `PROJECT_EXPENSE` enum value are live → AC-1, AC-3, AC-6
- [ ] `npx jest` (api) → all suites green, including the relocated votes/removal-votes/member-removal-vote-resolver coverage → AC-13
- [ ] `npx tsc --noEmit` (api) → clean

## Acceptance-criteria coverage

- AC-1 … project submission validation + vote opened · AC-2 … vote resolution outcomes (APPROVED/REJECTED/INVALID) + reopen · AC-3 … activation payout + dual concurrency guard · AC-4 … underfunded lazy retry · AC-5 … revenue distribution · AC-6 … expense distribution + insufficient-balance guard · AC-7 … entry reversal · AC-8 … closure + its own concurrency guard (liquidation intentionally not implemented — engineer's call during build: balances are left as-is) · AC-9 … read/ledger surfaces · AC-10 … audit logging (PROJECT/FINANCIAL/VOTE categories seeded) · AC-11 … NOT implemented, see note below · AC-12 … GroupMembershipGuard on every route · AC-13 … VotesModule/resolver-registry extraction

**AC-11 note**: member notifications for project events are not wired. No generic, notification-preference-respecting delivery path exists anywhere in this codebase yet (only a dedicated mail-based invite-code path); this is a pre-existing gap already left open by group membership's and vaults' own events, not something newly introduced here. Flag for a follow-up feature if this needs closing.
