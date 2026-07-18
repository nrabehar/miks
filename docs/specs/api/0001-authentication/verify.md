# Verify: authentication · spec 0001 · updated 2026-07-18

_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. Covers the local auth core (register, login, lockout, refresh, logout, sessions, guards) and the verification/password reset delivery slice. OAuth (Google/Facebook/Apple) and `/auth/*` rate limiting are now built (2026-07-17); their steps below are written but not yet run, since no real `GOOGLE_CLIENT_ID`/`FACEBOOK_APP_ID`/`APPLE_*` credentials are configured. The verification/reset steps below are written but not yet run by `/check verify`._

## Commands

- [ ] `npm run db:migrate` (in `api/`) → applies the `failed_attempts` / `locked_until` columns on `user_identities` → AC-7
- [ ] `npm run db:seed` (in `api/`) → inserts `AuthProvider` rows (`local`, `google`, `facebook`, `apple`) and `VerificationTokenPurpose` rows → AC-7
- [ ] `npm run build` (in `api/`) → compiles cleanly → (build health, not a specific AC)

## UI / manual (via curl/Postman or the future web app)

- [x] `POST /auth/register` with `{ email, password, displayName }` → 201/200 with `user`, `accessToken`, `refreshToken`, and `access_token`/`refresh_token` cookies set → AC-1, AC-2, AC-3
- [x] `POST /auth/register` again with the same email → 409 conflict → AC-1
- [x] `POST /auth/login` with correct credentials right after registering (no verification step needed) → 200 with tokens → AC-3
- [x] `GET /auth/me` with the access token (cookie or `Authorization: Bearer`) → 200 with the user's id/email/phone/displayName/role → AC-11
- [x] `GET /auth/me` with no token → 401 → AC-11
- [x] `POST /auth/login` with a wrong password 5 times in a row on the same identity → the 5th response (or the next attempt) is 423 Locked, even with the correct password → AC-7
- [ ] Wait for the lockout window (`AUTH_LOCKOUT_DURATION_MINUTES`) or use a correct login afterwards → failed counter resets, login succeeds again → AC-7 (not yet re-exercised; the code path is straightforward but hasn't been directly observed)
- [x] `POST /auth/refresh` with a valid refresh token (cookie or body) → 200 with a new access+refresh token pair, old refresh token cookie replaced → AC-6
- [x] Replay the refresh token from the previous step (the one already rotated) → 401 and the session is revoked; a subsequent refresh with either the old or the new token fails → AC-6
- [x] `POST /auth/logout` → 204, cookies cleared, the session's refresh token is revoked → covers session lifecycle
- [x] `GET /auth/sessions` while logged in → lists the caller's sessions (id, ip, userAgent, createdAt, expiresAt, current flag) → AC-9
- [x] `DELETE /auth/sessions/:id` on your own session → 204, that session's refresh token stops working on `/auth/refresh` → AC-9
- [x] `DELETE /auth/sessions/:id` on another user's session id → 403 → AC-9
- [ ] An endpoint marked `@Roles('ADMIN')` (once one exists) called by a non admin, authenticated user → 403 → AC-12 (still blocked, no `@Roles('ADMIN')` route exists in the app yet)

## UI / manual: verification and password reset (email path uses the real configured Resend account; the phone/WhatsApp path is blocked, `WHATSAPP_API_KEY` is not configured)

- [x] `POST /auth/resend-verification` with `{ identifier }` for a registered, unverified email → 202, a `VerificationToken` row is created with `purposeCode = 'EMAIL_VERIFICATION'`, a real email is sent via Resend → AC-8, AC-10
- [x] `POST /auth/resend-verification` again for the same identifier before consuming the first → 202, the first token's `consumedAt` is now set (invalidated), a second row is created → AC-10
- [x] `POST /auth/verify` with the (valid, unexpired) code from the token → 200 `{ verified: true }`, the identity's `emailVerified` becomes `true` → AC-10
- [x] `POST /auth/verify` with that same code again → 409 (already consumed) → AC-10
- [x] `POST /auth/verify` with a made up code → 400 (invalid/unknown token) → AC-10
- [ ] `POST /auth/verify` with a code whose `expiresAt` has passed → 400 (expired) → AC-10 (not exercised; would need lowering `AUTH_VERIFICATION_TOKEN_EXPIRY_MINUTES` or waiting out the window)
- [x] `POST /auth/forgot-password` with `{ identifier }` for a registered email → 202, a `VerificationToken` row (`purposeCode = 'PASSWORD_RESET'`) is created, a real reset email is sent via Resend → AC-4, AC-8
- [x] `POST /auth/forgot-password` with an identifier that is not registered → 202 as well (does not reveal whether the account exists), no token/message created → AC-4
- [x] `POST /auth/reset-password` with `{ token, password }` using the reset code → 200 `{ reset: true }`; confirmed the OLD password now fails login (401) and the NEW password succeeds (200); `failedAttempts`/`lockedUntil` cleared → AC-4
- [x] `POST /auth/reset-password` with the same token again → 409 (already consumed) → AC-4, AC-10
- [ ] Same flow via a phone identifier (WhatsApp delivery) → BLOCKED, `WHATSAPP_API_KEY` is empty; `POST /auth/resend-verification` for a phone identity returns 500 (`fetch failed`, `ECONNRESET`) instead of a graceful response → AC-8 (phone path), see the note below

## Acceptance-criteria coverage

- AC-1 (local register/login) — covered above. AC-1 (OAuth) — built (Google/Facebook/Apple strategies + routes), not yet run against real provider credentials.
- AC-2 (access 15m / refresh 30d tokens on login) — covered by the register/login steps above.
- AC-3 (usable immediately, no verification gate) — covered by the login-right-after-register step.
- AC-4 (password reset) — met for email; confirmed the old password stops working and the new one logs in.
- AC-5 (OAuth auto link) — built (`AuthService.validateOAuthLogin` links on verified email match), not yet run against real provider credentials.
- AC-6 (refresh rotation + reuse revokes session) — covered above.
- AC-7 (lockout after 5 failed attempts, resets on success) — lock confirmed; reset-on-success not directly re-observed this round.
- AC-8 (email/WhatsApp delivery) — met for email (real Resend sends confirmed, no mocking); blocked for WhatsApp/phone, no `WHATSAPP_API_KEY` configured, and the failure mode there is a raw 500 rather than a graceful response (see below).
- AC-9 (list/revoke own sessions, ownership enforced) — covered above.
- AC-10 (expired/consumed token errors) — met for already-consumed and invalid/unknown; expired case not directly exercised.
- AC-11 (one guard for cookie + Bearer callers) — covered by the `/auth/me` steps.
- AC-12 (`@Roles('ADMIN')` guard) — still blocked, no `@Roles('ADMIN')` route exists in the app yet.

## UI / manual: OAuth (requires real `GOOGLE_CLIENT_ID`/`FACEBOOK_APP_ID`/`APPLE_*` credentials, not yet configured)

- [ ] `GET /auth/google` while unauthenticated → redirects to Google's consent screen → AC-1 (OAuth)
- [ ] Complete the Google consent flow with a Google account whose email is not yet registered → `GET /auth/google/callback` creates a new `User` + `UserIdentity` (`providerCode = 'google'`), redirects to `WEB_URL` with auth cookies set → AC-1 (OAuth)
- [ ] Complete the Google consent flow with a Google account whose **verified** email matches an existing local/email `User` → the callback links a new `UserIdentity` to that existing user instead of creating a duplicate `User` → AC-5
- [ ] Repeat the two flows above for `GET /auth/facebook` / `GET /auth/facebook/callback` → AC-1 (OAuth), AC-5
- [ ] Repeat for Apple: `GET /auth/apple` redirects to Apple's sign in page, and Apple's own redirect posts back to `POST /auth/apple/callback` (Apple's `form_post` response mode, not a `GET`) → AC-1 (OAuth), AC-5
- [ ] An OAuth account whose provider does not assert the email as verified, with no existing `User` matching that email → creates a new `User` + `UserIdentity` rather than auto linking → AC-5 (negative case)

## UI / manual: rate limiting

- [ ] `POST /auth/login` 6 times within 60 seconds with the same caller → the 6th (and further) requests return 429 before hitting the lockout/credential check → satisfies the tuned `/auth/login` throttle
- [ ] `POST /auth/forgot-password` 4 times within 60 seconds → the 4th returns 429 → satisfies the tuned `/auth/forgot-password` throttle
- [ ] `POST /auth/resend-verification` 4 times within 60 seconds → the 4th returns 429 → satisfies the tuned `/auth/resend-verification` throttle
- [ ] Any other `/auth/*` endpoint (e.g. `/auth/register`) allows the module wide default (100 requests / 60s) before 429ing → confirms the global throttle default doesn't over restrict less sensitive routes

## Update 2026-07-17: Apple + WhatsApp + phone identifier removed for now

Google and Facebook keys are now configured; Apple OAuth, WhatsApp delivery, and the phone identifier were removed from the active auth surface until Apple/WhatsApp credentials exist. This supersedes the Apple/phone/WhatsApp rows above (AC-1, AC-4, AC-8 as originally written assumed Apple + phone were live) — `/architect` should reconcile spec 0001's `## Decision`, `## Requirements`, and `## Configuration required` sections against this before the next status advance.

- [x] `npm run build` (in `api/`) → typechecks clean with Apple/WhatsApp/phone code removed
- [x] `npx jest` (in `api/`) → 85/85 tests passing after the removal (register.dto, auth.service, auth.controller, configuration specs updated)
- [x] `npx eslint src` (in `api/`) → clean, no unused-import/dead-code warnings from the removed files
- [ ] `POST /auth/register` with `{ phone, password, displayName }` (no email) → 400/422, phone is no longer accepted as a registration identifier
- [ ] `GET /auth/apple`, `GET /auth/apple/callback`, `POST /auth/apple/callback` → 404, the routes no longer exist
- [ ] `POST /auth/forgot-password` / `POST /auth/resend-verification` for a non-email identifier → no WhatsApp send is attempted (the delivery path is email-only now); confirm no `ECONNRESET`/`fetch failed` 500 reappears
- [ ] `GET /auth/google` and `GET /auth/facebook` with the now-configured `GOOGLE_CLIENT_ID`/`FACEBOOK_APP_ID` keys → redirect to the real consent screen (first real run against live provider credentials) → AC-1 (OAuth), AC-5

## Update 2026-07-18: device aware sessions (addendum)

Built, not yet run live via `/check verify`. Migration applied and confirmed live against the real dev database (`prisma migrate deploy`, `20260718120000_device_aware_sessions`); `tsc --noEmit`, `eslint`, and `jest` (70/70 in `src/modules/auth`) all pass on the API, and `tsc -b`, `eslint .`, and `vitest run` (60/60) all pass on the web app.

## Commands

- [x] `npx prisma migrate deploy` (in `api/`) → applies `DeviceStatus.PENDING` and `VerificationToken.device_id` → confirmed live, AC-13
- [x] `npm run db:seed` (in `api/`) → inserts the `NEW_DEVICE_CONFIRMATION` purpose row → confirmed live, AC-15
- [x] `npx tsc --noEmit` (in `api/`) and `npx tsc -b` (in `web/`) → both clean
- [x] `npx jest src/modules/auth` (in `api/`) → 70/70 passing
- [x] `npx vitest run` (in `web/`) → 60/60 passing
- [x] `npx eslint` on both apps → clean

## UI / manual: device aware sessions

- [ ] `POST /auth/register` with a fresh `device_id` cookie (or `X-Device-Id` header) not sent before → the created `Device` is `ACTIVE` immediately, no confirmation required, tokens returned → AC-13, AC-19
- [ ] `POST /auth/login` from a device ID never seen for that user (new browser profile, or an explicit unseen `X-Device-Id`) → 200 with `{ requiresDeviceConfirmation: true, confirmationId }`, no tokens, no auth cookies set; a `Device` row is created `PENDING`, an email is sent with a 6 digit code → AC-15
- [ ] `POST /auth/device/confirm` with that `confirmationId` and the correct code → 200 with `user`/`accessToken`/`refreshToken`, cookies set; the `Device` becomes `ACTIVE` → AC-16
- [ ] `POST /auth/login` again from the same, now active device → 200 with tokens directly (no confirmation prompt); `GET /auth/sessions` still shows the same session `id` as before (not a new row), only `refreshToken`/`lastActiveAt` changed → AC-14
- [ ] `POST /auth/device/confirm` with an expired code (wait out `DEVICE_CONFIRMATION_CODE_EXPIRY_MINUTES`, default 15) → 400, distinct from the wrong-code case → AC-17
- [ ] `POST /auth/device/confirm` with an already-consumed code (reuse one from a prior successful confirm) → 409 → AC-17
- [ ] `POST /auth/device/resend-confirmation` with a still-pending `confirmationId` → 202, the previous unconsumed code is invalidated, a new one is emailed → AC-17
- [ ] `DELETE /auth/sessions/:id` on a device's own session → 204, and that `Device`'s status becomes `REVOKED`; the next `POST /auth/login` from that same device requires confirmation again (does not log straight in) → AC-18
- [ ] Replay an already-rotated refresh token (as in the base AC-6 case) → the session is revoked AND its `Device` becomes `REVOKED` (not just the session) → AC-18
- [ ] `POST /auth/logout` on an active device's session → session ends, but the `Device` stays `ACTIVE` (not revoked); logging back in on the same device the next day does not require confirmation → AC-18 (the ordinary-logout carve out)
- [ ] `GET /auth/sessions` → each row includes `deviceName`, `deviceType`, `platform`, and `lastActiveAt` (device derived, not a raw `userAgent` string) alongside the existing `ip`/`createdAt`/`current` fields → AC-20
- [ ] Web: log in from a browser with no `device_id` cookie yet → the server sets one, `httpOnly`, on the response; log in again later and confirm the same cookie/device is reused (no repeat confirmation prompt) → AC-13
- [ ] Web: trigger the "unrecognized device" response on `/auth/login` → the login page shows the code entry step (not a raw error), submitting the correct code logs in and lands on the redirect target → AC-15, AC-16
- [ ] Web: trigger the same unrecognized-device response via an OAuth login (Google/Facebook) → the OAuth popup (or full page fallback) redirects to `/auth/login` with the confirmation step, completing it closes the popup / navigates home the same way a normal OAuth success does → AC-15, AC-16
- [ ] Web: `web/src/routes/_authenticated/settings/sessions.tsx` shows a device name/type instead of the raw User-Agent string for each session → AC-20

## Acceptance-criteria coverage (2026-07-18 addendum)

- AC-13 (device ID on register/login/refresh, header or cookie, find-or-create `Device`) — built, cookie/header plumbing and `DeviceService.findOrCreatePending`/`identifyForRegister` confirmed by unit tests; not yet re-exercised live.
- AC-14 (known active device reuses its `Session`) — built (`AuthService.createSession`'s reuse branch); not yet re-exercised live.
- AC-15 (unrecognized/revoked device blocks tokens, emails a code) — built (`DeviceService.identifyForLogin`); not yet re-exercised live.
- AC-16 (correct code confirms device, creates session, returns tokens) — built (`DeviceService.confirm` + `AuthController.confirmDevice`); not yet re-exercised live.
- AC-17 (expired/consumed code errors, resend invalidates old) — built (`DeviceService.confirm`/`resendConfirmation`); not yet re-exercised live.
- AC-18 (explicit revocation demotes device; ordinary logout does not) — built (`revokeByDeviceId` called from `DELETE /auth/sessions/:id` and refresh-reuse detection, never from `/auth/logout`); not yet re-exercised live.
- AC-19 (register's device trusted immediately) — built (`DeviceService.identifyForRegister` creates directly `ACTIVE`); not yet re-exercised live.
- AC-20 (device name/type/platform on `GET /auth/sessions`) — built (`ua-parser-js` via `parseDeviceInfo`, controller include); not yet re-exercised live.

## Note: build plan item 19's wording

Spec build plan item 19 originally said the web app should "generate and persist the `device_id` cookie/value on first load" client side; what actually shipped (and what the spec's own `## Feature design`/`## Security model` sections already specify) is a **server set**, `httpOnly` cookie, set on the first request that arrives without one. The web app needed no client side cookie code at all: the browser sends it automatically via `withCredentials: true`. This is noted directly on that build plan line rather than left as a silent discrepancy.

## Note: delivery failure handling

`resend-verification`/`forgot-password` create the `VerificationToken` row, then send the notification; if the send throws (confirmed for WhatsApp with no API key: `TypeError: fetch failed` / `ECONNRESET`), the whole request 500s even though the token row is already committed. `forgot-password`'s own "always 202, don't leak" contract only holds when the identifier isn't found; once a real send is attempted and fails, the caller sees a raw 500 instead of a graceful outcome. Worth a look in `/check review` or `/debug`, not a hard blocker for this slice (the WhatsApp path is externally gated on real credentials per this spec's own Follow-up section).
