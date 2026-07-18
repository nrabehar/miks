# Verify: frontend foundation · spec 0001 · updated 2026-07-18

_Steps derived from spec 0001's decision and its cross reference to spec 0001-authentication's acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Visit `/` while logged out → redirected to `/auth/login` (query param `redirect=/`) → matches the decision's "protected routes redirect to `/auth/login`"
- [ ] Log in with a valid email + password on `/auth/login` → redirected back to `/` and the dashboard renders the real `displayName` and `role` from `GET /auth/me` → matches "one real page fetches and renders data through TanStack Query"
- [ ] Log in with a wrong password → inline error "Identifiant ou mot de passe incorrect" shown, no navigation
- [ ] Submit the login form with an empty email/password → Zod/React Hook Form field errors shown, no request sent
- [ ] Switch the browser/OS language to a Malagasy locale (or call `i18n.changeLanguage('mg')` in devtools) → login and dashboard strings render in Malagasy
- [ ] On the dashboard, click the avatar → "Se déconnecter" → session cleared, redirected to `/auth/login`
- [ ] Load the dashboard once online, then go offline (devtools Network → Offline) and reload → the already loaded `/auth/me` data still renders from the persisted Query cache, no blank/broken screen
- [ ] `npm run build` in `web/` → service worker (`dist/sw.js`) is generated and the built app installs (Chrome install prompt / "Add to Home Screen")

## Commands

- [ ] `npm run build` (in `web/`) → exits 0, `tsc -b` and `vite build` both succeed
- [ ] `npx eslint .` (in `web/`) → no errors
- [ ] `npm test` (in `web/`) → all Vitest + React Testing Library tests pass

## Acceptance-criteria coverage

- Root layout checks auth once via `/auth/me` · covered by the offline/dashboard steps above (loader in `src/routes/__root.tsx`)
- Protected routes redirect to `/auth/login` when not authenticated · covered by the first UI step (`src/routes/_authenticated.tsx`)
- A 401 triggers a single flight silent refresh and retry · not independently exercisable from the UI without expiring a token mid-session; covered by code review of `src/lib/api/client.ts`'s interceptor, cross-referenced against spec 0001-authentication's **AC-6** (rotated refresh token reuse revokes the session) — the single flight guard exists specifically to avoid triggering that revocation
- At least one real page fetches and renders data through TanStack Query · covered by the dashboard login step
- Forms validate through React Hook Form + Zod · covered by the empty-submit step
- French and Malagasy both resolve through react-i18next · covered by the language switch step
- The app installs and shows already loaded data offline · covered by the offline reload and install steps
- Errors are reported to the self hosted Rustrak instance · not verifiable without a running Rustrak instance and a `VITE_SENTRY_DSN` configured; `src/lib/sentry/index.ts` initializes `@sentry/react` only when that env var is set — verify by pointing a real DSN at a Rustrak instance and confirming a thrown error appears there
- The test runner (Vitest + React Testing Library) passes on the scaffold · covered by the `npm test` command above
