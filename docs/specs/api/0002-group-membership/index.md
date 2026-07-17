# 0002. Group membership (creation, invites, leaving, vote based removal, closure)

**Date**: 2026-07-17
**Status**: Accepted

## Summary

This spec designs MIKS's group module: creating a group, inviting and joining it by email, editing its basic details, leaving it, and the two ways a membership can end against someone's will: a formal vote to remove a member, or the last remaining member closing the group outright. The product's own rule is that MIKS imposes no hierarchical role inside a group (no admin, no owner), so every active member has the same rights, and the platform's only formal decision tool, the Vote, is reused (not reinvented) to remove a member. This is a foundational module: contributions, projects, and votes all depend on a group and its members existing first.

## Requirements

**User stories**:
- As a new user, I want to create a group so that my circle has a shared space for cotisations and projects.
- As an active member, I want to invite someone by email so that they can join my group.
- As an invited person, I want to accept an invite so that I become a member without anyone else having to do it for me.
- As an active member, I want to leave a group I no longer want to be part of.
- As an active member, I want to propose removing a disruptive or fraudulent member, decided by a fair vote rather than by one person's say so.
- As the last remaining member, I want to close a group that has run its course.
- As any member, I want total confidence that nobody outside my group, not even a MIKS platform admin, can see or touch my group's data.

**Acceptance criteria** (the contract, each criterion is independently checkable):
- **AC-1**: An authenticated user can create a group (name, description, currency code); the creator becomes its first active `GroupMember` automatically.
- **AC-2**: Any active member can invite a new person by email; this creates a single use, expiring invite and sends it by email (reusing the existing mail delivery).
- **AC-3**: Accepting a valid, unexpired, unconsumed invite creates a new active `GroupMember` for the accepting user, only when the accepting user's own account email matches the invited email.
- **AC-4**: Any active member can revoke a pending invite before it is accepted.
- **AC-5**: An expired, already consumed, or revoked invite token is rejected with a clear, distinct error; a user cannot join twice from the same token.
- **AC-6**: A user's membership in a given group is unique while active (enforced already at the data layer); a user who previously left can rejoin later through a brand new invite, which creates a new `GroupMember` row without altering the old, `LEFT` one.
- **AC-7**: An active member can leave a group voluntarily, except when they are the only remaining active member (blocked, not silently allowed).
- **AC-8**: When exactly one active member remains, that member can close the group directly; a closed group becomes permanently read only (no new invites, members, contributions, projects, or votes), while all of its history stays fully visible to its former members.
- **AC-9**: Any active member other than the target can propose a formal removal vote against another active member, only when the group has at least 2 active members besides the target (so there is at least one eligible voter); its quorum and threshold cannot be set below a fixed floor (a bare majority of eligible, non target active members), so a small group's single other member cannot single handedly remove someone by setting quorum to themselves alone.
- **AC-10**: The targeted member cannot vote on their own removal; everyone else can respond `FOR`, `AGAINST`, or `ABSTAIN` exactly once, the same as a project vote.
- **AC-11**: A removal vote's result (`APPROVED`/`REJECTED`/`INVALID` against its threshold and quorum) is evaluated the first time anyone reads or responds to it after its `scheduledCloseAt` has passed (the same lazy, no background job pattern as invite expiry); once `APPROVED`, the targeted member's status flips to `LEFT`, and their contribution history, share, and withdrawable vault balance stay exactly as they were, untouched and frozen.
- **AC-12**: Any active member can edit the group's name, description, and currency code, as long as the group is not closed.
- **AC-13**: No group's data (group record, membership list, invites, votes) is ever readable or actionable by a user who is not one of its active members, including a platform `ADMIN`; the request is rejected the same way a non member's would be, with no special case for `ADMIN`.
- **AC-14**: Every membership relevant event (group created, invite sent, invite accepted, invite revoked, invite expired, member left, removal vote proposed, removal vote decided, member removed, group closed, group edited) is written to the existing immutable audit log.

## Options considered

See [rationale.md](rationale.md).

## Decision

**Chosen option**: Option 1: Flat membership, no roles, removal only via a generalized Vote.

Every active member has identical rights (invite, edit, propose removal); member removal reuses the existing `Vote`/`VoteResponse` mechanism, generalized from project only to also cover member removal, rather than introducing any ownership role or a second, parallel voting mechanism.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

- `Group` (existing, extended): `id`, `name`, `description?`, `creatorId` (FK `User`, informational only, carries no privilege), `currencyCode`, `metadata`, `createdAt`, **new** `status` (`ACTIVE` | `CLOSED`, default `ACTIVE`), **new** `closedAt` (nullable `DateTime`).
- `GroupMember` (existing, unchanged): `id`, `groupId` FK, `userId` FK, `status` (`ACTIVE` | `LEFT`), `joinedAt`, `leftAt?`, `metadata`. Unique on `(groupId, userId)` while `status = ACTIVE` (already enforced by the existing `@@unique([groupId, userId])`; a `LEFT` row plus a later new `ACTIVE` row for the same pair is a second `GroupMember` record, not a reused one, so this unique constraint needs to move from a plain unique to a partial/application enforced uniqueness scoped to active rows, since Postgres cannot express "unique only when a column has X value" without a partial index).
- `GroupInvite` (new): `id`, `groupId` FK (cascade), `email` (the invited address), `tokenHash` (never store the raw token, mirrors `VerificationToken`'s pattern), `status` (`PENDING` | `ACCEPTED` | `REVOKED` | `EXPIRED`), `invitedByMemberId` FK to `GroupMember`, `expiresAt`, `createdAt`, `acceptedAt?`. Indexed on `tokenHash` and on `(groupId, email, status)` to cheaply reject "already an active member" or "already has a pending invite" before creating a duplicate.
- `Vote` (existing, extended): **new** `subjectType` (`PROJECT` | `MEMBER_REMOVAL`), `projectId` becomes nullable, **new** `groupId` (FK `Group`, always set, direct so a `MEMBER_REMOVAL` vote does not need a project to scope to a group), **new** `targetMemberId` (nullable FK `GroupMember`, set only when `subjectType = MEMBER_REMOVAL`). A migration level `CHECK` constraint enforces exactly one of `projectId` / `targetMemberId` set, matching `subjectType` (`(subject_type = 'PROJECT' AND project_id IS NOT NULL AND target_member_id IS NULL) OR (subject_type = 'MEMBER_REMOVAL' AND target_member_id IS NOT NULL AND project_id IS NULL)`), not left as an application only rule.
- `VoteResponse` (existing, unchanged): `voteId` FK, `memberId` FK, `choice` (`FOR` | `AGAINST` | `ABSTAIN`), unique per `(voteId, memberId)`.

**State transitions**:

`Group.status`: `ACTIVE` → `CLOSED` (only when the last active member closes it; terminal, no reopening in this spec).

`GroupMember.status`: `ACTIVE` → `LEFT` (voluntary leave, or a decided removal vote). A `LEFT` row never transitions back; rejoining creates a new `GroupMember` row via a fresh invite.

`GroupInvite.status`: `PENDING` (created, `expiresAt` in the future) → `ACCEPTED` (consumed once, creates the `GroupMember`) | `REVOKED` (cancelled by a member before acceptance) | `EXPIRED` (`expiresAt` passed, checked at read/accept time, not by a background job).

`Vote.status` (unchanged from existing model): `OPEN` → `APPROVED` | `REJECTED` | `INVALID`, against `approvalThreshold` and `minQuorum`, evaluated lazily (no background job) the first time the vote is read or responded to after `scheduledCloseAt` has passed; for `MEMBER_REMOVAL`, `APPROVED` additionally flips the target `GroupMember.status` to `LEFT` at that same moment.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /groups | POST | name, description?, currencyCode | group id | bearer | 422 invalid currency |
| /groups | GET | (none) | caller's groups (paginated) | bearer | |
| /groups/:id | GET | | group detail | bearer, active member | 403 not a member |
| /groups/:id | PATCH | name?, description?, currencyCode? | updated group | bearer, active member | 403 not a member, 409 group closed |
| /groups/:id/members | GET | | active + left members (paginated) | bearer, active member | 403 not a member |
| /groups/:id/invites | POST | email | invite id | bearer, active member | 403 not a member, 409 already an active member, 409 pending invite exists, 409 group closed |
| /groups/:id/invites | GET | | pending invites (paginated) | bearer, active member | 403 not a member |
| /groups/:id/invites/:inviteId | DELETE | | 204 | bearer, active member | 404 not found, 409 already accepted |
| /invites/:token | GET | | preview (group name, inviter display name, expiry) | public | 404 invalid, expired, or consumed |
| /invites/:token/accept | POST | | new membership id | bearer, email must match invite | 403 email mismatch, 409 expired/consumed/revoked |
| /groups/:id/leave | POST | | 204 | bearer, active member | 403 not a member, 409 last active member |
| /groups/:id/close | POST | | group closed | bearer, active member | 403 not a member, 409 not the last active member |
| /groups/:id/members/:memberId/removal-votes | POST | approvalThreshold, minQuorum, durationHours | vote id | bearer, active member, not the target | 403 not a member, 403 targeting self, 409 open removal vote already exists for this member, 422 quorum/threshold below the mandatory floor, 422 fewer than 2 other active members |
| /votes/:voteId/responses | POST | choice (FOR/AGAINST/ABSTAIN) | 200 | bearer, active member, not the vote's target | 403 target voting on own removal, 409 vote already closed |
| /votes/:voteId | GET | | vote detail, responses tally, status | bearer, active member of the vote's group | 403 not a member |

**Key invariants**:
- A `GroupMember` row for a given `(groupId, userId)` is unique among rows with `status = ACTIVE` (a `LEFT` history row for the same pair can coexist with a later new `ACTIVE` row).
- A group's active member count never reaches zero except through the direct `close` action taken by its last active member; leaving and removal votes are both blocked from producing that outcome.
- A `GroupInvite` is single use: `status` transitions to `ACCEPTED` atomically on first successful accept; a second accept attempt on the same token fails.
- A `Vote` with `subjectType = MEMBER_REMOVAL` always has `targetMemberId` set and `projectId` null; one with `subjectType = PROJECT` always has `projectId` set and `targetMemberId` null (enforced by a `CHECK` constraint, not just application code).
- The member targeted by a `MEMBER_REMOVAL` vote can never hold a `VoteResponse` row for that vote.
- A `MEMBER_REMOVAL` vote's `minQuorum` can never be set below a bare majority of the group's active members excluding the target, and its `approvalThreshold` can never be set below 50%; this floor exists specifically so a 2 member group's sole other member cannot single handedly engineer a removal by setting quorum to just themselves. The proposer may set stricter (higher) values, never looser ones.
- Once `Group.status = CLOSED`, no new `GroupMember`, `GroupInvite`, `Vote`, `Contribution`, or `Project` row can be created for that group; existing rows stay fully readable.
- A member's `Contribution` history, `MemberShareCache` percentage, and withdrawable `Vault` balance are never modified by leaving or being removed; they freeze at their last computed value.

**Security model**:
- A new `GroupMembershipGuard` (in `src/common/guards/`, alongside the existing `JwtAuthGuard`/`RolesGuard` from spec 0001) resolves the caller's `GroupMember` row for the `:id`/`:groupId` in the route and rejects (403) if it is missing or not `ACTIVE`. This guard runs in addition to, never instead of, `JwtAuthGuard`.
- There is no group level role. Every check reduces to "is this caller an active member of this group", with two narrow additional exclusions: a member cannot target themselves in a removal vote, and the vote's target cannot respond to that vote.
- The platform `ADMIN` role (`RolesGuard`/`@Roles('ADMIN')` from spec 0001) grants no access to any group endpoint in this spec; group data isolation has zero exception, including for `ADMIN`. This resolves the product document's own open question about `ADMIN`'s scope for the group domain specifically (see rationale.md).
- Invite acceptance additionally checks that the authenticated caller's `User.email` matches `GroupInvite.email`; a logged in user cannot accept an invite addressed to someone else.
- `GroupInvite.tokenHash` follows the same convention as `VerificationToken.tokenHash`: the raw token is only ever sent by email, never stored or logged.

**Configuration required**:
- `GROUP_INVITE_EXPIRY_DAYS`: how long an invite stays valid before it auto expires, recommended `7`.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: create a group, invite an email, accept the invite as a matching user, list members shows two active members, verifies **AC-1**, **AC-2**, **AC-3**.
- Failure case: two invite accept requests race on the same token; only the first succeeds, the second gets a 409 consumed error, no duplicate `GroupMember` is created, verifies **AC-5**.
- Failure case: the sole remaining active member calls leave; rejected with 409; the same member calls close; group becomes `CLOSED`, verifies **AC-7**, **AC-8**.
- Failure case: a 2 member group's other member tries to propose a removal vote with `minQuorum = 1`; rejected 422 (below the mandatory floor); the same member proposes with the floor value instead, it succeeds, and the target's status only flips to `LEFT` once someone reads or responds to the vote after `scheduledCloseAt`, with their `MemberShareCache` value from just before removal unchanged afterward, verifies **AC-9**, **AC-11**.
- Auth/permission: a user who is not a member of group X calls `GET /groups/X`, gets 403; the same call made by a platform `ADMIN` who is also not a member of X gets the identical 403, verifies **AC-13**.
- Auth/permission: the member targeted by an open removal vote calls `POST /votes/:voteId/responses`, gets 403, verifies **AC-10**.

## Build plan

No project wide build approach is recorded in `AGENTS.md` or a scope header (same gap noted by spec 0001), so this plan defaults to end to end (Tracer Bullet) slices: stand up one thin, fully working path (create a group, join it, see it) before broadening to leave/removal/closure.

1. Add the migration: `Group.status`/`closedAt`; the new `GroupInvite` model; `Vote.subjectType`/`groupId`/`targetMemberId` with `projectId` now nullable, plus its `CHECK` constraint; move `GroupMember`'s `(groupId, userId)` uniqueness to a partial index scoped to `status = ACTIVE`, satisfies **AC-1**, **AC-6**, **AC-9**.
2. Build `src/modules/groups/` core: `POST /groups`, `GET /groups`, `GET /groups/:id`, `PATCH /groups/:id`, creator auto joins as the first `GroupMember`, satisfies **AC-1**, **AC-12**.
3. Add `GroupMembershipGuard` in `src/common/guards/`, applied to every group scoped route from here on, satisfies **AC-13**.
4. Build the invite flow: `POST/GET /groups/:id/invites`, `DELETE /groups/:id/invites/:inviteId`, `GET /invites/:token`, `POST /invites/:token/accept`, reusing the existing mail delivery for sending, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**.
5. Build `GET /groups/:id/members`, `POST /groups/:id/leave` (with the last active member guard), satisfies **AC-6**, **AC-7**.
6. Generalize the `Vote`/`VoteResponse` service to a shared subject type dispatch, and add `POST /groups/:id/members/:memberId/removal-votes`, `POST /votes/:voteId/responses`, `GET /votes/:voteId`, including the self vote exclusion and the auto status flip on `APPROVED`, satisfies **AC-9**, **AC-10**, **AC-11**.
7. Build `POST /groups/:id/close`, gated on active member count == 1, satisfies **AC-8**.
8. Wire audit log entries (`EventCategory.MEMBER`) for every event listed in AC-14, at each of the mutation points built above, satisfies **AC-14**.

## Consequences

**Positive**:
- One consistent authorization model ("active member, no roles") for every group scoped module still to come (contribution, project, flow, transaction); nothing here needs redesigning when those modules are built.
- Generalizing `Vote` now means a future feature (e.g. voting on a flow rule change) plugs into the same mechanism instead of inventing a third one.
- Zero exception group isolation, even for platform `ADMIN`, gives every member a concrete, checkable guarantee that matches the product's core trust pitch.

**Negative / tradeoffs**:
- Every unwanted removal takes a full vote (threshold, quorum, a multi hour or multi day window); there is no fast path for an obvious, unanimous case, by design, since the product explicitly rejects giving anyone unilateral removal power.
- The `Vote` model's `projectId` becoming nullable, plus the new `groupId`/`targetMemberId`/`subjectType` columns, is a real migration against an existing model; any code that already assumed `Vote.projectId` is always present (none exists yet, since no vote controller has been built) would need updating, though today that risk is zero.
- Platform support/moderation has no technical lever inside a group at all (per AC-13); handling abuse (fraud, harassment) currently requires database level intervention, not an in app action. This is a deliberate, documented gap, not an oversight (see rationale.md), and is tracked below.
- A closed group is permanently read only in this spec; there is no reopening path, so a group closed by mistake has no in app recovery.

**Neutral**:
- Introduces one new module, `src/modules/groups/`, and one new shared guard, `GroupMembershipGuard`, following the existing `src/modules/<name>/` and `src/common/guards/` conventions from spec 0001.
- `GroupInvite` follows the same token hash, never store raw, pattern as `VerificationToken`, but is a separate model since it targets an email rather than an existing `User`.

## Follow-up

- [ ] The withdrawal policy for a member's frozen withdrawable vault balance after leaving or removal is still undefined (the product document's own open point 7); this spec preserves the balance but does not define how, or whether, it is ever paid out.
- [ ] Whether a `CLOSED` group can ever be reopened is undecided; this spec treats closure as terminal. Revisit if a real "closed by mistake" case comes up.
- [ ] The platform `ADMIN` role's scope for support/moderation purposes (outside group data, which this spec keeps fully isolated) is still otherwise undefined; the product document's open point 2 is only resolved here for the group domain specifically.
- [ ] A future votes spec should extend the generalized `Vote` service to `PROJECT` subject type endpoints, reusing the dispatch built in task 6 rather than duplicating it.
- [ ] Once built, update `docs/scope/api/scope.md`'s "Deferred: Per group authorization" line, since this spec designs it.
- [ ] Once a project wide `AGENTS.md` records a build approach, reconcile the `## Build plan` ordering above against it if different from the assumed end to end default (same open item spec 0001 already flags).
- [ ] The product document (section 5, on votes) frames the Vote mechanism as exclusively for project approval; this spec deliberately extends it to member removal too (see rationale.md), which is a conscious broadening, not a literal reading of that section. Worth a quick confirmation with the product owner that this extension is welcome.
- [ ] Invite acceptance matches on `User.email`; a user with no email on their account (only possible if a phone only or OAuth-without-email path exists) cannot accept an invite. Not reachable today since phone registration is deferred (spec 0001) and OAuth already requires a verified email, but revisit if phone auth returns.
