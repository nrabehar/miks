# 0002. Frontend auth flows (register, verify email, password reset, OAuth buttons, session management)

**Date**: 2026-07-18
**Status**: Accepted

## Summary

Spec [0001](../0001-frontend-architecture/index.md) decided the frontend's auth foundation (cookie only sessions, the refresh interceptor, the feature folder shape) and only the login screen was built on top of it. This spec designs the rest: register, email verification, forgot and reset password, Google and Facebook login buttons, and a page to see and revoke active sessions. Nothing here changes the session model already decided; it fills in the screens and flows the backend already supports but the frontend does not yet expose.

## Requirements

**User stories**:
- As a new user, I want to sign up with my email and start using MIKS right away, so that verifying my email later does not block me.
- As a user who forgot their password, I want to request a reset link and set a new password, so that I am not locked out permanently.
- As a user, I want to sign up or log in with Google or Facebook without leaving the flow I am in, so that I do not have to remember another password.
- As a security conscious user, I want to see my active sessions and revoke any device that is not this one, so that I can react if my account is compromised.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A user can register with email, password, and display name; on success they are logged in immediately (the same session cookies login sets) and land in the app, matching the backend's no verification gate (api spec 0001, AC-3).
- **AC-2**: A logged in user whose email is not yet verified sees a dismissible "verify your email" banner; dismissing it only hides it for the current session, and it reappears on the next visit until the account is actually verified.
- **AC-3**: The emailed verification link opens a frontend route that automatically submits its token to POST /auth/verify on load and shows a clear success or error state, with no extra click needed on the happy path.
- **AC-4**: An expired or already used verification token shows an error state offering to resend a new one, rather than a generic failure.
- **AC-5**: A user can request a password reset from a forgot password screen; submitting always shows the same generic "check your email" confirmation, whether or not the identifier exists, matching the backend's deliberate non leaking response.
- **AC-6**: The reset password screen takes a new password plus a confirmation field and submits both with the URL token.
- **AC-7**: An expired or already used reset token shows an inline error state with a "request a new link" action instead of letting the user fill in and submit the form against a dead token.
- **AC-8**: Login and register both offer Google and Facebook buttons; the flow opens in a popup window, and on success the popup closes itself while the main window's session refreshes without a full page reload.
- **AC-9**: If the popup is blocked, the same button falls back to a full page redirect to the same OAuth URL instead of failing silently.
- **AC-10**: A logged in user can view their active sessions (device or user agent, IP, created date, current flag) at a settings page and revoke any session except the current one.
- **AC-11**: Hitting the resend verification or forgot password rate limit (429, capped at 3 per minute server side) shows a specific "too many requests, try again shortly" message and disables the action for a short cooldown, instead of the generic error.

## Decision

**Chosen option**: Option 1, build all four flows now against the existing stack (see [rationale.md](rationale.md) for the alternatives considered).

## Feature design

**Data model sketch**:

No new persisted entities. Everything is already modeled by the backend (`User`, `UserIdentity`, `VerificationToken`, `Session`, per api spec [0001](../../api/0001-authentication/index.md)). The only new state on the frontend is ephemeral: a per session "verify banner dismissed" flag (sessionStorage, not persisted account side) and the TanStack Query cache for the sessions list (`authKeys.sessions()`).

**Backend touches** (small, additive, ride along with this frontend spec):
- `AuthenticatedUser` (`api/src/common/guards/jwt-auth.guard.ts`) and `JwtStrategy.validate` (`api/src/modules/auth/strategies/jwt.strategy.ts`) gain an `emailVerified: boolean` field, read from the user's local `UserIdentity.emailVerified`. `GET /auth/me` then returns it for free, since it already returns the whole `AuthenticatedUser`.
- `AuthController.completeOAuthLogin` (`api/src/modules/auth/auth.controller.ts`) redirects to `${config.oauth.webUrl}/auth/oauth-callback` instead of `config.oauth.webUrl` directly, so the popup has a dedicated frontend route to land on.

**State transitions**:

Verify banner: `shown` (logged in, `emailVerified` false, not dismissed this session) to `dismissed` (sessionStorage flag set, hidden for the rest of this session) back to `shown` on the next app load if still unverified, to gone for good once `emailVerified` becomes true.

Reset password token (as seen by the frontend): `unknown` (page loads, token only known from the URL, not pre checked) to `accepted` (submit succeeds) or `rejected` (submit returns 400 or 409, error state replaces the form).

OAuth popup: `opened` to `blocked` (browser refused to open it, falls back to full page redirect) or `completed` (the popup's callback route posts a message to the opener and closes itself, the opener invalidates the `me` query).

**API surface** (all already exist server side, per api spec 0001; this table maps the frontend action to each):

| Frontend action | Endpoint | Method | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|---|
| Register form submit | /auth/register | POST | email, password, displayName | user, tokens (cookies) | 409 email taken, 422 invalid password |
| Verify page auto submit | /auth/verify | POST | token | verified: true | 400 expired, 409 already consumed |
| Verify page / banner resend | /auth/resend-verification | POST | identifier | 202 accepted | 429 rate limited |
| Forgot password form submit | /auth/forgot-password | POST | identifier | 202 accepted (always) | 429 rate limited |
| Reset password form submit | /auth/reset-password | POST | token, password | reset: true | 400 expired/invalid, 409 already consumed |
| Google / Facebook button | /auth/google, /auth/facebook | GET | (redirect) | provider redirect | 500 provider misconfigured |
| OAuth callback landing route | /auth/oauth-callback | (none, frontend only) | (none, cookies already set by the backend callback) | postMessage to opener, close popup | popup could not detect success (timeout, show a manual "close and continue" link) |
| Sessions page load | /auth/sessions | GET | (none) | list of sessions (id, ip, userAgent, createdAt, expiresAt, revoked, current) | 401 not authenticated |
| Sessions page revoke | /auth/sessions/:id | DELETE | session id | 204 | 403 not your session, 404 not found |

**Key invariants**:
- The sessions list never offers a revoke action on the row where `current` is true; ending the current session goes through logout, not through this list.
- The verify banner's visibility is derived solely from `GET /auth/me`'s `emailVerified` field plus the session scoped dismissal flag; it is never set by any local guess.
- A reset password or verify submit that returns 400 or 409 replaces the form with the matching error state; the form is never resubmitted against a token already known to be dead.
- The OAuth popup and the main window only ever communicate through `postMessage` targeted at the app's own origin; the opener ignores any message from a different origin.

**Security model**:
- No new authorization rule. Session ownership (a user can only see and revoke their own sessions) is already enforced server side (api spec 0001, `## Feature design`, Security model); the frontend does not re implement or duplicate that check, it only reflects what the API returns.
- The OAuth popup exchanges no secret with the main window; the only thing that crosses the `postMessage` boundary is a "done" signal, since the actual session cookies are already set by the backend callback before the popup redirects to the landing route.
- Rate limiting (429) on resend verification and forgot password is already enforced server side; the frontend's cooldown is a UX courtesy, not a security control, and must not be relied on to actually stop abuse.

**Configuration required**:
- No new frontend `VITE_*` variables.
- Backend: none new; `WEB_URL` (already read by `configuration.ts` as `config.oauth.webUrl`) is reused, only the constructed redirect path changes.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: register, see the verify banner, click the emailed link, banner disappears after the next `me` fetch confirms verified, verifies **AC-1**, **AC-2**, **AC-3**.
- Happy path: forgot password, reset with a valid token, log in with the new password, verifies **AC-5**, **AC-6**.
- Failure case: submit reset password with an already used token, the form is replaced by the error state with a working "request new link" action, verifies **AC-7**.
- Failure case: resend verification three times inside a minute, the fourth attempt shows the rate limit message and the button is disabled for the cooldown, verifies **AC-11**.
- Auth/permission: the sessions list never renders a revoke control on the current session's row, verifies **AC-10**.
- OAuth: block the popup (simulate `window.open` returning null), the button falls back to a full page redirect to the same URL, verifies **AC-9**.

## Build plan

No project wide build approach is recorded in `AGENTS.md` or a scope header (the same gap every existing spec in this repo already flags), so this plan defaults to end to end slices: get one flow fully working before moving to the next, rather than building all four screens' shells first and wiring them later.

1. Backend: add `emailVerified` to `AuthenticatedUser` and `GET /auth/me` (`api/src/common/guards/jwt-auth.guard.ts`, `api/src/modules/auth/strategies/jwt.strategy.ts`), satisfies **AC-2**.
2. Backend: change `completeOAuthLogin`'s redirect target to `${webUrl}/auth/oauth-callback` (`api/src/modules/auth/auth.controller.ts`), satisfies **AC-8**.
3. Frontend: register screen and schema (email, password, confirm password, display name), wired the same way `login.tsx` is, satisfies **AC-1**.
4. Frontend: verify email banner (reads `emailVerified` off the cached `me` query, session scoped dismissal) plus the `/auth/verify-email` route (auto submits the URL token, success or error state, error state offers resend), satisfies **AC-2**, **AC-3**, **AC-4**.
5. Frontend: forgot password screen (generic confirmation on submit) and reset password screen (password plus confirm, bad token error state with a "request new link" action), satisfies **AC-5**, **AC-6**, **AC-7**.
6. Frontend: Google and Facebook buttons on login and register, the popup flow, the `/auth/oauth-callback` landing route (posts to the opener, closes itself), and the popup blocked fallback to a full page redirect, satisfies **AC-8**, **AC-9**.
7. Frontend: `/settings/sessions` page (list, current flag, revoke on every row except current), satisfies **AC-10**.
8. Frontend: the 429 cooldown UX on resend verification and forgot password (specific message, disabled action for a short window), satisfies **AC-11**.
9. Add every new i18n key to both `locales/fr.json` and `locales/mg.json` together, per the project's existing convention.
10. Vitest and React Testing Library coverage for each flow above (happy path plus its main failure case), per the project's existing testing convention.

## Consequences

**Positive**:
- Every screen the backend already supports finally has a frontend surface; the account model's "usable immediately, verify later" design (api spec 0001) is now reflected end to end instead of stopping at login.
- No new library and no new pattern; every new screen is built the same way the login screen already was, which keeps the feature folder consistent.
- The two backend touches are small and additive (a new read, a changed redirect target), not a change to anything already shipped or tested.

**Negative / tradeoffs**:
- The OAuth popup approach costs more than a full page redirect would have: a dedicated callback route, `postMessage` plumbing, an origin check, and a popup blocked fallback path, all to avoid the main app unmounting during the OAuth round trip. A full page redirect would have needed none of this, at the cost of a visible page reload during login.
- The session scoped verify banner dismissal (sessionStorage, not persisted) means a user who dismisses it will see it again next session even if they intended to ignore it for good; this was chosen over a permanent dismissal because there is no backend field to store a "don't show again" preference, and adding one for a single UI banner was judged not worth a schema change.
- Four flows land together; the review and test surface for this change is wider than a single screen would be.

**Neutral**:
- `web/AGENTS.md` gains new route and feature folder entries once this is built (via `/sync`).
- The rate limit cooldown is UX only; the real defense against abuse is the backend's existing throttle (api spec 0001), unchanged by this spec.

## Follow-up

- [ ] No project wide build approach is recorded in `AGENTS.md` or a scope header; once one is, reconcile this spec's `## Build plan` ordering against it if different (the same open item every existing spec in this repo carries).
- [ ] `docs/scope/web/scope.md` has no row for this feature yet; add one (via `/scope`) linking this spec, since the only current row ("Frontend foundation") is already done and does not cover this work.
- [ ] Apple OAuth is deferred on the backend (api spec 0001's 2026-07-17 addendum); no frontend button for it until the backend re-adds it.

## Rationale

Full reasoning and the alternatives considered: see [rationale.md](rationale.md).
