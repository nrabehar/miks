# 0001. Authentication (JWT access/refresh, email/phone/OAuth login, device sessions)

**Date**: 2026-07-15
**Status**: In Progress

## Summary

This spec designs the authentication module for the MIKS API. A user will be able to sign up and log in with an email and password, a phone number and password, or an OAuth provider (Google, Facebook, Apple). Every login gives back a short lived access token and a longer lived refresh token, both usable from the web app (as secure cookies) and later from a mobile app (as a header). Passwords are hashed with argon2 (a modern, OWASP recommended hashing algorithm), repeated failed logins temporarily lock the account, and a user can see and revoke their own active sessions. This spec also lays down the reusable "am I logged in / am I an admin" building blocks (guards) that every future module will plug into.

## Context

MIKS has no working authentication yet. The Prisma schema already models `User`, `AuthProvider`, `UserIdentity`, `VerificationToken`, `Device`, and `Session`, and the API configuration already reads JWT secrets and expiry settings, but no NestJS module reads or writes any of it. Every other planned feature (groups, contributions, votes) depends on knowing who is making a request, so this is a hard prerequisite that has to be settled before feature modules can be built.

The product targets Madagascar and similar markets first (see the product doc), where phone number based identity and WhatsApp are often more reliable reach channels than email. The team also intends to ship a mobile app later, so the authentication mechanism cannot assume a browser (cookies alone are not viable for a native app).

The account model deliberately trades some safety for less friction: an account is usable immediately after registration, and verification of the identifier (email or phone) happens after the fact rather than gating access. This means downstream modules that require a verified identity (if any ever do) must check verification status themselves; this spec only records that the identity's verification flag exists and can be set.

## Requirements

**User stories**:
- As a new user, I want to sign up with my email, my phone number, or a social account, so that I can start using MIKS without extra friction.
- As a returning user, I want to log in and stay logged in across a long session, so that I do not have to re-authenticate constantly.
- As a user, I want to reset my password if I forget it, so that I am not locked out of my account permanently.
- As a security conscious user, I want to see which devices are logged into my account and be able to log any of them out, so that I can react if my account is compromised.
- As the platform, I want repeated failed logins to temporarily lock an identity, so that password guessing attacks are slowed down.
- As a future mobile app, I want to authenticate against the same endpoints as the web app, so that the backend does not need a parallel auth system later.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A user can register with email + password, phone + password, or an OAuth provider (Google, Facebook, or Apple); this creates a `User` and a matching `UserIdentity`.
- **AC-2**: A registered user can log in with correct credentials and receives an access token (15 minutes) and a refresh token (30 days).
- **AC-3**: A newly registered account is usable immediately, without requiring email or phone verification first.
- **AC-4**: A user can request a password reset; a single use token or code is sent to their email (via Resend) or phone (via WhatsApp), and resetting the password with a valid token succeeds.
- **AC-5**: Logging in via an OAuth provider whose verified email matches an existing account automatically links the new identity to that account instead of creating a duplicate account.
- **AC-6**: Refresh tokens rotate on every use (the old one becomes invalid); replaying an already rotated refresh token revokes the session it belonged to.
- **AC-7**: After 5 failed login attempts on the same identity (email or phone + password), that identity is locked for 15 minutes; a subsequent successful login resets the failure counter.
- **AC-8**: Verification, password reset, and OTP messages are delivered by email (Resend) when the identifier is an email, or by WhatsApp (Cloud API) when the identifier is a phone number.
- **AC-9**: A logged in user can list their own active sessions (device type, IP, last activity) and revoke any one of them individually; revoking a session immediately invalidates its refresh token.
- **AC-10**: Using an expired or already consumed verification or reset token returns a clear, distinct error, and the user can immediately request a new token, which invalidates any previous unconsumed one for the same purpose.
- **AC-11**: The same endpoints authenticate both a web caller (via httpOnly cookies) and a future mobile caller (via an `Authorization: Bearer` header), through one shared guard.
- **AC-12**: An endpoint can be restricted to the `ADMIN` application role through a reusable guard and decorator, independent of any per group authorization (which is out of scope here).

## Decision

**Chosen option**: Option 1: Self hosted authentication with NestJS, Passport.js, and JWT

Build authentication directly on the existing Prisma schema using `@nestjs/passport` strategies (local, JWT, Google, Facebook, Apple), argon2 for password hashing, and a shared `JwtAuthGuard` / `RolesGuard` pair in `src/common/`.

## Rationale

Full reasoning, alternatives, and references: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

The existing schema (`api/prisma/models/account.prisma`) already covers this feature almost completely. One migration is needed:

- `UserIdentity.failedAttempts`: `Int`, default `0`, not null. Counts consecutive failed login attempts for this identity.
- `UserIdentity.lockedUntil`: `DateTime`, nullable. When set and in the future, login attempts against this identity are rejected regardless of password correctness.

Everything else is used as is:
- `User` (id, email?, phone?, displayName, role, metadata) — one row per person, `email`/`phone` unique when present.
- `AuthProvider` (code, category `LOCAL`/`OAUTH`) — seed rows: `local` (LOCAL), `google`, `facebook`, `apple` (OAUTH). Reference data, not user editable.
- `UserIdentity` (userId FK, providerCode FK, identifier, secretHash, providerAccountId, accessToken/refreshToken for OAuth, emailVerified, failedAttempts, lockedUntil) — one row per login method per user; unique on `(providerCode, providerAccountId)` and `(providerCode, identifier)`.
- `VerificationTokenPurpose` (code) — seed rows: `EMAIL_VERIFICATION`, `PHONE_VERIFICATION`, `PASSWORD_RESET`.
- `VerificationToken` (userId FK, purposeCode FK, identityId FK?, sentTo, tokenHash, attempts, maxAttempts, expiresAt, consumedAt) — single use tokens/OTPs for verification and reset.
- `Device` (userId FK, type, deviceId, pushToken, status) — one row per physical device/browser a user has logged in from.
- `Session` (userId FK, deviceId FK?, refreshToken, userAgent, ip, expiresAt, revokedAt) — one row per active login; `refreshToken` is rotated on every `/auth/refresh` call (the row is updated in place, not replaced), so this is a live token, not a token history table.

**State transitions**:

`UserIdentity` lock state: `unlocked` (failedAttempts < 5) → `locked` (failedAttempts reaches 5, lockedUntil = now + 15 minutes) → `unlocked` (lockedUntil passes, or a correct login resets failedAttempts to 0).

`Session` lifecycle: `active` (created at login) → `rotated` (refreshToken replaced on `/auth/refresh`, same row) → `revoked` (revokedAt set, by explicit logout, explicit session revocation, or detected refresh token reuse).

`VerificationToken` lifecycle: `pending` (created, expiresAt in future, consumedAt null) → `consumed` (consumedAt set, single use) or `expired` (expiresAt passed) → a new token replaces it on resend, the old one's remaining attempts are set to 0 so it can no longer be consumed.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /auth/register | POST | identifier (email or phone), password, displayName | user id, access+refresh tokens | public | 409 identifier taken, 422 invalid password |
| /auth/login | POST | identifier, password | access+refresh tokens (cookies + body) | public | 401 invalid credentials, 423 locked |
| /auth/refresh | POST | refresh token (cookie or body) | new access+refresh tokens | refresh token | 401 invalid/expired, revokes session on reuse of a rotated token |
| /auth/logout | POST | (none, uses current session) | 204 | bearer/cookie | 401 not authenticated |
| /auth/verify | POST | token or OTP code | 200 verified | public | 400 expired, 409 already consumed |
| /auth/resend-verification | POST | identifier | 202 accepted | public | 429 rate limited |
| /auth/forgot-password | POST | identifier | 202 accepted (always, to avoid leaking which identifiers exist) | public | 429 rate limited |
| /auth/reset-password | POST | token, new password | 200 reset | public | 400 expired/invalid, 409 already consumed |
| /auth/google, /auth/facebook, /auth/apple | GET | (provider redirect) | redirect to provider | public | 500 provider misconfigured |
| /auth/google/callback, /auth/facebook/callback, /auth/apple/callback | GET | provider code | access+refresh tokens, redirect to web app | public (provider signed) | 401 provider denied/invalid |
| /auth/me | GET | (none) | current user's id, email/phone, displayName, role | bearer/cookie | 401 not authenticated |
| /auth/sessions | GET | (none) | list of the caller's sessions (id, device, ip, lastActiveAt, current flag) | bearer/cookie | 401 not authenticated |
| /auth/sessions/:id | DELETE | session id | 204 | bearer/cookie, ownership | 403 not your session, 404 not found |

**Key invariants**:
- One `UserIdentity` per `(providerCode, identifier)` and per `(providerCode, providerAccountId)` (already enforced by unique constraints).
- A `Session.refreshToken` is unique and always reflects the current, not yet used, refresh token for that session; rotating it updates the same row.
- `UserIdentity.failedAttempts` only increments on a wrong password against an existing, unlocked identity; it resets to 0 on the next successful login.
- An OAuth identity is only auto linked to an existing account when the provider asserts the email is verified; unverified provider emails require registering a new account instead.
- A `VerificationToken` can be consumed at most once (`consumedAt` set atomically on first successful use) and only while `attempts < maxAttempts` and `expiresAt` is in the future.

**Security model**:
- `JwtAuthGuard` (in `src/common/guards/`) validates the access token from either the `access_token` httpOnly cookie (web) or an `Authorization: Bearer` header (mobile), attaching the resolved `User` to the request. Applied by default to any route not explicitly marked `@Public()`.
- `RolesGuard` + `@Roles('ADMIN')` decorator (also in `src/common/`) restrict specific endpoints to the platform `ADMIN` role. This is the only authorization rule this spec defines; per group authorization (who can act inside a given group) is explicitly out of scope and will be designed with the group module.
- A user may only read or revoke their own sessions (`/auth/sessions*`); ownership is checked against the authenticated user's id, not passed in by the client.
- Passwords are hashed with argon2id (never stored or logged in plain text); tokens are hashed (`tokenHash`) before storage, never stored raw.
- All `/auth/*` mutating endpoints are rate limited (see Configuration) to slow down credential stuffing and OTP abuse.
- No PII beyond what the schema already stores (email, phone, display name) is introduced by this spec.

**Configuration required**:
- `JWT_ACCESS_SECRET`: signs and verifies access tokens (already present in `.env.example`).
- `JWT_REFRESH_SECRET`: signs and verifies refresh tokens (read by `configuration.ts` today but missing from `.env.example`; this spec formalizes it as required).
- `JWT_ACCESS_EXPIRES_IN`: access token lifetime, recommended `15m`.
- `JWT_REFRESH_EXPIRES_IN`: refresh token lifetime, recommended `30d`.
- `AUTH_LOCKOUT_MAX_ATTEMPTS`: failed attempts before lock, recommended `5`.
- `AUTH_LOCKOUT_DURATION_MINUTES`: lock duration, recommended `15`.
- `RESEND_API_KEY`, `RESEND_DOMAIN`: email delivery for verification/reset (Resend; `RESEND_DOMAIN` already read by config but missing from `.env.example`).
- `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`: WhatsApp Business Cloud API credentials for phone based OTP/verification/reset delivery.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`: Google OAuth.
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL`: Facebook OAuth.
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_CALLBACK_URL`: Sign in with Apple.
- `COOKIE_DOMAIN`, `COOKIE_SECURE`: cookie scoping for the access/refresh cookies across environments.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: register by email, log in, call `/auth/me`, call `/auth/refresh`, call `/auth/logout`, verifies **AC-1**, **AC-2**, **AC-3**, **AC-11**.
- Failure case: 5 consecutive wrong passwords lock the identity, a 6th attempt (even correct) is rejected until the lock expires, verifies **AC-7**.
- Failure case: replaying a refresh token that was already rotated revokes the session, a subsequent refresh with either token fails, verifies **AC-6**.
- Auth/permission: a user calling `DELETE /auth/sessions/:id` on another user's session id receives 403, verifies **AC-9**.
- Auth/permission: a non admin user calling an `@Roles('ADMIN')` endpoint receives 403, verifies **AC-12**.

## Build plan

No project wide build approach is recorded yet in `AGENTS.md` or a scope file (none exist), so this plan defaults to end to end (Tracer Bullet) slices: stand up one thin, fully working login path first, then broaden to the remaining methods and features. This assumption should be confirmed once a project wide `AGENTS.md` exists.

1. [x] Add the `UserIdentity.failedAttempts` / `lockedUntil` migration; seed `AuthProvider` (`local`, `google`, `facebook`, `apple`), `VerificationTokenPurpose` (`EMAIL_VERIFICATION`, `PHONE_VERIFICATION`, `PASSWORD_RESET`), satisfies **AC-7**. Migration and seed applied and confirmed live 2026-07-15 (via `/check verify`).
2. [x] Build `src/lib/auth-token/` (token service: sign/verify access + refresh JWTs, cookie helpers) and `src/lib/password/` (argon2 hash/verify), as `@Global()` infra modules per the project's convention, satisfies **AC-2**, **AC-6**.
3. [x] Build `src/modules/auth/` with `LocalStrategy` + `POST /auth/register` + `POST /auth/login`, wiring lockout checks, satisfies **AC-1** (email + phone locally), **AC-3**, **AC-7**. (Path is `src/modules/auth/`, plural, matching the `$/*` alias already in `tsconfig.json`; this spec and `CLAUDE.md` said `src/module/`, singular — flagging for `/sync` to reconcile.)
4. [x] Add `JwtStrategy` + `JwtAuthGuard` + `RolesGuard` + `@CurrentUser()`/`@Roles()` decorators in `src/common/`, plus `GET /auth/me`, satisfies **AC-11**, **AC-12**.
5. [x] Add `POST /auth/refresh` with rotation and reuse detection, and `POST /auth/logout`, satisfies **AC-6**.
6. [x] Build `src/lib/mail/` (Resend) and `src/lib/whatsapp/` (WhatsApp Cloud API), behind one `NotificationDeliveryService` interface keyed by identifier type, satisfies **AC-8**.
7. [x] Add verification flow: `POST /auth/verify`, `POST /auth/resend-verification`, satisfies **AC-10**.
8. [x] Add password reset flow: `POST /auth/forgot-password`, `POST /auth/reset-password`, satisfies **AC-4**, **AC-10**. (Verification/reset codes are 6 digit, sha256 hashed for direct lookup, 15 minute expiry; `VerificationToken.attempts` is not incremented since a direct hash lookup makes per row retry counting moot, noted for a future revisit if brute force protection on the code itself is wanted.)
9. [x] Add `GET /auth/sessions`, `DELETE /auth/sessions/:id`, with ownership checks, satisfies **AC-9**.
10. [x] Add `GoogleStrategy`, `FacebookStrategy`, `AppleStrategy` plus their `GET /auth/:provider` and `GET /auth/:provider/callback` routes, including the auto link on verified email match, satisfies **AC-1** (OAuth), **AC-5**. (Apple's callback is `POST`, not `GET`, matching Apple's own `form_post` response mode; not yet run against real provider credentials, see Follow-up.)
11. [x] Add `ThrottlerModule` rate limiting on `/auth/*`, tuned tighter for `/auth/login`, `/auth/forgot-password`, `/auth/resend-verification`.

## Consequences

**Positive**:
- One shared `JwtAuthGuard` / `RolesGuard` pair every future module (group, project, vote, contribution) can reuse without redesigning authentication.
- Supports web (cookies) and a future mobile app (Bearer header) from day one, avoiding a costly rework when the mobile app arrives.
- Immediate account usability (no verification gate) keeps signup friction low, matching the product's cold start concern already flagged in the product docs.

**Negative / tradeoffs**:
- Three OAuth providers (Google, Facebook, Apple) plus WhatsApp Cloud API integration is a wide surface for a first version; more to configure and test than a single provider MVP would need.
- Deferred verification means an unverified account can act in the system; any feature that later needs a "verified only" rule must add its own check, since this spec does not gate access on it.
- Session based refresh token rotation adds a small amount of write load on every token refresh (an update per `Session` row every ~15 minutes per active user).
- WhatsApp Business Cloud API requires an approved Meta Business account, message templates, and phone number registration before any OTP can be sent; this is an external, non code dependent setup step.

**Neutral**:
- Introduces two new `@Global()` infra modules (`auth-token`, `password`) plus a `whatsapp` delivery module, following the project's existing `src/lib/<name>/` convention.
- The lockout fields live on `UserIdentity`, not `User`, so a user with both an email and a phone identity can have one locked while the other still works; this is intentional (see rationale.md) but worth remembering when debugging a "locked out" report.

## Follow-up

- [ ] No `docs/scope/` exists yet in this repo; this spec is not currently linked to a buildable scope feature. Consider running `/scope` to enroll an "Authentication" feature and link it to this spec before `/develop` begins.
- [ ] `.env.example` in `api/` is missing `NODE_ENV`, `JWT_REFRESH_SECRET`, and `RESEND_DOMAIN`, which are already read by `configuration.ts`; add them, plus every new variable listed under Configuration required, before implementation starts.
- [ ] Apple Sign In requires an Apple Developer account, a Services ID, and a private key generated ahead of time; this is an external prerequisite, not a code task.
- [ ] WhatsApp Business Cloud API requires a verified Meta Business account, a registered phone number, and approved message templates for OTP/verification/reset texts; start this setup early, it is not instantaneous.
- [ ] Once a project wide `AGENTS.md` records a build approach (Tracer Bullet, Skateboard, Facade, Journey, or a variant), reconcile the `## Build plan` ordering above against it if different from the assumed end to end default.

## Rationale

See [rationale.md](rationale.md) for the full context, options considered, and references.
