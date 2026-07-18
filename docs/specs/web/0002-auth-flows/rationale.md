## Context

Spec [0001](../0001-frontend-architecture/index.md) settled the frontend's whole auth foundation: cookie only sessions, the single flight refresh interceptor, and the feature folder shape. Only the login screen was built on top of it (`web/src/routes/auth/login.tsx`, `web/src/features/auth/`). The backend (api spec [0001](../../api/0001-authentication/index.md)) already exposes register, verify email, resend verification, forgot and reset password, Google and Facebook OAuth, and a sessions list with per session revoke, all fully built and accepted. None of this has a frontend surface yet.

Two backend gaps surfaced while designing this: `GET /auth/me` does not currently return whether the user's email is verified (verification lives on `UserIdentity`, not `User`, and `AuthenticatedUser` never reads it), and the OAuth callback redirects straight to the app's root URL rather than to a route a popup window could safely land on and signal back from. Both are small, additive reads or a redirect target change, not a change to anything already shipped, so this spec folds them in rather than opening a separate backend spec for either.

The account model deliberately lets a user in before their email is verified (api spec 0001's AC-3); the frontend's job is to reflect that honestly, a soft nudge rather than a gate, everywhere a verification state would otherwise matter.

## Options considered

### Option 1: Build all four flows now, reusing the existing feature folder and stack as is

Extend `web/src/features/auth/` and `web/src/routes/auth/` with the missing screens, using the same React Hook Form, Zod, TanStack Query, and Axios pieces the login screen already uses. Add the two small backend touches (an emailVerified read, and an OAuth callback redirect target) to support the banner and the popup flow.

**Pros**:
- No new library, no new pattern; every screen follows the shape the login screen already set, which keeps the codebase consistent and cheap to review.
- The backend already has every endpoint these screens need; this is pure frontend plus two small backend reads, not a new integration.

**Cons**:
- Four flows in one pass is a fair amount of screen surface to review and test together.

### Option 2: Split into separate specs per flow (register, password reset, OAuth, sessions)

Treat each flow as its own spec and build them one at a time.

**Pros**:
- Smaller, more reviewable specs; a flow can ship and be verified independently of the others.

**Cons**:
- These four flows share the same underlying pattern (a form, a mutation, a route) and the same two small backend touches; splitting them multiplies the spec overhead for very little independent value, since none of them is genuinely complex enough to need its own decision record.

## Rationale

The engineer chose to scope all four flows into this one pass rather than split them. None of the four introduces a new tool, a new pattern, or a data model of its own; they are all a form, a mutation, and a route built exactly the way the login screen already was, which is what makes Option 1 the right call over the more granular Option 2. Splitting them into four specs would mostly duplicate the same Context and Decision text four times without adding independent value, since the two backend touches and the shared conventions apply to all of them equally.

On the OAuth transport specifically: the engineer picked the popup flow over the simpler full page redirect this project's cookie only session model would otherwise favor. A full page redirect needs zero new plumbing, since the backend already redirects straight to the app and the cookies are already set by the time it lands. The popup flow costs a dedicated callback route, `postMessage` plumbing with an origin check, and a popup blocked fallback, all to avoid the main app unmounting during the round trip. That cost was accepted deliberately (see the Backend touch confirmation in the design conversation) in exchange for the login screen never visibly reloading during an OAuth login.

On the email verification banner: dismissing it is session scoped (sessionStorage), not a permanent per user preference, because there is no backend field to persist a "don't show again" choice, and adding one purely for a UI banner was judged not worth a schema change for a nudge that is not a gate to begin with.
