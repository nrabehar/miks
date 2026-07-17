# 0003. Vaults, contributions, flow rules, and shares

**Date**: 2026-07-17
**Status**: Accepted

## Summary

This spec builds the financial core every group needs: vaults to hold money declarations, a way for a member to record a contribution, flow rules that automatically split a contribution across vaults, and each member's share (their proportional slice of the group). It also adds a declared withdrawal action and a way to reverse a mistaken entry. Nothing here moves real money; every entry is a member's own declaration, matching MIKS's rule that the platform never holds funds. Building this unblocks everything downstream (projects, project votes, the dashboard) that needs a group's money to already be trackable.

## Context

See [rationale.md](rationale.md) for the full problem context, forces, and the product doc's open points this spec settles.

## Requirements

**User stories**:
- As an active member, I want to record my own contribution, so that it is visible to the whole group and counts toward my share.
- As a group, I want a contribution to automatically split across the right vaults the moment it's declared, so that no one has to manually move money between vaults.
- As a member, I want to see my proportional share of the group, so that I know what I'm entitled to from any distribution.
- As a member, I want to declare a withdrawal from my own withdrawable vault, so that the platform's records match what actually happened outside it.
- As a member, I want to fix a contribution or withdrawal I entered wrong, so that a typo doesn't become a permanent, unfixable record.
- As any group member, I want to see every vault's balance, every contribution, and the full transaction ledger, so that the group's finances stay fully transparent to everyone, not just one person.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: An ACTIVE member can create an additional `GROUP` type vault for their group (name only); it appears in the group's vault list with a zero cached balance.
- **AC-2**: Every member gets exactly one `WITHDRAWABLE` vault, created automatically (never manually) the moment they become an ACTIVE member of a group.
- **AC-3**: An ACTIVE member can record their own contribution (amount, in the group's currency); it is self declared only (a member cannot record a contribution for anyone else), saved immediately, and counts toward the group's total contributed even before any flow rule exists.
- **AC-4**: A group can define a flow rule for a source type (`CONTRIBUTION` or `MANUAL_ENTRY` in this spec; `PROJECT_REVENUE` is out of scope) with one or more destinations (a specific vault, or all active members' withdrawable vaults split by share), whose destination percentages sum to exactly 100%. More than one active rule per source type is allowed; each applies independently.
- **AC-5**: When a contribution is recorded, every currently active `CONTRIBUTION` flow rule for that group applies immediately and automatically (no manual trigger): the contributed amount is split across each rule's destinations by percentage, with any rounding remainder assigned to the destination listed last, producing one `Transaction` per destination. The contribution's response includes the resulting transactions.
- **AC-6**: A contribution recorded while the group has no active `CONTRIBUTION` flow rule is still saved and counts toward the member's share; it produces zero transactions until a rule becomes active, and there is no retroactive replay against contributions made before a rule existed.
- **AC-7**: A member's share (`MemberShareCache`) always equals their cumulative contributions divided by the group's total cumulative contributions; it is recalculated for every active member whenever any contribution changes the group's total, using the live share at the moment any `MEMBER_WITHDRAWABLE_VAULTS` flow destination is applied.
- **AC-8**: A flow rule is never edited in place. Replacing it (one atomic call) deactivates the old rule and creates a new one linked back via `replacesRuleId`, so every past transaction remains attributable to the exact rule that was active when it ran.
- **AC-9**: A member can declare a withdrawal from their own withdrawable vault, up to its current cached balance. Withdrawing more than the balance is rejected with a clear error and creates no transaction; a valid withdrawal immediately decrements the balance and appears in the ledger as a `WITHDRAWAL` transaction.
- **AC-10**: A former member's (left or removed) withdrawable vault balance is preserved and remains declarable-withdrawable after they leave; it accrues no further distributions since they are no longer ACTIVE.
- **AC-11**: A member can reverse their own withdrawal (not another member's). The reversal creates an offsetting `Transaction` linked via `reversedTransactionId` and adjusts the withdrawable vault's balance. An already reversed transaction cannot be reversed again. (Reversing a contribution is **AC-14**, below, a contribution can produce zero, one, or several transactions, so it is not reversible by picking a single transaction id.)
- **AC-12**: Any ACTIVE member can view the group's full vault list, contribution history, transaction ledger (filterable by vault), and every member's share; a non member is rejected the same way every other group endpoint already rejects one (via the existing `GroupMembershipGuard`), with zero exception for the platform `ADMIN` role.
- **AC-13**: Every mutating action in this feature (vault creation, contribution, flow rule creation and replace, withdrawal, reversal) is recorded in the existing immutable audit log, attributed to the acting member.
- **AC-14**: A member can reverse their own contribution (not another member's), whether it produced zero, one, or several flow-distribution transactions. The reversal marks the `Contribution` reversed, creates an offsetting `Transaction` (linked via `reversedTransactionId`) for every one of its still-active transactions, adjusts every affected vault balance, and recomputes every active member's share (the reversed contribution's amount drops out of the group's total cumulative contributions). A contribution already reversed cannot be reversed again. A `CONTRIBUTION`-sourced `Transaction` can only be reversed this way, never directly through the single-transaction reverse endpoint (**AC-11**'s endpoint rejects it), so a contribution's distribution is always reversed as one atomic, all-or-nothing unit.

## Decision

**Chosen option**: Option 1: Synchronous, in request, transactional distribution. Recording a contribution, applying every active flow rule, updating vault balances, and recomputing share caches all happen inside one request and one database transaction; nothing is queued or deferred to a background job.

## Rationale

Full reasoning, alternatives, and the product doc open points this settles: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Everything below already exists in `api/prisma/models/` except the two marked NEW.

- `Vault` (id, groupId FK, type `GROUP`/`WITHDRAWABLE`/`PROJECT`, name, memberId FK nullable+unique for withdrawable, projectId FK nullable, cachedBalance, metadata) — `PROJECT` type and `projectId` stay unused until the projects spec.
- `Contribution` (id, groupId FK, memberId FK, amount, transactionId FK nullable+unique, paymentMethodCode FK nullable, contributedAt, metadata, **NEW** `reversedAt` nullable): `reversedAt` set the moment the contribution is reversed (**AC-14**); a non null `reversedAt` excludes the contribution from the group's total cumulative contributions used in every share (`MemberShareCache`) computation.
- `FlowRule` (id, groupId FK, name nullable, sourceType `CONTRIBUTION`/`PROJECT_REVENUE`/`MANUAL_ENTRY`/`OTHER`, active, metadata, createdAt) 1:N `FlowDestination` (id, flowRuleId FK, destinationType `VAULT`/`MEMBER_WITHDRAWABLE_VAULTS`, vaultId FK nullable, percentage). **NEW**: `FlowRule.replacesRuleId` (`String?`, self FK to `FlowRule.id`, nullable): set when this rule was created to replace another.
- `MemberShareCache` (id, groupId, memberId FK unique, percentage to 4 decimals, totalContributed, computedAt) — one row per member, recomputed on every contribution and every contribution reversal.
- `Transaction` (id, groupId FK, vaultId FK, direction `CREDIT`/`DEBIT`, type `CONTRIBUTION`/`INTERNAL_FLOW`/`PROJECT_PAYOUT`/`MANUAL_ENTRY`/`ADJUSTMENT`/`OTHER`/**NEW `WITHDRAWAL`**, sourceType/sourceRefId tracing back to the `Contribution` or the applying `FlowRule`, paymentMethodCode nullable, reversedTransactionId FK nullable self relation, description, createdById FK, metadata, createdAt).

Migration needed: add `WITHDRAWAL` to the `TransactionType` enum (`ALTER TYPE`); add `FlowRule.replacesRuleId` (nullable self FK) plus its index; add `Contribution.reversedAt` (nullable `DateTime`).

**State transitions**:

`FlowRule`: `active` (created) → `inactive` (replaced by a newer rule, which is created `active` with `replacesRuleId` pointing back; a rule is never reactivated).

`Vault.cachedBalance`: mutates only as a side effect of a `Transaction` (`CREDIT` increases it, `DEBIT` decreases it); never written directly.

`Transaction`: `posted` (created) → `reversed` (an offsetting transaction exists via `reversedTransactionId`; the original stays in the ledger, unmodified, forever, matching the audit log's immutability principle).

`MemberShareCache`: recomputed (never soft deleted or historized) every time any active member's total contributed changes, whether by a new contribution or a contribution reversal.

`Contribution`: `active` (created) → `reversed` (`reversedAt` set, **AC-14**; never reactivated, matching every other reversal in this spec).

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /groups/:groupId/vaults | POST | name (req) | vault id, type, cachedBalance | ACTIVE member | 403 not a member |
| /groups/:groupId/vaults | GET | (pagination) | list of vaults with balances | ACTIVE member | 403 not a member |
| /groups/:groupId/vaults/:id | GET | (none) | vault detail + balance | ACTIVE member | 403 not a member, 404 not found |
| /groups/:groupId/contributions | POST | amount (req), paymentMethodCode (opt) | contribution id, amount, resulting transactions | ACTIVE member | 403 not a member, 422 invalid amount |
| /groups/:groupId/contributions | GET | (pagination) | list of contributions | ACTIVE member | 403 not a member |
| /groups/:groupId/contributions/:id/reverse | POST | (none) | contribution id, its offsetting transactions | ACTIVE member, owner of the contribution | 403 not a member or not the owner, 404 not found, 409 already reversed |
| /groups/:groupId/flow-rules | POST | sourceType (req), destinations[] (req, percentages summing to 100) | flow rule id, destinations | ACTIVE member | 403 not a member, 422 percentages don't sum to 100 |
| /groups/:groupId/flow-rules | GET | (pagination) | list of rules (active and replaced) | ACTIVE member | 403 not a member |
| /groups/:groupId/flow-rules/:id/replace | POST | destinations[] (req, new split) | new flow rule id, replacesRuleId | ACTIVE member | 403 not a member, 404 rule not found, 409 rule already replaced |
| /groups/:groupId/shares | GET | (none) | every active member's share percentage | ACTIVE member | 403 not a member |
| /groups/:groupId/transactions | GET | vaultId (opt filter), pagination | list of transactions | ACTIVE member | 403 not a member |
| /groups/:groupId/me/withdraw | POST | amount (req) | transaction id, new balance | ACTIVE member | 403 not a member, 422 insufficient balance |
| /groups/:groupId/transactions/:id/reverse | POST | (none) | reversing transaction id | ACTIVE member, owner of the original | 403 not a member or not the original's owner, 409 already reversed, 422 the transaction is `CONTRIBUTION`-sourced (reverse the contribution instead, via `/contributions/:id/reverse`) |

**Key invariants**:
- A `FlowRule`'s `FlowDestination` percentages always sum to exactly 100%, checked at creation and at replace time.
- A contribution amount is always positive; the group's currency (`Group.currencyCode`) is implicit, contributions carry no separate currency field.
- `Vault.cachedBalance` is always exactly the sum of its `CREDIT` transactions minus its `DEBIT` transactions (including any reversals), recomputable from the ledger at any time as a consistency check.
- Only the withdrawable vault's own member may withdraw from it or reverse their own contribution/withdrawal; no one else can act on another member's entries.
- A `Transaction` can be reversed at most once (`reversedTransactionId` uniqueness on the reversing side prevents a second reversal of the same original).
- A `CONTRIBUTION`-sourced `Transaction` is reversed only as part of reversing its parent `Contribution` (**AC-14**); it is never reversed directly through the single-transaction endpoint, so there is exactly one path to reverse a contribution's distribution, never two that could disagree.
- Reversing a `Contribution` with zero transactions (no flow rule was active when it was recorded, **AC-6**) still sets `reversedAt` and recomputes shares; there is simply nothing to offset in the ledger.
- Applying flow rules, updating balances, and recomputing every active member's share for one contribution all happen inside a single database transaction; a failure partway rolls back the entire contribution, never leaving a partially distributed state.

**Security model**:
- Every endpoint requires ACTIVE group membership via the existing `GroupMembershipGuard`, run in addition to `JwtAuthGuard`; there is no role check beyond ACTIVE membership anywhere in this feature, and zero exception for the platform `ADMIN` role, matching the model spec 0002 already established.
- A member may only record a contribution, request a withdrawal, or reverse a transaction for themselves; ownership is checked against the authenticated member's id, never a client supplied one.
- Read access (vaults, contributions, shares, the ledger) is uniform across every ACTIVE member: full transparency, no member sees less than another, matching the product's explicit anti opacity goal.

**Configuration required**: none. No new environment variables, secrets, or third party credentials.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: a member contributes, an active `CONTRIBUTION` flow rule splits it across a group vault and the members' withdrawable vaults by share, the response shows the resulting transactions and every affected balance updates, verifies **AC-3**, **AC-5**, **AC-7**.
- Failure case: two active `CONTRIBUTION` rules both apply independently to the same contribution, producing two full sets of transactions, verifies **AC-4**.
- Failure case: a withdrawal request for more than the current balance is rejected and creates no transaction, verifies **AC-9**.
- Failure case: reversing an already reversed transaction is rejected with 409, verifies **AC-11**.
- Failure case: reversing a contribution that produced two distribution transactions offsets both and recomputes shares in one call; reversing a contribution that produced zero transactions (no flow rule was active) still sets `reversedAt` and recomputes shares with nothing to offset; reversing an already reversed contribution is rejected with 409; calling the single-transaction reverse endpoint on a `CONTRIBUTION`-sourced transaction is rejected with 422, verifies **AC-14**.
- Auth/permission: a non member calling any endpoint in this feature receives 403, and a member trying to withdraw, reverse another member's transaction, or reverse another member's contribution is rejected, verifies **AC-12**, **AC-11**, **AC-14**.

## Build plan

No project wide build approach is recorded in `AGENTS.md` or the scope header (root `AGENTS.md` does not exist yet), so this plan defaults to end to end (Tracer Bullet) slices, the same assumption spec 0001 and spec 0002 both made: stand up one thin, fully working path (a contribution that gets recorded, distributed, and reflected in a balance and a share) before broadening to rule management, withdrawal, and reversal.

1. Migration: `TransactionType.WITHDRAWAL` enum value, `FlowRule.replacesRuleId` self FK plus index, `Contribution.reversedAt` nullable column, satisfies **AC-8**, **AC-9**, **AC-14**.
2. `VaultsModule`: create a `GROUP` vault, list/get vaults with balance, and auto create the `WITHDRAWABLE` vault the moment a `GroupMember` becomes `ACTIVE` (hook into the existing group join/accept path from spec 0002), satisfies **AC-1**, **AC-2**.
3. `ContributionsModule` end to end thin slice: record a contribution, find every active `CONTRIBUTION` flow rule, apply each independently (percentage split, remainder to the last destination, `MEMBER_WITHDRAWABLE_VAULTS` resolved against the live `MemberShareCache`), write the resulting `Transaction`s, update `cachedBalance`, recompute every active member's `MemberShareCache`, all in one DB transaction, satisfies **AC-3**, **AC-4** (read path), **AC-5**, **AC-6**, **AC-7**.
4. `FlowRulesModule`: create a flow rule (percentage sum validation), and the atomic replace endpoint (deactivate old, create new with `replacesRuleId`), satisfies **AC-4**, **AC-8**.
5. Withdrawal and reversal: `POST /groups/:groupId/me/withdraw` (balance check, `WITHDRAWAL` transaction), `POST /groups/:groupId/transactions/:id/reverse` (ownership check, rejects a `CONTRIBUTION`-sourced transaction, offsetting transaction, balance recompute), satisfies **AC-9**, **AC-10**, **AC-11**.
5a. Contribution reversal: `POST /groups/:groupId/contributions/:id/reverse` (ownership check, 409 if already reversed, offsets every one of the contribution's transactions in one DB transaction whether there are zero, one, or several, sets `reversedAt`, recomputes every active member's share), satisfies **AC-14**.
6. Read surfaces: `GET /groups/:groupId/shares`, `GET /groups/:groupId/transactions` (paginated, `vaultId` filter, reusing `ListQueryDto`), satisfies **AC-12**.
7. Wire `AuditService.log(...)` into every mutating endpoint above (vault creation, contribution, flow rule create/replace, withdrawal, reversal), satisfies **AC-13**.

## Consequences

**Positive**:
- Every downstream feature (projects, project approval votes, the dashboard) gets a working, transparent, fully audited money layer to build on, exactly the same unblocking role spec 0002 played for everything that needed group membership first.
- Resolves two long standing open product questions (flow rule versioning, withdrawal policy) plus the withdrawable balance question spec 0002 explicitly deferred, so nothing downstream inherits an undefined rule.
- No new infrastructure: reuses the existing `AuditService`, `GroupMembershipGuard`, and `ListQueryDto` pagination convention rather than introducing a queue, a second authorization model, or a new pagination shape.

**Negative / tradeoffs**:
- Recomputing every active member's share on every contribution is O(active members) work per contribution; fine at this product's expected group sizes (informal savings groups, not thousands of members), but would need revisiting if a group ever grew far larger than that.
- "Multiple active rules apply independently" (the engineer's explicit choice over dividing the amount between them) means a careless group could configure two `CONTRIBUTION` rules that together distribute more than 100% of a contribution's nominal value across vaults; this is allowed by design (each rule is a full, independent 100% split), but a group misconfiguring two overlapping rules could confuse its own members about where their money "really" went. Nothing in this spec warns the group about that; a future UI could.
- Declarative withdrawal and reversal both mean MIKS's ledger can only ever be as correct as what members choose to declare; the product accepts this tradeoff project wide (see the product doc's own assumed limits), this spec doesn't add new exposure beyond it.

**Neutral**:
- Introduces the project's second and third mutating financial concepts after group membership's vote mechanism: a request scoped database transaction wrapping multiple writes (contribution + N transactions + share recompute), and a self referencing FK pattern (`FlowRule.replacesRuleId`) similar in shape to `Transaction.reversedTransactionId`, which already existed in the schema.

## Follow-up

- [ ] `PROJECT_REVENUE` flow source and `PROJECT` type vaults are explicitly out of scope here; the projects spec should extend `FlowRulesModule`'s dispatch (not duplicate it) the same way spec 0002 already asked a future project voting feature to extend `VotesService`'s dispatch rather than duplicate it.
- [ ] The negative consequence above (overlapping active rules can together distribute more than one full 100% split) has no guard in this spec; worth a product decision on whether to warn or cap it once a UI exists to configure flow rules.
- [ ] Once a project wide `AGENTS.md` records a build approach, reconcile this spec's `## Build plan` ordering against it if different from the assumed end to end default (the same open item spec 0001 and 0002 both carried).
