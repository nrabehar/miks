# Web scope

## At a glance

| Feature | Status | Spec |
|---|---|---|
| Frontend foundation | done | [0001](../../specs/web/0001-frontend-architecture/index.md) |
| Frontend auth flows | done | [0002](../../specs/web/0002-auth-flows/index.md) |

## Frontend auth flows (done)

Build the frontend screens for the auth flows the backend already supports but the app does not expose yet: register, email verification, forgot and reset password, Google and Facebook login buttons, and a page to see and revoke active sessions. Also includes two small additive backend touches (an emailVerified read on GET /auth/me, and a dedicated OAuth callback route) needed to support the verify banner and the OAuth popup flow.

**Done when:** a user can register and land in the app immediately with a dismissible verify email banner, click the emailed link to verify, request and complete a password reset (including a clear expired-token error state), sign in or register via a Google or Facebook popup with a full-page-redirect fallback if the popup is blocked, and view and revoke their own active sessions (except the current one) from a settings page, all matching spec [0002](../../specs/web/0002-auth-flows/index.md).

- [x] Design it (spec): [0002](../../specs/web/0002-auth-flows/index.md)
- [x] Build it: /develop frontend auth flows — code in `api/src/common/guards/jwt-auth.guard.ts`, `api/src/modules/auth/` (strategies, controller, service), `web/src/features/auth/`, `web/src/routes/auth/`, `web/src/routes/_authenticated/settings/sessions.tsx`, `web/src/routes/_authenticated.tsx`
  - [x] Backend touches: emailVerified on GET /auth/me, OAuth callback redirect target (AC-2, AC-8)
  - [x] Register + email verification flow: register screen, verify banner, verify route (AC-1, AC-2, AC-3, AC-4)
  - [x] Forgot and reset password flow, including the bad-token error state (AC-5, AC-6, AC-7)
  - [x] Google/Facebook OAuth buttons: popup flow, callback landing route, popup-blocked fallback (AC-8, AC-9)
  - [x] Sessions management page, rate-limit cooldown UX, and fr/mg i18n keys (AC-10, AC-11)
- [x] Verify it: /check verify frontend auth flows — real browser (Playwright/Chromium) against the live API, all acceptance criteria confirmed 2026-07-18
- [x] Test it: /test frontend auth flows — 6 new/extended test files (schema, use-cooldown, verify-banner, login, oauth-callback, jwt.strategy), 350 total tests (60 web + 320 api) passing 2026-07-18

## Frontend foundation (done)

Stand up the whole frontend base the rest of the app builds on: routing, talking to the API, remembering data, forms, French and Malagasy text, working while offline, and catching crashes. Today `web/` is a bare Vite and React scaffold with nothing wired up; this is the first thing built on it.

**Done when:** the app has a root layout that checks who is logged in once via `/auth/me`, protected routes redirect to `/auth/login` when not authenticated, a 401 triggers a single flight silent refresh and retry, at least one real page fetches and renders data through TanStack Query, forms validate through React Hook Form and Zod, French and Malagasy strings both resolve through react i18next, the app installs and shows already loaded data offline, errors are reported to the self hosted Rustrak instance, and the test runner (Vitest plus React Testing Library) passes on the scaffold, all matching spec [0001](../../specs/web/0001-frontend-architecture/index.md).

- [x] Decide the stack (spec): [0001](../../specs/web/0001-frontend-architecture/index.md)
- [x] Scaffold from the decision: /develop frontend foundation — code in `web/src/` (routing, auth wiring, i18n, offline, error reporting), `web/vite.config.ts`, `web/vitest.config.ts`
- [x] Verify it: /check verify frontend foundation — real browser (Playwright/Chromium) against the live API, all acceptance criteria confirmed 2026-07-18
- [x] Test it: /test frontend foundation — 15 tests in `web/src/routes/_authenticated/index.test.tsx` and 4 other files, all passing 2026-07-18
