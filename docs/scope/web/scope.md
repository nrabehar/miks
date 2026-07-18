# Web scope

## At a glance

| Feature | Status | Spec |
|---|---|---|
| Frontend foundation | done | [0001](../../specs/web/0001-frontend-architecture/index.md) |

## Frontend foundation (done)

Stand up the whole frontend base the rest of the app builds on: routing, talking to the API, remembering data, forms, French and Malagasy text, working while offline, and catching crashes. Today `web/` is a bare Vite and React scaffold with nothing wired up; this is the first thing built on it.

**Done when:** the app has a root layout that checks who is logged in once via `/auth/me`, protected routes redirect to `/auth/login` when not authenticated, a 401 triggers a single flight silent refresh and retry, at least one real page fetches and renders data through TanStack Query, forms validate through React Hook Form and Zod, French and Malagasy strings both resolve through react i18next, the app installs and shows already loaded data offline, errors are reported to the self hosted Rustrak instance, and the test runner (Vitest plus React Testing Library) passes on the scaffold, all matching spec [0001](../../specs/web/0001-frontend-architecture/index.md).

- [x] Decide the stack (spec): [0001](../../specs/web/0001-frontend-architecture/index.md)
- [x] Scaffold from the decision: /develop frontend foundation — code in `web/src/` (routing, auth wiring, i18n, offline, error reporting), `web/vite.config.ts`, `web/vitest.config.ts`
- [x] Verify it: /check verify frontend foundation — real browser (Playwright/Chromium) against the live API, all acceptance criteria confirmed 2026-07-18
- [x] Test it: /test frontend foundation — 15 tests in `web/src/routes/_authenticated/index.test.tsx` and 4 other files, all passing 2026-07-18
