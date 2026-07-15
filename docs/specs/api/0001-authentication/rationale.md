# 0001. Authentication — rationale

## Context

MIKS has no working authentication yet. The Prisma schema already models `User`, `AuthProvider`, `UserIdentity`, `VerificationToken`, `Device`, and `Session`, and the API configuration already reads JWT secrets and expiry settings, but no NestJS module reads or writes any of it. Every other planned feature (groups, contributions, votes) depends on knowing who is making a request, so this is a hard prerequisite that has to be settled before feature modules can be built.

The product targets Madagascar and similar markets first (see the product doc), where phone number based identity and WhatsApp are often more reliable reach channels than email. The team also intends to ship a mobile app later, so the authentication mechanism cannot assume a browser (cookies alone are not viable for a native app).

The account model deliberately trades some safety for less friction: an account is usable immediately after registration, and verification of the identifier (email or phone) happens after the fact rather than gating access. This means downstream modules that require a verified identity (if any ever do) must check verification status themselves; this spec only records that the identity's verification flag exists and can be set.

> ⚠️ Premise note: this spec covers three OAuth providers (Google, Facebook, Apple) plus email and phone/password, all in one version. That is a wide surface for a first authentication release; a narrower first slice (email + phone/password only, OAuth as a fast follow) would ship sooner and de-risk the core flow before adding three third party integrations. The engineer explicitly requested all methods together (including anticipating a mobile app, which makes Apple's requirement relevant early), so this spec proceeds with the full scope as instructed, but the build plan sequences local auth first and OAuth last specifically so the core, most used path is solid before the third party integrations are added.

## Options considered

### Option 1: Self hosted authentication with NestJS, Passport.js, and JWT

Build directly on the existing schema using `@nestjs/passport` strategies for each login method, argon2 for password hashing, and hand rolled JWT access/refresh issuing and rotation.

**Pros**:
- Full control over the data model already designed (no need to bend a third party's user model onto the existing `User`/`UserIdentity`/`Session` tables).
- No new operational dependency or per user cost; scales with the app's own infrastructure.
- `@nestjs/passport` is the standard, well documented path for exactly this shape of problem (multiple credential types funneling into one session model) in the NestJS ecosystem.

**Cons**:
- The team owns correctness for token rotation, lockout, and OAuth callback handling; each is a place real security bugs happen if implemented carelessly.
- More code to write and test than adopting a managed provider.

### Option 2: Hosted auth provider (e.g. Auth0, Clerk, Supabase Auth, Firebase Auth)

Delegate identity, sessions, and OAuth entirely to a third party auth service; the API would only verify tokens issued by that provider.

**Pros**:
- Removes almost all authentication specific code and security surface from the team; token rotation, lockout, and OAuth callbacks are the vendor's problem.
- Fast to stand up for the common methods (email/password, Google, Facebook).

**Cons**:
- The schema already models identity and sessions in detail (`UserIdentity`, `Device`, `Session`); adopting a hosted provider means either running a duplicate identity system or migrating away from the existing schema, undoing already completed design work.
- Per user or per monthly active user pricing adds a recurring cost tied to a metric (signups) the product cannot fully predict yet.
- WhatsApp Business Cloud API delivery for OTP/verification, needed for the phone heavy target market, is not a first class feature of these providers and would still need custom integration on top, reducing the benefit of outsourcing.
- Less control over the exact lockout policy (5 attempts / 15 minutes) and the phone first identity model this product needs.

### Option 3: Fully custom authentication without Passport.js

Hand write the credential validation, JWT issuing, and OAuth code exchange without the Passport.js abstraction.

**Pros**:
- No dependency on Passport's strategy abstraction; slightly less indirection for a team that finds it unfamiliar.

**Cons**:
- Reimplements OAuth 2.0 authorization code exchange for three different providers from scratch, work Passport's strategies already do correctly and are widely used in production.
- Loses the ecosystem benefit of `@nestjs/passport`'s guard integration, meaning more custom guard code to write and maintain.

## Rationale

Option 1 fits the situation precisely: the schema was already designed with a self hosted identity model in mind (`AuthProvider`/`UserIdentity` mirrors exactly what Passport strategies plug into), so building on it is finishing a design already started, not starting fresh. Option 2 would either strand that schema work or force an awkward parallel identity system, and still would not solve WhatsApp delivery, a requirement specific to this product's target market that a generic hosted provider does not carry. Option 3 pays the cost of reinventing OAuth handling that Passport already solves, for no material benefit given the team is already building in the NestJS ecosystem where `@nestjs/passport` is the well trodden path.

The double cookie/header transport mode (chosen during the design conversation) follows directly from the confirmed intent to add a mobile app later: solving it now, on the same endpoints, avoids a second authentication surface being designed from scratch when the mobile app arrives.

Refresh token rotation (rather than a long lived reusable refresh token) was chosen because a reused, revoked token is a concrete signal of token theft that a non rotating scheme cannot detect at all; the operational cost is one extra row update per refresh, which is negligible.

Argon2 over bcrypt was chosen as the current OWASP recommended default for new systems; bcrypt remains an acceptable, more conservative alternative, but there is no reason to start a new system in 2026 on the older algorithm.

The WhatsApp Business Cloud API (direct integration with Meta) was chosen over a BSP intermediary because it is the most direct and least costly path at scale, and the engineer indicated comfort handling the setup directly; a BSP (e.g. Twilio, 360dialog) remains a fallback if the direct Meta onboarding proves too slow.

## References

**Project sources** (verifiable, in this repo):
- `api/prisma/models/account.prisma`, the existing `User`/`AuthProvider`/`UserIdentity`/`VerificationToken`/`Device`/`Session` models this spec builds on.
- `api/src/lib/config/configuration.ts`, the existing JWT/mail configuration this spec extends.
- `api/CLAUDE.md`, the project's convention: infra integrations get their own `@Global()` module under `src/lib/<name>/`; feature modules live under `src/module/<name>/`; shared guards/decorators live under `src/common/`.
- `docs/cahier-des-charges.md`, section 5.12 (compte, authentification et sécurité d'accès) and section 3.2 (marché cible), which frame the phone/WhatsApp first market and the anticipated JWT access/refresh design.

**Practices & standards**:
- OWASP guidance on password storage (argon2id as the current recommended default) and on refresh token rotation to detect reuse.
- Passport.js strategy pattern for pluggable, per credential type authentication in Express/NestJS applications.

**Links** (web verified):
- argon2 (Node.js password hashing library): https://www.npmjs.com/package/argon2
- @nestjs/passport (NestJS Passport integration): https://docs.nestjs.com/recipes/passport
- passport-jwt (JWT strategy for Passport): https://www.npmjs.com/package/passport-jwt
- passport-google-oauth20 (Google OAuth strategy): https://www.npmjs.com/package/passport-google-oauth20
- passport-facebook (Facebook OAuth strategy): https://www.npmjs.com/package/passport-facebook
- WhatsApp Business Cloud API (official docs): https://developers.facebook.com/docs/whatsapp/cloud-api/
- NestJS rate limiting (ThrottlerModule): https://docs.nestjs.com/security/rate-limiting
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
