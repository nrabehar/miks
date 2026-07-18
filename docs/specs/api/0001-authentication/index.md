# 0001. Authentication (JWT access/refresh, email + Google/Facebook OAuth login, device sessions)

**Date**: 2026-07-15 (scope trimmed 2026-07-17, device tracking addendum 2026-07-18)
**Status**: Accepted

## Summary

This spec designs the authentication module for the MIKS API. A user can sign up and log in with an email and password, or an OAuth provider (Google or Facebook). Every login gives back a short lived access token and a longer lived refresh token, both usable from the web app (as secure cookies) and later from a mobile app (as a header). Passwords are hashed with argon2 (a modern, OWASP recommended hashing algorithm), repeated failed logins temporarily lock the account, and a user can see and revoke their own active sessions. This spec also lays down the reusable "am I logged in / am I an admin" building blocks (guards) that every future module will plug into.

**2026-07-18 addendum**: session listing now identifies the actual physical device behind each session (not just a raw browser string), reuses that device's existing session on reconnect instead of piling up a new one every login, and holds back a device the user has never logged in from before until they confirm it with an emailed code, the same "was this you" step Google and similar platforms use. Details below and in `## Requirements`, `## Feature design`, and `## Build plan`.

**2026-07-17 addendum**: Apple OAuth, WhatsApp delivery, and the phone number identifier, all originally in scope (see `## Context` below), are deferred for now. Their code was removed rather than feature flagged, since neither has its external prerequisite ready: no Apple Developer account/Services ID/private key, no verified Meta Business account for WhatsApp. Google and Facebook OAuth stay in, now with real client keys configured. This is a scope trim, not a reversal: the market reasoning for phone + WhatsApp below still holds, and re-adding them is tracked in `## Follow-up`.

## Context

MIKS has no working authentication yet. The Prisma schema already models `User`, `AuthProvider`, `UserIdentity`, `VerificationToken`, `Device`, and `Session`, and the API configuration already reads JWT secrets and expiry settings, but no NestJS module reads or writes any of it. Every other planned feature (groups, contributions, votes) depends on knowing who is making a request, so this is a hard prerequisite that has to be settled before feature modules can be built.

The product targets Madagascar and similar markets first (see the product doc), where phone number based identity and WhatsApp are often more reliable reach channels than email. The team also intends to ship a mobile app later, so the authentication mechanism cannot assume a browser (cookies alone are not viable for a native app). (As of the 2026-07-17 addendum, phone identity and WhatsApp delivery are deferred rather than built now; see `## Follow-up`.)

The account model deliberately trades some safety for less friction: an account is usable immediately after registration, and verification of the identifier (email, and later phone once re-added) happens after the fact rather than gating access. This means downstream modules that require a verified identity (if any ever do) must check verification status themselves; this spec only records that the identity's verification flag exists and can be set.

**2026-07-18 addendum: device aware sessions and new device confirmation**

`Device` and `Session.deviceId` have existed in the schema since this spec's original design, but no application code ever created, read, or linked a `Device` row: `GET /auth/sessions` only ever showed the raw `userAgent` string and IP, and every login created a brand new `Session` row no matter where it came from. This addendum closes that gap. A client generated device ID now identifies the physical device across logins, so reconnecting from a device already known and trusted reuses its existing session instead of creating a new row every time. And, following an explicit request for a Google style safeguard, a device the user has never logged in from before is held back: a correct password alone is not enough, the user must also confirm the new device with a one time code emailed to them, closing the gap where a stolen password fully succeeds on its own.

## Requirements

**User stories**:
- As a new user, I want to sign up with my email, my phone number, or a social account, so that I can start using MIKS without extra friction.
- As a returning user, I want to log in and stay logged in across a long session, so that I do not have to re-authenticate constantly.
- As a user, I want to reset my password if I forget it, so that I am not locked out of my account permanently.
- As a security conscious user, I want to see which devices are logged into my account and be able to log any of them out, so that I can react if my account is compromised.
- As the platform, I want repeated failed logins to temporarily lock an identity, so that password guessing attacks are slowed down.
- As a future mobile app, I want to authenticate against the same endpoints as the web app, so that the backend does not need a parallel auth system later.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A user can register with email + password, or an OAuth provider (Google or Facebook); this creates a `User` and a matching `UserIdentity`. (Phone + password and Apple OAuth are deferred as of the 2026-07-17 addendum; see `## Follow-up`.)
- **AC-2**: A registered user can log in with correct credentials and receives an access token (15 minutes) and a refresh token (30 days).
- **AC-3**: A newly registered account is usable immediately, without requiring email verification first.
- **AC-4**: A user can request a password reset; a single use token or code is sent to their email (via Resend), and resetting the password with a valid token succeeds. (WhatsApp/phone delivery deferred; see `## Follow-up`.)
- **AC-5**: Logging in via an OAuth provider whose verified email matches an existing account automatically links the new identity to that account instead of creating a duplicate account.
- **AC-6**: Refresh tokens rotate on every use (the old one becomes invalid); replaying an already rotated refresh token revokes the session it belonged to.
- **AC-7**: After 5 failed login attempts on the same local identity, that identity is locked for 15 minutes; a subsequent successful login resets the failure counter.
- **AC-8**: Verification and password reset messages are delivered by email (Resend). (WhatsApp delivery for a phone identifier is deferred; see `## Follow-up`.)
- **AC-9**: A logged in user can list their own active sessions (device type, IP, last activity) and revoke any one of them individually; revoking a session immediately invalidates its refresh token.
- **AC-10**: Using an expired or already consumed verification or reset token returns a clear, distinct error, and the user can immediately request a new token, which invalidates any previous unconsumed one for the same purpose.
- **AC-11**: The same endpoints authenticate both a web caller (via httpOnly cookies) and a future mobile caller (via an `Authorization: Bearer` header), through one shared guard.
- **AC-12**: An endpoint can be restricted to the `ADMIN` application role through a reusable guard and decorator, independent of any per group authorization (which is out of scope here).

**2026-07-18 addendum, device aware sessions**:
- **AC-13**: A client sends a device ID on every register, login, and refresh call (a random ID it generates once and reuses: a header for a direct API call, a cookie for the web app so it survives the OAuth redirect); the server uses it to find or create that user's `Device` row.
- **AC-14**: Logging in from a device already known and active for that user reuses its existing `Session` (updates the refresh token and last active time in place) instead of creating a new row.
- **AC-15**: Logging in from a device not yet known, or previously revoked, for that user does not issue tokens; the server puts that `Device` in a pending state, emails a one time code, and the login response states that device confirmation is required.
- **AC-16**: Submitting the correct code for a pending device confirms it (the `Device` becomes active), creates its `Session`, and returns access and refresh tokens.
- **AC-17**: An expired or already consumed device confirmation code returns a clear, distinct error, and the user can immediately request a new code, which invalidates any previous unconsumed one.
- **AC-18**: Explicitly revoking a `Device`'s session (through `DELETE /auth/sessions/:id`, or automatic revocation from detected refresh token reuse) marks that `Device` revoked; its next login attempt is treated like an unrecognized device (confirmation required again). An ordinary logout ends the session but leaves the `Device` active, so logging back in on the same laptop the next day is not treated as a new device.
- **AC-19**: The device used to complete `/auth/register` is trusted immediately, without a confirmation step (the user just proved control of that browser by finishing registration).
- **AC-20**: `GET /auth/sessions` shows each session's device name, type, and platform (derived from the client's User-Agent, not the raw string) alongside the existing IP, last active time, and current flag.

## Decision

**Chosen option**: Option 1: Self hosted authentication with NestJS, Passport.js, and JWT

Build authentication directly on the existing Prisma schema using `@nestjs/passport` strategies (local, JWT, Google, Facebook), argon2 for password hashing, and a shared `JwtAuthGuard` / `RolesGuard` pair in `src/common/`. (Originally `local, JWT, Google, Facebook, Apple`; the `AppleStrategy` was removed 2026-07-17, see the addendum in `## Summary`.)

## Rationale

Full reasoning, alternatives, and references: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

The existing schema (`api/prisma/models/account.prisma`) already covers this feature almost completely. One migration is needed:

- `UserIdentity.failedAttempts`: `Int`, default `0`, not null. Counts consecutive failed login attempts for this identity.
- `UserIdentity.lockedUntil`: `DateTime`, nullable. When set and in the future, login attempts against this identity are rejected regardless of password correctness.

Everything else is used as is:
- `User` (id, email?, phone?, displayName, role, metadata) — one row per person, `email`/`phone` unique when present. `phone` stays in the schema (harmless, nullable) but nothing writes it as of the 2026-07-17 addendum; re-enable at the DTO/service layer when phone registration returns, no migration needed.
- `AuthProvider` (code, category `LOCAL`/`OAUTH`) — seed rows: `local` (LOCAL), `google`, `facebook` (OAUTH). Reference data, not user editable. (`apple` was removed from the seed 2026-07-17; existing `apple` rows already in a database are left alone, only the seed script stopped inserting it.)
- `UserIdentity` (userId FK, providerCode FK, identifier, secretHash, providerAccountId, accessToken/refreshToken for OAuth, emailVerified, failedAttempts, lockedUntil) — one row per login method per user; unique on `(providerCode, providerAccountId)` and `(providerCode, identifier)`.
- `VerificationTokenPurpose` (code) — seed rows: `EMAIL_VERIFICATION`, `PASSWORD_RESET`. (`PHONE_VERIFICATION` removed from the seed 2026-07-17, same as `apple` above.)
- `VerificationToken` (userId FK, purposeCode FK, identityId FK?, sentTo, tokenHash, attempts, maxAttempts, expiresAt, consumedAt) — single use tokens/OTPs for verification and reset.
- `Device` (userId FK, type, deviceId, pushToken, status) — one row per physical device/browser a user has logged in from.
- `Session` (userId FK, deviceId FK?, refreshToken, userAgent, ip, expiresAt, revokedAt) — one row per active login; `refreshToken` is rotated on every `/auth/refresh` call (the row is updated in place, not replaced), so this is a live token, not a token history table.

**2026-07-18 addendum**: one migration is needed for device aware sessions:
- `DeviceStatus` gains a third value, `PENDING` (awaiting confirmation), ordered `PENDING → ACTIVE → REVOKED`. Existing `Device` rows are unaffected since none exist yet (the model was never written to before this addendum).
- `VerificationToken` gains `deviceId String? @map("device_id")`, a nullable relation to `Device`, so a `NEW_DEVICE_CONFIRMATION` token can be tied to the pending `Device` it confirms. Nullable and additive, safe alongside existing rows (all for other purposes, none reference a device today).
- `VerificationTokenPurpose` seed gains one row: `NEW_DEVICE_CONFIRMATION`.
- `Session.deviceId` (already nullable in the schema) is finally populated on every session create; no column change needed, only the application code that writes it.
- No other schema changes: `Device`'s existing fields (`type`, `platform`, `deviceName`, `pushToken`, `firstSeenAt`, `lastActiveAt`) are read and written for the first time, not newly added.

**State transitions**:

`UserIdentity` lock state: `unlocked` (failedAttempts < 5) → `locked` (failedAttempts reaches 5, lockedUntil = now + 15 minutes) → `unlocked` (lockedUntil passes, or a correct login resets failedAttempts to 0).

`Session` lifecycle: `active` (created at login) → `rotated` (refreshToken replaced on `/auth/refresh`, same row) → `revoked` (revokedAt set, by explicit logout, explicit session revocation, or detected refresh token reuse).

`VerificationToken` lifecycle: `pending` (created, expiresAt in future, consumedAt null) → `consumed` (consumedAt set, single use) or `expired` (expiresAt passed) → a new token replaces it on resend, the old one's remaining attempts are set to 0 so it can no longer be consumed.

**2026-07-18 addendum**: `Device` lifecycle: `pending` (a device ID seen for the first time, or a previously revoked device ID seen again; a confirmation code is emailed) → `active` (the correct code is submitted before it expires or its attempt limit is reached; the device's first `Session` is created at this point) → `revoked` (its `Session` is ended by an explicit revocation, either the user revoking it from `/auth/sessions`, or detected refresh token reuse; **not** by an ordinary logout, see the note under Key invariants). A `revoked` device goes back to `pending` on its next login attempt rather than getting a new row, which keeps the existing `@@unique([userId, deviceId])` constraint intact. The `NEW_DEVICE_CONFIRMATION` `VerificationToken` follows the same `pending` → `consumed`/`expired` pattern already used above, scoped to a `deviceId` instead of an `identityId`.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /auth/register | POST | email, password, displayName | user id, access+refresh tokens | public | 409 email taken, 422 invalid password |
| /auth/login | POST | identifier (email), password | access+refresh tokens (cookies + body) | public | 401 invalid credentials, 423 locked |
| /auth/refresh | POST | refresh token (cookie or body) | new access+refresh tokens | refresh token | 401 invalid/expired, revokes session on reuse of a rotated token |
| /auth/logout | POST | (none, uses current session) | 204 | bearer/cookie | 401 not authenticated |
| /auth/verify | POST | token or OTP code | 200 verified | public | 400 expired, 409 already consumed |
| /auth/resend-verification | POST | identifier | 202 accepted | public | 429 rate limited |
| /auth/forgot-password | POST | identifier | 202 accepted (always, to avoid leaking which identifiers exist) | public | 429 rate limited |
| /auth/reset-password | POST | token, new password | 200 reset | public | 400 expired/invalid, 409 already consumed |
| /auth/google, /auth/facebook | GET | (provider redirect) | redirect to provider | public | 500 provider misconfigured |
| /auth/google/callback, /auth/facebook/callback | GET | provider code | access+refresh tokens, redirect to web app | public (provider signed) | 401 provider denied/invalid |
| /auth/me | GET | (none) | current user's id, email, displayName, role | bearer/cookie | 401 not authenticated |
| /auth/sessions | GET | (none) | list of the caller's sessions (id, device name/type/platform, ip, lastActiveAt, current flag) | bearer/cookie | 401 not authenticated |
| /auth/sessions/:id | DELETE | session id | 204 | bearer/cookie, ownership | 403 not your session, 404 not found |
| /auth/device/confirm | POST | confirmationId, code | access+refresh tokens | public | 400 expired/invalid, 404 unknown confirmationId, 409 already consumed |
| /auth/device/resend-confirmation | POST | confirmationId | 202 accepted | public | 404 unknown confirmationId, 429 rate limited |

`/auth/apple`, `/auth/apple/callback` are removed as of 2026-07-17 (404, not a stub); the note in `## Follow-up` covers re-adding them.

**2026-07-18 addendum**: `/auth/register`, `/auth/login`, `/auth/refresh`, and the OAuth callbacks now also read a device ID, a header (`X-Device-Id`, set by the future mobile app from its own secure storage) for a direct API call, or a `device_id` cookie for the web app (needed because the OAuth callback is a full browser redirect from the provider, where the web app cannot attach a custom header). The web cookie is set by the **server**, `httpOnly`, on the first unauthenticated request that arrives without one, not generated and written by client side JavaScript; this keeps a script running on the page (an XSS payload) from reading or forging it, the residual risk the cross check on this addendum flagged. `/auth/login` and the OAuth callbacks return a `requiresDeviceConfirmation: true, confirmationId` body instead of tokens when the device is not yet active; `/auth/register` never returns this, since the registering device is trusted immediately (**AC-19**).

**Key invariants**:
- One `UserIdentity` per `(providerCode, identifier)` and per `(providerCode, providerAccountId)` (already enforced by unique constraints).
- A `Session.refreshToken` is unique and always reflects the current, not yet used, refresh token for that session; rotating it updates the same row.
- `UserIdentity.failedAttempts` only increments on a wrong password against an existing, unlocked identity; it resets to 0 on the next successful login.
- An OAuth identity is only auto linked to an existing account when the provider asserts the email is verified; unverified provider emails require registering a new account instead.
- A `VerificationToken` can be consumed at most once (`consumedAt` set atomically on first successful use) and only while `attempts < maxAttempts` and `expiresAt` is in the future.

**2026-07-18 addendum**:
- A `Device` is unique per `(userId, deviceId)` (already enforced); finding or creating one on login is an upsert on that constraint (with a unique-violation fallback re-fetch), so two concurrent first-time requests from the same new device cannot create two rows or crash one of them.
- A `Session` is only ever created once its `Device` is active; no session exists for a pending or revoked device.
- **Logout ends a `Session` but does not revoke its `Device`.** Only an explicit session revocation (`DELETE /auth/sessions/:id`, or the reuse-detection auto-revoke on a rotated refresh token) demotes the `Device` to revoked (**AC-18**). Treating routine logout as a revocation would force the email-code dance again on the next ordinary login from the same, already-trusted laptop, defeating the "reuse the session" point of this addendum.
- A device confirmation `VerificationToken` can be consumed at most once, only while `attempts < maxAttempts` and before `expiresAt`, the same rule as the existing verification and reset tokens.
- The device that completes `/auth/register` skips confirmation and is created directly active (**AC-19**).

**Security model**:
- `JwtAuthGuard` (in `src/common/guards/`) validates the access token from either the `access_token` httpOnly cookie (web) or an `Authorization: Bearer` header (mobile), attaching the resolved `User` to the request. Applied by default to any route not explicitly marked `@Public()`.
- `RolesGuard` + `@Roles('ADMIN')` decorator (also in `src/common/`) restrict specific endpoints to the platform `ADMIN` role. This is the only authorization rule this spec defines; per group authorization (who can act inside a given group) is explicitly out of scope and will be designed with the group module.
- A user may only read or revoke their own sessions (`/auth/sessions*`); ownership is checked against the authenticated user's id, not passed in by the client.
- Passwords are hashed with argon2id (never stored or logged in plain text); tokens are hashed (`tokenHash`) before storage, never stored raw.
- All `/auth/*` mutating endpoints are rate limited (see Configuration) to slow down credential stuffing and OTP abuse.
- No PII beyond what the schema already stores (email, phone, display name) is introduced by this spec.
- **2026-07-18 addendum**: a device the user has not confirmed cannot obtain tokens no matter how correct the password is; this substantially narrows, but does not fully close, the gap where a stolen password alone was enough to fully authenticate, since an attacker who also obtains the victim's `device_id` cookie (server set, `httpOnly`, so not readable by an XSS script, but still exfiltratable through malware or a compromised, fully synced browser profile) is treated as the same trusted device and skips confirmation. The cookie is not a secret in the sense of proving identity by itself (it only distinguishes devices), but its long lifetime and its role in bypassing the new confirmation gate mean it deserves the same handling care as a session artifact, not casual treatment. Device confirmation codes follow the same handling as existing verification/reset codes: 6 digits, hashed before storage, rate limited, single use.

**Configuration required**:
- `JWT_ACCESS_SECRET`: signs and verifies access tokens (already present in `.env.example`).
- `JWT_REFRESH_SECRET`: signs and verifies refresh tokens (read by `configuration.ts` today but missing from `.env.example`; this spec formalizes it as required).
- `JWT_ACCESS_EXPIRES_IN`: access token lifetime, recommended `15m`.
- `JWT_REFRESH_EXPIRES_IN`: refresh token lifetime, recommended `30d`.
- `AUTH_LOCKOUT_MAX_ATTEMPTS`: failed attempts before lock, recommended `5`.
- `AUTH_LOCKOUT_DURATION_MINUTES`: lock duration, recommended `15`.
- `RESEND_API_KEY`, `RESEND_DOMAIN`: email delivery for verification/reset (Resend; `RESEND_DOMAIN` already read by config but missing from `.env.example`).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: Google OAuth. Configured with real values 2026-07-17.
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `FACEBOOK_REDIRECT_URI`: Facebook OAuth. Configured with real values 2026-07-17.
- `COOKIE_DOMAIN`, `COOKIE_SECURE`: cookie scoping for the access/refresh cookies across environments.
- **2026-07-18 addendum**: `DEVICE_CONFIRMATION_CODE_EXPIRY_MINUTES`, how long a new device confirmation code stays valid, recommended `15` (matches the existing verification/reset code expiry). `DEVICE_ID_COOKIE_NAME`, `DEVICE_ID_COOKIE_MAX_AGE_DAYS`, cookie scoping for the client generated device ID cookie, recommended name `device_id`, max age `3650` (about 10 years, effectively until the user clears cookies).

Removed 2026-07-17 (see `## Follow-up` to re-add when ready): `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID` (WhatsApp), `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_CALLBACK_URL` (Apple Sign In).

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: register by email, log in, call `/auth/me`, call `/auth/refresh`, call `/auth/logout`, verifies **AC-1**, **AC-2**, **AC-3**, **AC-11**.
- Failure case: 5 consecutive wrong passwords lock the identity, a 6th attempt (even correct) is rejected until the lock expires, verifies **AC-7**.
- Failure case: replaying a refresh token that was already rotated revokes the session, a subsequent refresh with either token fails, verifies **AC-6**.
- Auth/permission: a user calling `DELETE /auth/sessions/:id` on another user's session id receives 403, verifies **AC-9**.
- Auth/permission: a non admin user calling an `@Roles('ADMIN')` endpoint receives 403, verifies **AC-12**.
- **2026-07-18 addendum**: Happy path: log in from a brand new device, receive a confirmation required response, submit the emailed code, receive tokens, verifies **AC-15**, **AC-16**. Happy path: log in again from the same, now active device, the same `Session` row is reused (its id does not change, only `refreshToken`/`lastActiveAt`), verifies **AC-14**. Failure case: submitting an expired or already used device confirmation code is rejected with a distinct error, and requesting a new code invalidates the old one, verifies **AC-17**. Failure case: revoking every session tied to a device, then logging in again from that device, requires confirmation again rather than logging straight in, verifies **AC-18**.

## Build plan

No project wide build approach is recorded yet in `AGENTS.md` or a scope file (none exist), so this plan defaults to end to end (Tracer Bullet) slices: stand up one thin, fully working login path first, then broaden to the remaining methods and features. This assumption should be confirmed once a project wide `AGENTS.md` exists.

1. [x] Add the `UserIdentity.failedAttempts` / `lockedUntil` migration; seed `AuthProvider` (`local`, `google`, `facebook`, `apple`), `VerificationTokenPurpose` (`EMAIL_VERIFICATION`, `PHONE_VERIFICATION`, `PASSWORD_RESET`), satisfies **AC-7**. Migration and seed applied and confirmed live 2026-07-15 (via `/check verify`). (The `apple` and `PHONE_VERIFICATION` seed rows were dropped from `prisma/seed.ts` 2026-07-17; no migration, existing rows in a database are untouched.)
2. [x] Build `src/lib/auth-token/` (token service: sign/verify access + refresh JWTs, cookie helpers) and `src/lib/password/` (argon2 hash/verify), as `@Global()` infra modules per the project's convention, satisfies **AC-2**, **AC-6**.
3. [x] Build `src/modules/auth/` with `LocalStrategy` + `POST /auth/register` + `POST /auth/login`, wiring lockout checks, satisfies **AC-1** (email locally; phone deferred, see the 2026-07-17 addendum), **AC-3**, **AC-7**. (Path is `src/modules/auth/`, plural, matching the `$/*` alias already in `tsconfig.json`; this spec and `CLAUDE.md` said `src/module/`, singular — flagging for `/sync` to reconcile.)
4. [x] Add `JwtStrategy` + `JwtAuthGuard` + `RolesGuard` + `@CurrentUser()`/`@Roles()` decorators in `src/common/`, plus `GET /auth/me`, satisfies **AC-11**, **AC-12**.
5. [x] Add `POST /auth/refresh` with rotation and reuse detection, and `POST /auth/logout`, satisfies **AC-6**.
6. [x] Build `src/lib/mail/` (Resend) and `src/lib/whatsapp/` (WhatsApp Cloud API), behind one `NotificationDeliveryService` interface keyed by identifier type, satisfies **AC-8**. (`src/lib/whatsapp/` and its branch in `NotificationDeliveryService` were removed 2026-07-17; delivery is email only for now, see the 2026-07-17 addendum.)
7. [x] Add verification flow: `POST /auth/verify`, `POST /auth/resend-verification`, satisfies **AC-10**.
8. [x] Add password reset flow: `POST /auth/forgot-password`, `POST /auth/reset-password`, satisfies **AC-4**, **AC-10**. (Verification/reset codes are 6 digit, sha256 hashed for direct lookup, 15 minute expiry; `VerificationToken.attempts` is not incremented since a direct hash lookup makes per row retry counting moot, noted for a future revisit if brute force protection on the code itself is wanted.)
9. [x] Add `GET /auth/sessions`, `DELETE /auth/sessions/:id`, with ownership checks, satisfies **AC-9**.
10. [x] Add `GoogleStrategy`, `FacebookStrategy`, `AppleStrategy` plus their `GET /auth/:provider` and `GET /auth/:provider/callback` routes, including the auto link on verified email match, satisfies **AC-1** (OAuth), **AC-5**. (`AppleStrategy`, `apple-auth.guard.ts`, and the `/auth/apple*` routes were removed 2026-07-17, see the addendum; Google and Facebook now run against real client keys.)
11. [x] Add `ThrottlerModule` rate limiting on `/auth/*`, tuned tighter for `/auth/login`, `/auth/forgot-password`, `/auth/resend-verification`.
12. [x] **2026-07-17**: remove `AppleStrategy`/`apple-auth.guard.ts`, `src/lib/whatsapp/`, and the phone registration path (`RegisterDto.phone`, `AuthService.register`'s email-or-phone branch); drop the corresponding config/env vars and seed rows; scope the active surface to email + Google + Facebook. Built and verified: `tsc --noEmit` clean, 85/85 Jest tests passing, `eslint src` clean.
13. [x] **2026-07-18**: migration: `DeviceStatus` gains `PENDING`; `VerificationToken.deviceId` (nullable FK to `Device`); seed the `NEW_DEVICE_CONFIRMATION` purpose row, satisfies **AC-13**, **AC-15**. Applied and confirmed live 2026-07-18 (`prisma migrate deploy` + seed).
14. [x] Device ID plumbing: `X-Device-Id` header support plus a server set, `httpOnly` `device_id` cookie (set on the first unauthenticated request that arrives without one, read on register/login/refresh/OAuth callback), and a `DeviceService` (find or create by `(userId, deviceId)` as an upsert with a unique-violation fallback, safe under concurrent first-time requests; transitions between `PENDING`/`ACTIVE`/`REVOKED`), satisfies **AC-13**. Built as `DeviceIdMiddleware` (runs ahead of the Passport guards, so it also fires on `/auth/google`/`/auth/facebook` before they redirect) plus `DeviceService`.
15. [x] Wire `AuthService.createSession` to check the `Device` first: an active device reuses its `Session` (updates `refreshToken`/`lastActiveAt` in place); a pending, revoked, or unknown device blocks token issuance and returns a "confirmation required" response instead. Make sure ordinary `/auth/logout` ends the `Session` without touching `Device.status`; only `DELETE /auth/sessions/:id` and refresh token reuse detection demote the `Device` to revoked, satisfies **AC-14**, **AC-15**, **AC-18**.
16. [x] Add `POST /auth/device/confirm` and `POST /auth/device/resend-confirmation`, reusing the existing verification token pattern (hash, expiry, attempts) scoped to `deviceId` instead of `identityId`, plus `ThrottlerModule` rate limiting on both; confirming activates the `Device` and creates its first `Session`, satisfies **AC-16**, **AC-17**.
17. [x] Skip device confirmation for `/auth/register` (create its `Device` directly `ACTIVE`), satisfies **AC-19**.
18. [x] Auto detect `DeviceType`, platform, and a friendly device name from the User-Agent (`ua-parser-js`) when a `Device` is first created, and include them in `GET /auth/sessions`'s response, satisfies **AC-20**.
19. [x] Update the web app: the `device_id` cookie is server set (httpOnly) rather than client generated, matching this doc's own `## Feature design`/`## Security model` sections (this line's "client generates and persists it" phrasing was imprecise; the server-set approach is what actually shipped, sent automatically by the browser on every auth call); updated `web/src/routes/_authenticated/settings/sessions.tsx` to show device name/type/platform instead of the raw `userAgent` string, and added a code entry step (`/auth/login`'s device confirmation view, reused from the OAuth callback redirect) for the new "confirmation required" login response, satisfies **AC-13**, **AC-20**.

## Consequences

**Positive**:
- One shared `JwtAuthGuard` / `RolesGuard` pair every future module (group, project, vote, contribution) can reuse without redesigning authentication.
- Supports web (cookies) and a future mobile app (Bearer header) from day one, avoiding a costly rework when the mobile app arrives.
- Immediate account usability (no verification gate) keeps signup friction low, matching the product's cold start concern already flagged in the product docs.
- **2026-07-18 addendum**: substantially narrows a real security gap, a correct password from an unrecognized device no longer fully authenticates by itself, matching the "new device" protection the engineer explicitly asked for (see Negative/tradeoffs for the residual risk this does not fully close). The `Device` schema (modeled since the original spec, never used) finally earns its keep: no new tables, only new code reading and writing what was already there. Session listing becomes genuinely useful (a real device name instead of a raw User-Agent string).

**Negative / tradeoffs**:
- Deferred verification means an unverified account can act in the system; any feature that later needs a "verified only" rule must add its own check, since this spec does not gate access on it.
- Session based refresh token rotation adds a small amount of write load on every token refresh (an update per `Session` row every ~15 minutes per active user).
- (2026-07-17) Apple and WhatsApp were removed rather than feature flagged, so re-adding them later is a small implementation pass (new strategy/guard/module, config, seed rows), not a config flip. The tradeoff was accepted because carrying dead, uncredentialed integrations in the codebase (no Apple Developer account, no verified Meta Business account) added test/maintenance surface for paths that could not run.
- (2026-07-17) The product's phone number first target market reasoning (see `## Context`) still holds; deferring the phone identifier means the product currently only serves email-comfortable users until phone + WhatsApp is re-added.
- **2026-07-18 addendum**: a device confirmation step adds one extra round trip (check email, enter a code) to the first login from any new browser or device, including a rebuilt/reset browser profile; this is the same friction for security tradeoff the product already accepted for its Google style inspiration. `AuthService.createSession` now does one extra `Device` lookup (an upsert, to stay correct under concurrent first-time requests) on every register/login/refresh call, negligible cost but a new failure point to guard (a lookup error must not silently skip the confirmation gate). The web app must start sending a `device_id` cookie/header it did not send before; the future mobile app inherits the same requirement via the header path, so this becomes part of the auth contract every future client must implement, not optional. Login now hard depends on email deliverability for any new device, not just for password reset as before; if the confirmation email fails to send or the user cannot reach that inbox, they are locked out of a new device the same way a forgotten password with no email access already locks them out today, a pre-existing, accepted risk this addendum extends to a second flow rather than a new one. A stolen `device_id` cookie (not just a stolen password) is enough to bypass the new confirmation gate, see Security model for the residual risk this does not fully close.

**Neutral**:
- Introduces two new `@Global()` infra modules (`auth-token`, `password`), following the project's existing `src/lib/<name>/` convention. (A third, `whatsapp`, was added 2026-07-15 and removed 2026-07-17.)
- The lockout fields live on `UserIdentity`, not `User`; this is intentional (see rationale.md) but worth remembering when debugging a "locked out" report.
- **2026-07-18 addendum**: no existing data migrates, `Device` and `Session.deviceId` were never written to, so this addendum only adds new columns/enum values and new code, nothing to backfill. `Device.status = REVOKED` now means "no session currently active for this device," not "permanently untrusted": the same device reappearing later goes back through `PENDING`, not a fresh `Device` row (kept deliberately to respect the model's existing `(userId, deviceId)` uniqueness).

## Follow-up

- [ ] `.env.example` in `api/` is missing `NODE_ENV`, `JWT_REFRESH_SECRET`, and `RESEND_DOMAIN`, which are already read by `configuration.ts`; add them, plus every new variable listed under Configuration required, before implementation starts.
- [ ] Once a project wide `AGENTS.md` records a build approach (Tracer Bullet, Skateboard, Facade, Journey, or a variant), reconcile the `## Build plan` ordering above against it if different from the assumed end to end default.
- [ ] **(2026-07-17) Re-add Apple Sign In** once its external prerequisite is done: an Apple Developer account, a Services ID, and a private key generated ahead of time. When ready, run `/architect authentication: re-add Apple OAuth` before `/develop` rebuilds `AppleStrategy`/`apple-auth.guard.ts` and the `/auth/apple*` routes; they were deleted, not disabled, so this is a small rebuild, not a flag flip.
- [ ] **(2026-07-17) Re-add WhatsApp delivery and the phone identifier** once WhatsApp's external prerequisite is done: a verified Meta Business account, a registered phone number, and approved message templates for OTP/verification/reset texts. This also means re-adding `RegisterDto.phone`, `AuthService.register`'s phone branch, and the `PHONE_VERIFICATION` purpose. Run `/architect authentication: re-add WhatsApp delivery and phone identifier` first; this is the product's originally targeted market reach channel (see `## Context`), not an abandoned idea.
- [ ] The original `Configuration required` env var names for the removed integrations (`WHATSAPP_CLOUD_API_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_BUSINESS_ACCOUNT_ID`, `APPLE_CALLBACK_URL`) never matched what `configuration.ts` actually read (`WHATSAPP_API_KEY`/`WHATSAPP_API_URL`, `APPLE_REDIRECT_URI`); same pre-existing mismatch on `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` vs the actual `FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET`. Worth reconciling whenever these are next touched (a `/sync` or the next `/architect` pass on this spec), not urgent now that Apple/WhatsApp are removed.
- [ ] **(2026-07-18)** A `Device` left `PENDING` and never confirmed has no cleanup path yet; consider a scheduled job or a TTL that lets an abandoned pending device (and its unconsumed confirmation token) simply expire and disappear instead of accumulating.
- [ ] **(2026-07-18)** The engineer mentioned wanting stronger device recognition later (a real device fingerprint, or reusing Apple ID/biometric signals) beyond the client generated device ID this addendum ships. If the deferred phone/WhatsApp and Apple OAuth work above ever resumes, revisit whether the device ID mechanism should evolve alongside it; run `/architect authentication: stronger device recognition` when that becomes concrete.
- [ ] **(2026-07-18)** Consider a UA parsing library convention (for example `ua-parser-js`) for deriving `DeviceType`/platform/device name, and record the choice in `api/AGENTS.md`'s `## Agent skills` (or `## Rules`) once picked, so future device naming code has one documented convention instead of ad hoc parsing.

## Rationale

See [rationale.md](rationale.md) for the full context, options considered, and references.
