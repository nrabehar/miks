# API scope

## At a glance

| Feature | Status | Spec |
|---|---|---|
| Authentication | done | [0001](../../specs/api/0001-authentication/index.md) |
| Group membership | done | [0002](../../specs/api/0002-group-membership/index.md) |
| Vaults, contributions, flow rules, and shares | in-progress | [0003](../../specs/api/0003-vaults-contributions-flows/index.md) |

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

## Vaults, contributions, flow rules, and shares (in-progress)

The financial core every group needs: vaults to hold money declarations, recording a contribution, flow rules that automatically split a contribution across vaults the moment it lands, and each member's proportional share. Adds a declared withdrawal action and a way to reverse a mistaken entry. Nothing here moves real money, every entry is a member's own declaration, matching MIKS's rule that the platform never holds funds. `PROJECT_REVENUE` flows and `PROJECT` type vaults wait for the later projects feature (see spec [0003](../../specs/api/0003-vaults-contributions-flows/index.md)).

**Done when:** a member can create a vault, is auto given a withdrawable vault on joining, records a contribution that automatically distributes across every active flow rule, sees their share and the group's full transaction ledger, declares a withdrawal, and reverses their own mistaken entry, all matching the acceptance criteria in spec [0003](../../specs/api/0003-vaults-contributions-flows/index.md).

- [x] Design it (spec): [0003](../../specs/api/0003-vaults-contributions-flows/index.md)
- [ ] Build it: /develop vaults contributions flows and shares
  - [ ] Data model + migration (WITHDRAWAL transaction type, FlowRule.replacesRuleId) — AC-8, AC-9
  - [ ] Vaults: create a group vault, auto create the withdrawable vault on joining — AC-1, AC-2
  - [ ] Contribution recording + automatic flow distribution + share recompute (the core end to end slice) — AC-3, AC-4, AC-5, AC-6, AC-7
  - [ ] Flow rule management: create + atomic replace — AC-4, AC-8
  - [ ] Withdrawal, reversal, ledger/share read surfaces, and audit logging — AC-9, AC-10, AC-11, AC-12, AC-13
- [ ] Verify it: /check verify vaults contributions flows and shares
- [ ] Test it: /test vaults contributions flows and shares

## Deferred

- Mandatory identity verification gate — currently deferred by product decision (account usable immediately); revisit if a future feature needs a "verified only" rule.
- Whether a closed group can ever be reopened — this spec treats closure as terminal, see spec [0002](../../specs/api/0002-group-membership/index.md) Follow-up.
- Platform ADMIN's scope for support/moderation purposes outside group data — group data itself is now fully isolated per spec [0002](../../specs/api/0002-group-membership/index.md), but ADMIN's broader scope is still otherwise undefined.
