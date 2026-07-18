# API scope

## At a glance

| Feature | Status | Spec |
|---|---|---|
| Authentication | done | [0001](../../specs/api/0001-authentication/index.md) |
| Group membership | done | [0002](../../specs/api/0002-group-membership/index.md) |
| Vaults, contributions, flow rules, and shares | done | [0003](../../specs/api/0003-vaults-contributions-flows/index.md) |
| Projects | done | [0004](../../specs/api/0004-projects/index.md) |
| Member notifications | in-progress | [0005](../../specs/api/0005-member-notifications/index.md) |

## Authentication (done)

Sign up and log in with email + password or OAuth (Google, Facebook), backed by JWT access/refresh tokens usable from both the web app (cookies) and a future mobile app (Bearer header). Includes password reset, account lockout after repeated failed logins, session/device listing and revocation, and the reusable auth guards other modules will depend on. Phone + password and Apple OAuth are deferred (see spec [0001](../../specs/api/0001-authentication/index.md)'s 2026-07-17 addendum).

**Done when:** a user can register, log in, refresh their session, reset a forgotten password, see and revoke their own active sessions, and every endpoint correctly rejects unauthenticated or wrong role callers, all matching the acceptance criteria in spec [0001](../../specs/api/0001-authentication/index.md).

- [x] Design it (spec): [0001](../../specs/api/0001-authentication/index.md)
- [x] Build it: /develop authentication — code in `api/src/modules/auth`, `api/src/lib/auth-token`, `api/src/lib/password`, `api/src/lib/mail`, `api/src/lib/notification-delivery`, `api/src/common/guards`
  - [x] Data model + reference seeds (lockout fields, AuthProvider/VerificationTokenPurpose rows) — AC-7
  - [x] Local auth core: register, login, lockout, JWT issuing (`src/lib/auth-token`, `src/lib/password`, `src/modules/auth`) — AC-1, AC-2, AC-3, AC-7
  - [x] Shared guards: JwtAuthGuard, RolesGuard, decorators in `src/common` — AC-11, AC-12
  - [x] Refresh rotation, logout, session listing/revocation — AC-6, AC-9
  - [x] Verification + password reset delivery (email via Resend) — AC-4, AC-8, AC-10. (WhatsApp/phone delivery removed 2026-07-17, deferred, see spec addendum.)
  - [x] OAuth providers: Google, Facebook, with account auto linking, plus /auth/* rate limiting — AC-1 (OAuth), AC-5 (built 2026-07-17, now with real Google/Facebook client keys configured; Apple removed 2026-07-17, deferred, see spec addendum)
- [x] Verify it: /check verify authentication (full pass 2026-07-17: local auth core, lockout incl. reset-after-window, email verification/reset delivery incl. expired-token case, session ownership, rate limiting, and the ADMIN role guard all directly re-exercised live; OAuth redirect leg confirmed live against real Google/Facebook client IDs, full consent completion user-attested)
- [x] Test it: /test authentication (local auth core slice tested 2026-07-15: 67 tests across PasswordService, TokenService, AuthService, guards, decorators, RegisterDto, AuthController; OAuth slice tested 2026-07-17: 32 more tests across the 3 strategies (incl. the /debug boot-crash regression test), the 3 OAuth guards, AuthService.validateOAuthLogin auto-link/create paths, and the new oauth config block; VerificationService tested 2026-07-17: 15 more tests covering the expired/consumed/valid token paths (AC-10), request-verification/request-password-reset invalidate-and-resend behavior (AC-4, AC-8), and the reset-password happy path, closing the last untested file in the module. 114 total, all passing)

## Group membership (done)

Create a group, invite and join it by email, edit its basic details, leave it, and the two ways a membership can end against someone's will: a formal vote to remove a member, or the last remaining member closing the group outright. MIKS imposes no hierarchical role inside a group, so every active member has the same rights, and group data is fully isolated, with zero exception even for a platform admin. This is a foundational module: contributions, projects, and votes all depend on a group and its members existing first.

**Done when:** a user can create a group, invite someone by email, have them accept and join, leave a group, propose and carry out a fair vote based removal of another member, and close a group as its last member, all matching the acceptance criteria in spec [0002](../../specs/api/0002-group-membership/index.md), with group data completely inaccessible to any non member.

- [x] Design it (spec): [0002](../../specs/api/0002-group-membership/index.md)
- [x] Build it: /develop group membership — code in `api/src/modules/groups`, `api/src/lib/audit`, `api/src/common/guards/group-membership.guard.ts`
  - [x] Data model + core group CRUD (create, list, edit) — AC-1, AC-6, AC-9, AC-12
  - [x] Membership guard + invite by email flow (send, revoke, accept) — AC-2, AC-3, AC-4, AC-5, AC-13
  - [x] Member listing + voluntary leave (blocked for the last active member) — AC-6, AC-7
  - [x] Generalized Vote mechanism + member removal flow (propose, respond, lazy close, quorum floor) — AC-9, AC-10, AC-11
  - [x] Group closure by the last active member + audit logging of every membership event — AC-8, AC-14
- [x] Verify it: /check verify group membership (re-run after /debug's fix; the mail-delivery-failure bug is confirmed gone, no orphaned invite on a failed send, retry no longer hits a false 409)
- [x] Test it: /test group membership

## Vaults, contributions, flow rules, and shares (done)

The financial core every group needs: vaults to hold money declarations, recording a contribution, flow rules that automatically split a contribution across vaults the moment it lands, and each member's proportional share. Adds a declared withdrawal action and a way to reverse a mistaken entry. Nothing here moves real money, every entry is a member's own declaration, matching MIKS's rule that the platform never holds funds. `PROJECT_REVENUE` flows and `PROJECT` type vaults wait for the later projects feature (see spec [0003](../../specs/api/0003-vaults-contributions-flows/index.md)).

**Done when:** a member can create a vault, is auto given a withdrawable vault on joining, records a contribution that automatically distributes across every active flow rule, sees their share and the group's full transaction ledger, declares a withdrawal, and reverses their own mistaken entry, all matching the acceptance criteria in spec [0003](../../specs/api/0003-vaults-contributions-flows/index.md).

- [x] Design it (spec): [0003](../../specs/api/0003-vaults-contributions-flows/index.md)
- [x] Build it: /develop vaults contributions flows and shares — code in `api/src/modules/vaults`, hooks in `api/src/modules/groups/groups.service.ts` and `api/src/modules/groups/invites.service.ts`
  - [x] Data model + migration (WITHDRAWAL transaction type, FlowRule.replacesRuleId, Contribution.reversedAt, FlowDestination.sortOrder) — AC-8, AC-9, AC-14
  - [x] Vaults: create a group vault, auto create the withdrawable vault on joining — AC-1, AC-2
  - [x] Contribution recording + automatic flow distribution + share recompute (the core end to end slice) — AC-3, AC-4, AC-5, AC-6, AC-7
  - [x] Flow rule management: create + atomic replace — AC-4, AC-8
  - [x] Withdrawal, transaction reversal, contribution level reversal, ledger/share read surfaces, and audit logging — AC-9, AC-10, AC-11, AC-12, AC-13, AC-14
- [x] Verify it: /check verify vaults contributions flows and shares
- [x] Test it: /test vaults contributions flows and shares (63 new tests across vaults.service, shares.service, flow-rules.service, contributions.service, transactions.service, and the 4 controllers, plus 2 assertions added to groups.service.spec.ts and invites.service.spec.ts for the auto vault creation hook)

## Projects (done)

Lets any active member propose a project (its own budget, its own vaults, its own flow rules), have the group approve or reject it by formal vote, then run the project's own income and spending until it is closed. This is what specs [0001](../../specs/api/0001-authentication/index.md) through [0003](../../specs/api/0003-vaults-contributions-flows/index.md) built the foundation for: the `Project`, `Vote` (PROJECT subject), and PROJECT vault/flow rule pieces were already anticipated in the schema and explicitly deferred here until this feature.

**Done when:** a member can submit a project, have the group vote on it, see it activated (budget withdrawn and credited into the project) once approved and funded, declare and reverse the project's own revenue and expense entries, close it with remaining balances settled, and view its full financial history, all matching the acceptance criteria in spec [0004](../../specs/api/0004-projects/index.md), with the same group data isolation the rest of the API already enforces.

- [x] Design it (spec): [0004](../../specs/api/0004-projects/index.md)
- [x] Build it: /develop projects — code in `api/src/modules/projects`, `api/src/modules/votes` (new, extracted from groups), `api/src/modules/groups/member-removal-vote.resolver.ts` + `removal-votes.service.ts`, `api/src/modules/vaults/flow-rules.service.ts` (generalized)
  - [x] Schema addition (PROJECT_EXPENSE flow source type, Project.payoutVaultId) and the shared VotesModule extraction (resolver registry, carrying over the existing MEMBER_REMOVAL test coverage) — AC-13
  - [x] Project submission, the group's default vote configuration, and the vote driven approval/activation flow (including the APPROVED-but-underfunded lazy retry and concurrency guard) — AC-1, AC-2, AC-3, AC-4
  - [x] Project financial entries: revenue and expense declarations plus reversal — AC-5, AC-6, AC-7
  - [x] Project closure (leaves any remaining vault balance as-is per engineer decision during build, never liquidated automatically) and the read surfaces (list/get, ledger) — AC-8, AC-9
  - [x] Audit logging (split across FINANCIAL/VOTE/PROJECT categories) and authorization on every new route — AC-10, AC-12. Member notifications (AC-11) are not wired: no generic per-member, preference-respecting notification delivery exists anywhere in the codebase yet (only invite emails via a dedicated mail path), matching the same pre-existing gap already left open by group membership's vote/removal events and vaults' contribution events.
- [x] Verify it: /check verify projects (full pass 2026-07-18: submission validation, vote resolution APPROVED/REJECTED/INVALID+reopen, activation payout with dual concurrency guards, underfunded lazy retry, revenue/expense distribution with insufficient-balance guard, entry reversal, closure with balance left as-is, read/ledger surfaces, and group isolation all directly re-exercised live against a real running server and DB; a real payoutVaultId-not-persisted bug found and fixed during this pass)
- [x] Test it: /test projects (316 tests across the new projects module, the extracted votes module, vote-config, and the generalized flow-rules distribution, all passing; includes a regression test for the payoutVaultId bug /check verify found and fixed)

## Deferred

- Mandatory identity verification gate — currently deferred by product decision (account usable immediately); revisit if a future feature needs a "verified only" rule.
- Whether a closed group can ever be reopened — this spec treats closure as terminal, see spec [0002](../../specs/api/0002-group-membership/index.md) Follow-up.
- Platform ADMIN's scope for support/moderation purposes outside group data — group data itself is now fully isolated per spec [0002](../../specs/api/0002-group-membership/index.md), but ADMIN's broader scope is still otherwise undefined. (Spec [0005](../../specs/api/0005-member-notifications/index.md) grants ADMIN one narrow read only exception, notification access, without settling this broader question.)

## Member notifications (in-progress)

Closes the notification gap left open by group membership, vaults, and projects: a member is now told, by email and an in app entry, when they are removed from a group, a group closes, a vote opens or resolves, a contribution lands (debounced into one 15 minute summary), or a project is submitted, activated, or closed. Delivery runs through a background job queue (BullMQ on Redis) so a slow or failing send never blocks the request that triggered it, and members can turn any event type off.

**Done when:** a member sees a paginated list of their own notifications with an unread count, can mark one or all as read, can enable or disable each notification type, and every event in scope reliably triggers the right notification unless disabled, all matching the acceptance criteria in spec [0005](../../specs/api/0005-member-notifications/index.md).

- [x] Design it (spec): [0005](../../specs/api/0005-member-notifications/index.md)
- [ ] Build it: /develop member notifications
  - [ ] Data model migration + Redis/BullMQ infrastructure (NotificationsModule, queue registration) — AC-5, AC-6, AC-7
  - [ ] End to end delivery slice (notify service, delivery processor with retry/backoff and audit logging) wired to one event first, then read + preference surfaces — AC-1, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-12
  - [ ] Extend triggers across group, vote, and project events — AC-1, AC-2, AC-4
  - [ ] Contribution debounce (delayed, deduplicated summary job) and the ADMIN read override — AC-3, AC-10, AC-11
- [ ] Verify it: /check verify member notifications
- [ ] Test it: /test member notifications
