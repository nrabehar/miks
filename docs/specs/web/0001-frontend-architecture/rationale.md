# 0001. Frontend architecture, rationale

## Context

`web/` is a bare Vite plus React 19 scaffold: Tailwind v4 and shadcn are wired up, and `App.tsx` renders nothing but a heading. There is no router, no way to fetch data from the API, no shared state handling, no form library, and no test runner. Nothing in `web/` has an `AGENTS.md` yet, and no `docs/scope/web` exists, so this is the first decision recorded for the frontend.

The backend already has a working, accepted authentication design (spec [0001](../api/0001-authentication/index.md)): a short lived access token and a longer lived refresh token, both issued as httpOnly cookies for a web caller (and as a bearer header for a future mobile app), with rotation on every refresh and revocation on reuse. The web app is served from the same origin as the API through an Nginx reverse proxy (`web/nginx.conf.template` proxies `/api/` straight to the backend), so the cookie based flow works without any cross site cookie complexity. This is a fixed constraint this spec designs around, not a choice it makes.

MIKS targets cooperative savings groups ("tontines") in Madagascar first. The product's own documentation already treats French and Malagasy as both needed, and connectivity in the target market is not always reliable, so both language and offline behavior are real, product level forces on this decision, not nice to haves. At the same time, MIKS never holds member money itself: it only records declarations and shows calculated shares, so any decision about what can happen offline has to respect that money moving actions are the one place accuracy cannot be fudged by a later sync.

The consequence of not deciding this now is that the first real feature built on `web/` would have to invent routing, data fetching, and auth wiring ad hoc, likely inconsistently with whatever the second feature invents, and the httpOnly cookie based auth model would have to be rediscovered by whoever builds the first protected page.

## Options considered

### Option 1: A TanStack centered stack (chosen)

TanStack Router for routing, TanStack Query for server state, Zustand for the small remainder of client state, React Hook Form with Zod for forms, Axios for the HTTP layer, react i18next for language, a service worker with a Query cache persister for offline reads, Vitest and React Testing Library for tests, Sentry's SDK against a self hosted Rustrak for errors.

**Pros**:
- Every piece is a current, actively maintained, widely used choice for a React 19 plus Vite single page app; none of it is exotic.
- TanStack Router and TanStack Query share the same maintainers and integrate directly (a route loader can prefetch straight into Query's cache), so the two central pieces of the stack are not fighting each other.
- Full TypeScript inference on routes and params, matching the project's existing type strict style.

**Cons**:
- Nine libraries chosen together for a workspace with zero built features is a lot to scaffold before any real page exists.
- TanStack Router is younger and has a smaller community than React Router, so fewer blog posts and Stack Overflow answers exist if something unusual goes wrong.

### Option 2: A minimal dependency stack

React Router (for routing only), React Context and `useState` (no Zustand), native `fetch` (no Axios), no i18n library at launch, no offline support at launch, decide testing later.

**Pros**:
- Far fewer dependencies to learn, patch, and upgrade; closer to "just React."
- Nothing here would need undoing if it turns out unnecessary, since so little was added.

**Cons**:
- Punts on i18n and offline, both of which this product's own market makes likely needs, not speculative ones; retrofitting i18n after components exist means touching every one of them again.
- Native `fetch` has no interceptor concept, so the 401, then refresh, then retry flow the httpOnly cookie model requires would have to be hand rolled and repeated, or wrapped in an ad hoc helper that becomes its own maintenance burden.
- Context plus `useState` for genuinely shared, cross screen state (the active workspace, for example) tends to cause unnecessary re renders and prop drilling as more of it accumulates; Zustand avoids that at very low cost.

### Option 3: Move to a full meta framework (Next.js style)

Replace the Vite SPA with a server rendering React framework, gaining built in routing, data loading conventions, and server rendering.

**Pros**:
- Server rendering and built in routing come "for free," and a large ecosystem exists around the leading frameworks.

**Cons**:
- MIKS's entire app sits behind a login; there is no public, search indexed content that would benefit from server rendering or SEO, which is the main reason to reach for a meta framework in the first place.
- This would mean throwing away the Vite scaffold already built and re platforming, a real cost with no matching benefit here.
- The httpOnly cookie auth model this app already has works cleanly with a plain SPA; a server rendering framework adds its own, different set of auth wiring questions (server side session reading) that this project does not need to take on.

## Rationale

Option 1 was chosen because every one of its individual pieces answers a force already named in Context: the type strict routing and forms layer matches the project's existing style, the httpOnly cookie constraint from spec 0001 is best served by Axios's interceptor model rather than hand rolled fetch retries, the target market's Malagasy plus French requirement is cheapest to satisfy by wiring i18n in before any component exists rather than after, and the same market's connectivity reality is what justifies taking on a service worker and offline cache at all, scoped down to reads only so it does not have to solve conflict resolution for money moving writes.

Option 2 was rejected specifically because its savings (fewer dependencies) come at the direct cost of the two forces this product cannot treat as optional: language and offline viewing. Option 3 was rejected because its main benefit, server rendering for public, search indexed pages, does not apply to an app that sits entirely behind a login; it would be paying a real re platforming cost for a benefit MIKS cannot use.

The engineer's own picks throughout the stack walk (TanStack Router plus Query over React Router, Zustand over Context, Axios over bare fetch, full offline support scoped to reads, react i18next for both languages, Vitest plus React Testing Library, Sentry's SDK against a self hosted Rustrak instead of Sentry's own paid service) are all reflected as the chosen values in the Proposed stack table; none of them conflicts with the reasoning above, so no engineer preference was overridden here.

## References

**Project sources** (verifiable, in this repo):
- `docs/specs/api/0001-authentication/index.md`, the httpOnly cookie plus bearer header auth model this frontend must wire against
- `web/nginx.conf.template`, the same origin `/api/` reverse proxy that makes cookie based auth workable without cross site CORS
- `web/package.json` and `web/components.json`, the already chosen Tailwind v4 plus shadcn UI layer this spec keeps
- `web/src/features/README.md`, the existing feature folder convention this spec builds on top of, not around

**Practices & standards**:
- httpOnly cookies for access and refresh tokens, so no frontend script can read them (OWASP session management guidance)
- Retrofitting internationalization after components exist typically requires touching every one of them again; wiring the i18n library in before the first component is cheaper

**Links** (web verified, checked during the design conversation):
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand.docs.pmnd.rs/) · [Zustand on GitHub](https://github.com/pmndrs/zustand)
- [React Hook Form](https://react-hook-form.com/)
- [TanStack Form](https://tanstack.com/form/latest) (the alternative considered and passed over for React Hook Form)
- [Fetch API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) (the alternative to Axios that was passed over)
- [Sentry React 19 support](https://sentry.io/changelog/react-19-support/)
- [Rustrak](https://github.com/AbianS/rustrak), the self hosted, Sentry SDK compatible error tracker chosen over Sentry's own hosted service
