# API scope

## At a glance

| Feature | Status | Spec |
|---|---|---|
| Authentication | in-progress | [0001](../../specs/api/0001-authentication/index.md) |

## Authentication (in-progress)

Sign up and log in with email + password, phone + password, or OAuth (Google, Facebook, Apple), backed by JWT access/refresh tokens usable from both the web app (cookies) and a future mobile app (Bearer header). Includes password reset, account lockout after repeated failed logins, session/device listing and revocation, and the reusable auth guards other modules will depend on.

**Done when:** a user can register, log in, refresh their session, reset a forgotten password, see and revoke their own active sessions, and every endpoint correctly rejects unauthenticated or wrong role callers, all matching the acceptance criteria in spec [0001](../../specs/api/0001-authentication/index.md).

- [x] Design it (spec): [0001](../../specs/api/0001-authentication/index.md)
- [ ] Build it: /develop authentication — code in `api/src/modules/auth`, `api/src/lib/auth-token`, `api/src/lib/password`, `api/src/lib/mail`, `api/src/lib/whatsapp`, `api/src/lib/notification-delivery`, `api/src/common/guards`
  - [x] Data model + reference seeds (lockout fields, AuthProvider/VerificationTokenPurpose rows) — AC-7
  - [x] Local auth core: register, login, lockout, JWT issuing (`src/lib/auth-token`, `src/lib/password`, `src/modules/auth`) — AC-1, AC-2, AC-3, AC-7
  - [x] Shared guards: JwtAuthGuard, RolesGuard, decorators in `src/common` — AC-11, AC-12
  - [x] Refresh rotation, logout, session listing/revocation — AC-6, AC-9
  - [x] Verification + password reset delivery (email via Resend, phone via WhatsApp Cloud API) — AC-4, AC-8, AC-10
  - [ ] OAuth providers: Google, Facebook, Apple, with account auto linking — AC-1 (OAuth), AC-5
- [ ] Verify it: /check verify authentication (local auth core and email verification/reset delivery verified 2026-07-15; WhatsApp/phone delivery blocked, no WHATSAPP_API_KEY configured; OAuth not yet built)
- [x] Test it: /test authentication (local auth core slice tested 2026-07-15: 67 tests across PasswordService, TokenService, AuthService, guards, decorators, RegisterDto, AuthController; verification/reset delivery, MailService, WhatsappService, NotificationDeliveryService, VerificationService not yet tested)

## Deferred

- Per group authorization (who can act inside a given group) — explicitly out of scope for spec 0001, to be designed alongside the group module.
- Mandatory identity verification gate — currently deferred by product decision (account usable immediately); revisit if a future feature needs a "verified only" rule.
