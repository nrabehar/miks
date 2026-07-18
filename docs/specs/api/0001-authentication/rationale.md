# 0001. Authentication — rationale

## Context

MIKS has no working authentication yet. The Prisma schema already models `User`, `AuthProvider`, `UserIdentity`, `VerificationToken`, `Device`, and `Session`, and the API configuration already reads JWT secrets and expiry settings, but no NestJS module reads or writes any of it. Every other planned feature (groups, contributions, votes) depends on knowing who is making a request, so this is a hard prerequisite that has to be settled before feature modules can be built.

The product targets Madagascar and similar markets first (see the product doc), where phone number based identity and WhatsApp are often more reliable reach channels than email. The team also intends to ship a mobile app later, so the authentication mechanism cannot assume a browser (cookies alone are not viable for a native app).

The account model deliberately trades some safety for less friction: an account is usable immediately after registration, and verification of the identifier (email or phone) happens after the fact rather than gating access. This means downstream modules that require a verified identity (if any ever do) must check verification status themselves; this spec only records that the identity's verification flag exists and can be set.

> ⚠️ Premise note: this spec covers three OAuth providers (Google, Facebook, Apple) plus email and phone/password, all in one version. That is a wide surface for a first authentication release; a narrower first slice (email + phone/password only, OAuth as a fast follow) would ship sooner and de-risk the core flow before adding three third party integrations. The engineer explicitly requested all methods together (including anticipating a mobile app, which makes Apple's requirement relevant early), so this spec proceeds with the full scope as instructed, but the build plan sequences local auth first and OAuth last specifically so the core, most used path is solid before the third party integrations are added.
>
> **2026-07-17 update**: this premise note's worry played out. Apple and WhatsApp turned out to be blocked on external setup neither could complete yet (see the addendum below), while local auth + Google + Facebook shipped and are working. The scope trim below is that narrower slice arriving after the fact rather than up front.

## 2026-07-17 addendum: drop Apple, WhatsApp, and the phone identifier for now

**What changed**: `AppleStrategy`/`apple-auth.guard.ts`, `src/lib/whatsapp/` (`WhatsappService`/`WhatsappModule`), and the phone number identifier (`RegisterDto.phone`, `AuthService.register`'s email-or-phone branch, `NotificationDeliveryService`'s WhatsApp branch, the `apple` `AuthProvider` seed row, the `PHONE_VERIFICATION` purpose seed row) were removed from the codebase. The active surface is now email + password locally, plus Google and Facebook OAuth, both configured with real client keys.

**Alternatives considered**:
- **Keep building toward Apple + WhatsApp now, ship once credentials arrive.** Rejected: neither credential is close (Apple needs a Developer account, Services ID, and generated private key; WhatsApp needs a verified Meta Business account, a registered phone number, and approved message templates), so the code would sit unexercised and untestable for an unknown stretch, exactly the failure mode already flagged in the original Follow-up.
- **Feature flag Apple/WhatsApp off instead of deleting the code.** Rejected for this pass: the code had never run against real credentials (Apple) or had a documented runtime failure with no credentials (WhatsApp: `TypeError: fetch failed`/`ECONNRESET` on send, see `verify.md`), so there was no working behavior to preserve behind a flag; deleting is cleaner than carrying dead branches, and re-adding later is a normal `/architect` + `/develop` pass, not a big lift.
- **Drop the phone identifier's DB column too.** Rejected: `User.phone` stays nullable and unused rather than migrated out, so re-adding phone registration later needs no new migration, only code.

**Main reason**: Google and Facebook client keys are real and ready now; Apple and WhatsApp are not, and won't be soon (both need an external account/verification step outside this codebase). Shipping the surface that actually works, and removing the surface that cannot yet run, is more honest than leaving unusable integrations in place.

**Tradeoffs accepted**:
- The product's phone number first target market reasoning (`## Context` in `index.md`, and `docs/cahier-des-charges.md` section 3.2) is now unserved until phone + WhatsApp comes back; this is explicitly a deferral, not a reversal of that market reasoning.
- Re-adding Apple and WhatsApp later is a small implementation pass (new strategy/guard/module files, config, seed rows), not a config flip, since the code was deleted rather than disabled behind a flag.
- The spec's original AC-1 (OAuth via Apple), AC-4/AC-8 (WhatsApp delivery) are currently not met; `index.md`'s Requirements section marks each as deferred rather than removing the criteria outright, so re-adding the feature re-activates the same ACs instead of drafting new ones.

## 2026-07-18 addendum: device aware sessions and new device confirmation

**What changed**: a `DeviceService` now creates and looks up `Device` rows (previously dead schema), `AuthService.createSession` checks a device's status before issuing tokens, and two new endpoints (`/auth/device/confirm`, `/auth/device/resend-confirmation`) let a user confirm a device they have never used before. Reconnecting from an already active device reuses its existing `Session` instead of creating a new one every login.

**Alternatives considered, device identification**:
- **Client generated device ID (chosen)**: a random ID the client creates once and resends on every auth call (a header for a direct API call, a cookie for the web app to survive the OAuth redirect). Reliable across IP changes and browser updates, and the only option that also works cleanly for the planned mobile app.
- **Server side fingerprint (User-Agent + IP hash)**: no client change needed, but breaks whenever the IP changes (common on mobile networks) or the browser updates its User-Agent string, so "same device" would misfire often. Rejected as unreliable for the stated goal.
- **User-Agent string match only**: simplest, but even less reliable, since different physical devices can share an identical User-Agent string. Rejected.

**Alternatives considered, unrecognized device handling**:
- **Block until confirmed (chosen)**: a correct password from an unrecognized device does not issue tokens until the device is confirmed by an emailed code. Matches the Google style behavior the engineer explicitly asked for, and closes the gap where a stolen password alone is enough to fully authenticate.
- **Allow login immediately, notify after the fact**: tokens issue right away, an email is sent as an FYI the user can react to. Rejected: a stolen password would fully succeed before anyone could react, which is exactly the gap this addendum exists to close.
- **Emailed confirmation link instead of a code**: rejected, since a link opens a browser instead of the app on mobile and needs a public confirm page; a code entered back in the app works the same on web and the future mobile app and reuses the existing `VerificationToken` code pattern.

**Alternatives considered, reconnect behavior**:
- **Reuse the existing Session for a known device (chosen)**: updates its `refreshToken`/`lastActiveAt` in place. One row per device in the session list, and it is literally what this addendum was asked to build ("une reconnexion depuis le même appareil doit réutiliser la session existante").
- **Always create a new Session, linked to the same Device**: allows multiple concurrent sessions per device (separate browser profiles, incognito), rejected as unnecessary complexity the request did not ask for.
- **Revoke the old Session and issue a fresh one on every reconnect**: guarantees one live session per device without ever updating a row in place, but changes the session id on every login, rejected for no material benefit over an in place update.

**Main reason**: the schema already modeled `Device` and `Session.deviceId` when this spec was first written, but nothing in the codebase ever used them; this addendum is finishing that already started design, not introducing a new one, the same reasoning that favored Option 1 below for authentication as a whole. A client generated device ID is the only mechanism in the alternatives that is both reliable and mobile ready, matching this spec's existing "no browser only assumptions" constraint (`## Context`).

**Tradeoffs accepted**:
- A confirmation code is one extra step on the first login from any new browser, a deliberate security for friction tradeoff, not an oversight.
- A `Device` previously revoked returns to `pending` on reconnect rather than getting a fresh row, to respect the existing `@@unique([userId, deviceId])` constraint; this was a refinement made while writing the spec, not a separate question asked of the engineer, since the alternative (a new row per revoke cycle) would have broken that constraint.
- The engineer flagged wanting stronger recognition later (a real device fingerprint, or Apple ID/biometric signals); this addendum ships the client generated ID only and records the rest as a Follow-up, not a rejection of the idea.
- Login now hard depends on email deliverability for a new device, extending a risk the product already accepted for password reset (a user with no email access is already locked out of resetting a forgotten password) to a second flow, rather than introducing a materially new one.

**Same model cross check (2026-07-18) and fixes applied**: a same session model, read only critique pass was run against this addendum before it was accepted. It found one real design flaw and two hardening points, all fixed in `index.md` before acceptance:
- **Fixed**: the first draft revoked a `Device` on *any* session end, including an ordinary logout, since it reused the pre-existing `Session` revocation wording verbatim. Because this addendum reuses one `Session` per `Device`, that meant a normal logout would force the email confirmation dance again on the very next login from the same, already trusted laptop. Narrowed so only an explicit session revocation (`DELETE /auth/sessions/:id`) or refresh token reuse detection demotes a `Device`; logout ends the session but leaves the device trusted.
- **Fixed**: the `device_id` cookie was originally client generated (written by page JavaScript), readable and forgeable by any script running on the page (an XSS payload). Changed to a server set, `httpOnly` cookie (set on the first unauthenticated request that lacks one) so a page script can no longer read or forge it; the residual risk (theft via malware or a fully synced, compromised browser profile) is now stated explicitly in Security model and Consequences instead of being implied away as fully closed.
- **Fixed**: the first draft had no explicit answer for two concurrent first time logins from the same new device racing to create the same `Device` row. `DeviceService`'s find-or-create is now specified as an upsert on `(userId, deviceId)` with a unique-violation fallback re-fetch.
- **Noted, not changed**: the critique also flagged that blocking token issuance on email confirmation makes login newly dependent on email deliverability. This is an accepted, explicit tradeoff (see above), consistent with the risk the product already carries for password reset, not a new failure mode introduced without acknowledgement.

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
