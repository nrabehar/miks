# 0001. Frontend architecture (routing, data, state, forms, and offline foundation)

**Date**: 2026-07-18
**Status**: Accepted

## Summary

This decides the whole foundation for the MIKS web app, which today is an empty Vite and React scaffold with nothing wired up yet. It picks one cohesive set of tools for routing, talking to the API, remembering data, handling forms, showing the app in French and Malagasy, working while offline, and catching crashes. Every future page and feature is built on top of this choice, so getting it right now avoids a rework later.

## Decision

**Chosen option**: Option 1, the TanStack centered stack (see [rationale.md](rationale.md) for the alternatives considered)

Build the app as a single page app (a page that updates itself without full reloads) using TanStack Router for pages and navigation, TanStack Query to fetch and cache data from the API, Zustand for small bits of shared screen state, React Hook Form with Zod for forms and their validation, Axios to talk to the API, react i18next for French and Malagasy text, a service worker (via vite plugin pwa) so the app installs and keeps working for viewing on a bad connection, Vitest and React Testing Library for tests, and the Sentry SDK pointed at a self hosted Rustrak server for catching crashes without paying for a third party service.

**Implementation skills**: `tanstack-router-best-practices` (`deckardger/tanstack-agent-skills`, `web/.claude/skills/tanstack-router-best-practices/`) · `tanstack-query-best-practices` (`deckardger/tanstack-agent-skills`, `web/.claude/skills/tanstack-query-best-practices/`) · `zustand` (`lobehub/lobehub`, `web/.claude/skills/zustand/`) · `react-hook-form` (`pproenca/dot-skills`, `web/.claude/skills/react-hook-form/`) · `zod` (`pproenca/dot-skills`, `web/.claude/skills/zod/`) · `vitest` (`antfu/skills`, `web/.claude/skills/vitest/`) · `react-testing-library` (`itechmeat/llm-code`, `web/.claude/skills/react-testing-library/`) · `sentry-sdk-setup` (`getsentry/sentry-for-ai`, `web/.claude/skills/sentry-sdk-setup/`) · `shadcn` (`shadcn/ui`, `web/.claude/skills/shadcn/`)

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Routing | TanStack Router v1.170 | Every path, param, and search value is checked by TypeScript, which matches the project's existing strict, type first style (Zod on the backend already), and its route loaders plug straight into Query's cache (basis: `AGENTS.md` style, type safety already valued in the project) |
| Data fetching (server state) | TanStack Query v5.101 | The standard caching, retry, and loading state layer for a React app talking to a REST API; works natively with React 19's newer rendering hooks |
| Client/UI state | Zustand v5 | Tiny (about 3KB), little boilerplate, for the small amount of state that is not server data (current workspace picked, sidebar open, in progress vote UI); server data itself always stays in Query, never duplicated into a store |
| Forms and validation | React Hook Form v7.80 + Zod v4 | The current default pairing for React forms; Zod schemas can mirror the shapes the NestJS DTOs already validate on the backend, so the same rules are expressed once in spirit on both sides |
| HTTP client | Axios | Its interceptor system is used to make the 401, then silent refresh, then retry flow (see below) one small, central, declarative piece of code instead of hand rolled fetch wrapping |
| Auth and session wiring | No token is ever read or stored in JavaScript; the access token lives only in an httpOnly cookie set by the API (per spec [0001](../api/0001-authentication/index.md)) | The frontend cannot see the token even if it wanted to, which removes a whole class of token theft risk; the app instead asks the API "who am I" once per app load |
| App load auth check | One `GET /auth/me` call in the root route's loader, cached by Query | Confirms who is logged in exactly once per app load rather than once per navigation, then every protected route reuses that cached answer |
| Session refresh | An Axios response interceptor: on a 401, call `/auth/refresh` once, then retry the original request; if the refresh itself fails, force logout and redirect to `/auth/login` with a session expired message. The interceptor is single flight: if several requests 401 at the same moment, only the first triggers `/auth/refresh`, and the rest wait for that one result and retry with it | Matches spec 0001's refresh rotation model exactly; without the single flight guard, two requests 401ing at once would each call `/auth/refresh`, and the second would replay an already rotated token, which spec 0001's **AC-6** treats as reuse and revokes the whole session, force logging the user out for no real reason |
| Cross site request forgery (CSRF) posture | Refresh and access cookies are set `SameSite=Lax` (already implied by same origin deployment through the Nginx proxy); mutating requests additionally require a custom header (for example `X-Requested-With`) that only same origin JavaScript can set, which a cross site form post cannot replicate | A cookie sent automatically by the browser needs an explicit CSRF stance; `SameSite=Lax` plus a custom header check on state changing requests is the standard, low cost pairing for a same origin app like this one |
| Content Security Policy | Extend the existing CSP in `web/nginx.conf.template` (`connect-src 'self'`) to also allow the Rustrak ingestion host, and add a service worker aware `script-src`/`worker-src` entry once vite plugin pwa is wired in | The CSP already set by Nginx would otherwise silently block both the Sentry SDK's calls to Rustrak and the service worker itself; this has to be reconciled, not left implicit |
| Environment and config | A small, typed config module (validated once at boot, for example with Zod) reading `VITE_API_URL` (already present), plus new variables this stack needs: the Rustrak DSN, and any i18n or PWA specific flags | Every one of the new tools above needs at least one environment value; validating them once at startup, failing loudly if one is missing, is cheaper than discovering a blank DSN in production |
| Role based UI | A `useWorkspaceRole()` hook reading the current workspace's membership row | `WorkspaceMember.role` (admin, member, observer) is per workspace, separate from the app wide `User.role`; centralizing the read avoids each component re deriving the same check |
| Language (i18n) | react-i18next, French at launch, Malagasy structured in from day one; amounts, dates, and numbers formatted through the browser's built in `Intl` APIs rather than hand written string formatting | The product's first market is Madagascar; wiring the translation layer now, even with only French strings shipped first, avoids touching every component again later to retrofit it. `Intl.NumberFormat` (for MGA, the local currency) and `Intl.DateTimeFormat` handle locale specific formatting correctly without a second library |
| Offline and installability | vite plugin pwa (service worker and installability) plus TanStack Query's cache persister to IndexedDB (via idb-keyval) | Lets a user view already loaded balances, history, and workspace data while offline or on a bad connection, which matters for the target market's connectivity; actions that change money state stay blocked offline rather than queued (see Consequences) |
| Toast and transient UI feedback | sonner | shadcn's own recommended pairing; used for mutation success and error messages so they do not block the screen |
| UI kit and styling | shadcn/ui + Tailwind CSS v4 | Already chosen and partly scaffolded (`web/package.json`, `web/components.json`); this spec keeps it, does not revisit it |
| Testing | Vitest + React Testing Library | The standard pairing for a Vite project; set up now so every feature built afterward has a place to add its tests |
| Accessibility and route level code splitting | shadcn's components are built on Radix primitives, which already handle keyboard and screen reader behavior correctly; each top level route is code split (TanStack Router's lazy route loading) so the initial download stays small as more pages are added | Accessibility is cheapest to get right by picking a UI kit that already does it, not by auditing afterward; code splitting per route avoids the whole app's JavaScript loading before the first screen shows, which matters again for the target market's connection quality |
| Crash and error reporting | `@sentry/react`, pointed at a self hosted Rustrak instance (a lightweight, Sentry SDK compatible, self hostable error tracker) instead of Sentry's own paid service | Keeps crash visibility (important for a financial app, where a silent failure is costly) while staying on the project's existing self hosted, Docker based deployment model rather than adding a new paid vendor |

## Consequences

**Positive**:
- One coherent, type checked path from a URL, to a data fetch, to a rendered screen; very little of this needs to be hand rolled per feature.
- No frontend code ever touches a raw access token, which removes an entire category of credential theft (XSS reading `localStorage`, for example).
- The app is usable for viewing data on a poor connection from day one, which matters for the product's target market.
- French and Malagasy are structured in from the start; adding the second language later is a translation task, not a refactor.
- Crash reporting exists from day one without adding a new billed vendor, since Rustrak runs alongside the project's existing self hosted infrastructure.

**Negative and tradeoffs**:
- This is a wide foundation to take on in one pass: about a dozen new libraries plus a service worker, for a workspace that today has zero features built. Everything here has to be scaffolded before the first real page is built (see Follow up).
- Rustrak (the self hosted error tracker) is a small, newer project, not a battle tested one like the better known GlitchTip; it is confirmed to be a real, Sentry SDK compatible, self hostable tracker (Rust backend, Postgres or SQLite, Docker), but it carries more operational risk than a project with a longer track record. If it proves unreliable to run, GlitchTip is the proven fallback and needs no frontend change (the same `@sentry/react` SDK, pointed at a different DSN).
- Full offline support was chosen but deliberately narrowed to cached reads only; recording or approving anything that moves money still requires a live connection. This is a real product limitation on a flaky connection, not a full offline first app; it was accepted to avoid the conflict resolution problem of replaying financial writes made while offline.
- A service worker and an IndexedDB backed cache are genuinely harder to debug than a plain SPA ("why is the user seeing stale data" becomes its own class of bug); this cost is accepted for the connectivity benefit.
- Running Rustrak self hosted means the team, not a vendor, is responsible for keeping the error tracker itself up and running; if it goes down, so does crash visibility, right when something else may also be going wrong.
- About a dozen new dependencies (plus their transitive ones) is more surface for security patching and version upgrades than a minimal stack would carry.

**Neutral**:
- `web/` gets its own `AGENTS.md` once the first feature is built, mirroring `api/AGENTS.md`'s structure (see Follow up).
- The features folder convention already documented in `web/src/features/README.md` (one folder per business feature) is unaffected by this spec and continues to apply.

## Follow-up

- [ ] No `docs/scope/web` exists yet; create it (via `/scope`) once the first concrete frontend feature is picked, so this spec can be linked from a feature row.
- [ ] `web/AGENTS.md` does not exist yet; once the scaffold from this spec is built, add it (via `/sync`), documenting the routing, data, and state conventions decided here, mirroring how `api/AGENTS.md` documents the backend.
- [ ] The `react-i18next` agent skill (`yildizberkay/skills@react-i18next`, a low adoption skill, 94 installs at discovery time) was found but not offered in the installed set above; install it manually if useful: `npx skills add yildizberkay/skills@react-i18next -y` (run from `web/`).
- [ ] Two MCP servers were chosen; connecting either is a user side configuration step this tool cannot perform. For Sentry MCP, note that the official server (`getsentry/sentry-mcp`) targets Sentry's own hosted API; whether it also understands Rustrak's issue endpoints is not yet confirmed, unlike GlitchTip which already has a dedicated community MCP server (`mcp-server-glitchtip`) built specifically for its API shape. Check this before relying on it; a Rustrak specific or generic Sentry protocol compatible MCP may be needed instead. For Orval MCP (`@orval/mcp`), note it generates an MCP server from the API's OpenAPI spec for live agent access, a different feature from Orval's separate React Query hook code generation; pin it to `>=7.18.0`, since earlier versions carry a known code injection advisory (CVE-2026-22785).
- [ ] No Agent Skill or MCP server was found for Axios, vite plugin pwa, idb-keyval, or sonner at discovery time; nothing to install, just build against their own documentation.
- [ ] If genuine demand later emerges for offline writes on low risk, non financial actions (for example marking a notification read while offline), revisit that as its own small decision rather than folding it into this one.
- [ ] Rustrak needs its own deployment (a Docker service) alongside the project's existing Nginx and Dokploy setup; this spec does not cover standing that up.

## Rationale

Full reasoning, the alternatives considered, and references: see [rationale.md](rationale.md).
