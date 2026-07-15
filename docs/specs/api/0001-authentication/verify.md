# Verify: authentication (local auth core) · spec 0001 · updated 2026-07-15

_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. This covers the local auth slice built so far (register, login, lockout, refresh, logout, sessions, guards). OAuth and verification/reset delivery are not yet built; their AC-4, AC-5, AC-8, AC-10 steps are not included here._

## Commands

- [ ] `npm run db:migrate` (in `api/`) → applies the `failed_attempts` / `locked_until` columns on `user_identities` → AC-7
- [ ] `npm run db:seed` (in `api/`) → inserts `AuthProvider` rows (`local`, `google`, `facebook`, `apple`) and `VerificationTokenPurpose` rows → AC-7
- [ ] `npm run build` (in `api/`) → compiles cleanly → (build health, not a specific AC)

## UI / manual (via curl/Postman or the future web app)

- [ ] `POST /auth/register` with `{ email, password, displayName }` → 201/200 with `user`, `accessToken`, `refreshToken`, and `access_token`/`refresh_token` cookies set → AC-1, AC-2, AC-3
- [ ] `POST /auth/register` again with the same email → 409 conflict → AC-1
- [ ] `POST /auth/login` with correct credentials right after registering (no verification step needed) → 200 with tokens → AC-3
- [ ] `GET /auth/me` with the access token (cookie or `Authorization: Bearer`) → 200 with the user's id/email/phone/displayName/role → AC-11
- [ ] `GET /auth/me` with no token → 401 → AC-11
- [ ] `POST /auth/login` with a wrong password 5 times in a row on the same identity → the 5th response (or the next attempt) is 423 Locked, even with the correct password → AC-7
- [ ] Wait for the lockout window (`AUTH_LOCKOUT_DURATION_MINUTES`) or use a correct login afterwards → failed counter resets, login succeeds again → AC-7
- [ ] `POST /auth/refresh` with a valid refresh token (cookie or body) → 200 with a new access+refresh token pair, old refresh token cookie replaced → AC-6
- [ ] Replay the refresh token from the previous step (the one already rotated) → 401 and the session is revoked; a subsequent refresh with either the old or the new token fails → AC-6
- [ ] `POST /auth/logout` → 204, cookies cleared, the session's refresh token is revoked → covers session lifecycle
- [ ] `GET /auth/sessions` while logged in → lists the caller's sessions (id, ip, userAgent, createdAt, expiresAt, current flag) → AC-9
- [ ] `DELETE /auth/sessions/:id` on your own session → 204, that session's refresh token stops working on `/auth/refresh` → AC-9
- [ ] `DELETE /auth/sessions/:id` on another user's session id → 403 → AC-9
- [ ] An endpoint marked `@Roles('ADMIN')` (once one exists) called by a non admin, authenticated user → 403 → AC-12

## Acceptance-criteria coverage

- AC-1 (local register/login) — covered above. AC-1 (OAuth) — not built yet, deferred.
- AC-2 (access 15m / refresh 30d tokens on login) — covered by the register/login steps above.
- AC-3 (usable immediately, no verification gate) — covered by the login-right-after-register step.
- AC-4 (password reset) — not built yet, deferred (needs Resend/WhatsApp delivery).
- AC-5 (OAuth auto link) — not built yet, deferred.
- AC-6 (refresh rotation + reuse revokes session) — covered above.
- AC-7 (lockout after 5 failed attempts, resets on success) — covered above, plus the migration/seed commands.
- AC-8 (email/WhatsApp delivery) — not built yet, deferred.
- AC-9 (list/revoke own sessions, ownership enforced) — covered above.
- AC-10 (expired/consumed token errors) — not built yet, deferred (part of verification/reset flow).
- AC-11 (one guard for cookie + Bearer callers) — covered by the `/auth/me` steps.
- AC-12 (`@Roles('ADMIN')` guard) — covered above, pending a real admin-only route to test against.
