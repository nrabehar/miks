# Authentication

Spec: [docs/specs/api/0001-authentication/index.md](../../../../docs/specs/api/0001-authentication/index.md).

## File pointers

- `src/modules/auth/` — `AuthController`, `AuthService`, `VerificationService`, local/JWT/Google/Facebook Passport strategies (`strategies/`), their guards (`local-auth.guard.ts`, `google-auth.guard.ts`, `facebook-auth.guard.ts`), DTOs (`dto/`).
- `src/lib/auth-token/` — `TokenService`: signs/verifies access + refresh JWTs, cookie helpers. `@Global()` module.
- `src/lib/password/` — `PasswordService`: argon2id hash/verify. `@Global()` module.
- `src/lib/mail/` — `MailService`: sends email via Resend.
- `src/lib/notification-delivery/` — `NotificationDeliveryService`: thin wrapper over `MailService`, the single entry point auth uses to send verification/reset codes (email only as of 2026-07-17; WhatsApp/phone delivery was removed, see the spec's 2026-07-17 addendum).
- `src/common/guards/` — `JwtAuthGuard` (validates the access token from either the `access_token` httpOnly cookie or an `Authorization: Bearer` header; applied globally as `APP_GUARD` in `app.module.ts`), `RolesGuard`.
- `src/common/decorators/` — `@Public()` (skips `JwtAuthGuard`, via `IS_PUBLIC_KEY` metadata), `@Roles(...)` (restricts to given `AppRoleType`s, via `ROLES_KEY` metadata, paired with `RolesGuard`), `@CurrentUser()`.

## Conventions

- `JwtAuthGuard` is registered as a global `APP_GUARD` in `app.module.ts`, not applied per route — routes are locked down by default; mark a route `@Public()` to exempt it.
- OAuth login (`Google`/`Facebook`) auto links to an existing `User` only when the provider asserts the email as verified; see `AuthService.validateOAuthLogin`.
- Refresh tokens rotate on every `/auth/refresh` call (same `Session` row updated in place); replaying an already rotated refresh token revokes the session.
- **`AuthenticatedUser`/`AuthenticatedIdentity` carry `emailVerified: boolean`**, read from the user's **local** (`providerCode: 'local'`) `UserIdentity` row, never from `User` itself (`User` has no such column). Resolved in `JwtStrategy.validate` and `AuthService`'s private `toAuthenticatedIdentity` (which accepts an already known value to skip a redundant query, e.g. `validateLocalLogin` already has the identity in hand). No local identity at all (an OAuth only user) → defaults to `true`: there is nothing pending verification for an account that was never asked to verify an email.
- **`completeOAuthLogin` redirects to `${webUrl}/auth/oauth-callback`**, not the bare `webUrl`: the frontend needs a dedicated landing route to `postMessage` its opener (a same origin OAuth popup) or fall through to a normal app navigation (a blocked popup's full page redirect landed here instead). Any future OAuth provider added here must redirect to this same path, not a provider specific one.
- Import paths use the project's `$common/*` → `src/common/*`, `$lib/*` → `src/lib/*`, `$/*` → `src/modules/*` (plural) aliases from `tsconfig.json`. `api/CLAUDE.md`'s "Feature modules go in `src/module/<name>/`" line is singular and out of date against this; flagged in the spec's build plan step 3, worth a human pass on `api/CLAUDE.md`.

## Configuration

Env vars read by `src/lib/config/configuration.ts` for this area: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `AUTH_LOCKOUT_MAX_ATTEMPTS`, `AUTH_LOCKOUT_DURATION_MINUTES`, `AUTH_VERIFICATION_TOKEN_EXPIRY_MINUTES`, `COOKIE_DOMAIN`, `COOKIE_SECURE`, `RESEND_API_KEY`, `RESEND_DOMAIN`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI`, `FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET`/`FACEBOOK_REDIRECT_URI`.

## Declined tool discovery

`@nestjs/jwt`, `@nestjs/passport`, `argon2`, `@nestjs/throttler` were added by this change; the engineer declined Agent Skill / MCP discovery for them (2026-07-17).

_Drafted by /sync from the introducing change, worth a quick human pass._
