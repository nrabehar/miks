# Verify: frontend auth flows · spec 0002 · updated 2026-07-18 · run 2026-07-18

_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Register with a new email, password, and display name → landed in the app immediately, logged in with the same session cookies login sets, no verification gate → AC-1
- [ ] While unverified, load any authenticated page → dismissible "verify your email" banner shows; dismiss it, reload the app in the same tab → banner stays hidden; open a new tab/session → banner reappears → AC-2
- [ ] Click the emailed verification link → `/auth/verify-email?token=...` auto-submits with no extra click, shows a clear success state, banner disappears on the next `me` fetch → AC-3
- [ ] Open the verify link with an expired or already-used token → error state with a working resend action, not a generic failure → AC-4
- [ ] Submit forgot password with an email that exists, then one that doesn't → both show the identical generic "check your email" confirmation → AC-5
- [ ] Open the reset link, submit a new password with its confirmation and the URL token → password changed, redirected to login → AC-6
- [ ] Submit reset password with an expired or already-used token → inline error state with a "request a new link" action, form not resubmitted → AC-7
- [ ] Click Google, then Facebook, on both login and register → popup opens; on success it closes itself and the main window's session refreshes without a full reload → AC-8
- [ ] Block the popup (browser popup blocker or `window.open` returning null) and click an OAuth button → falls back to a full page redirect to the same OAuth URL → AC-9
- [ ] On `/settings/sessions`, view active sessions (device/user agent, IP, created date, current flag) → current session's row never shows a revoke control; revoke a different session (with confirmation) → it's gone → AC-10
- [ ] Trigger the resend-verification or forgot-password rate limit (4 requests within a minute) → specific "too many requests" message shown, action disabled for the cooldown window → AC-11

## Commands

- [ ] `npx tsc -b` (in `web/`) → passes clean → covers all ACs (typecheck)
- [ ] `npx tsc --noEmit -p tsconfig.json` (in `api/`) → passes clean → covers AC-2, AC-8 (typecheck)
- [ ] `npx vitest run` (in `web/`) → all tests pass, including the new register/verify-email/forgot-password/reset-password/sessions/oauth-buttons suites → AC-1, AC-3, AC-4, AC-5, AC-7, AC-9, AC-10, AC-11
- [ ] `npx jest` (in `api/`) → all tests pass, including the updated `auth.service.spec.ts`/`auth.controller.spec.ts` covering `emailVerified` and the new OAuth redirect target → AC-2, AC-8

## Acceptance-criteria coverage

- AC-1 register logs in immediately · covered by the register happy-path step and `register.test.tsx`
- AC-2 verify banner dismiss/reappear · covered by the banner manual step (no automated test: sessionStorage + real page reload behavior)
- AC-3 verify link auto-submits · covered by the verify-email happy-path step and `verify-email.test.tsx`
- AC-4 expired/used verify token offers resend · covered by `verify-email.test.tsx`
- AC-5 forgot-password generic confirmation · covered by `forgot-password.test.tsx`
- AC-6 reset-password submits token + password · covered by `reset-password.test.tsx`
- AC-7 expired/used reset token error state · covered by `reset-password.test.tsx`
- AC-8 OAuth popup success flow · covered by the manual popup-success step (no automated test: requires a real provider round trip)
- AC-9 popup-blocked fallback · covered by `oauth-buttons.test.tsx`
- AC-10 sessions list never revokes current · covered by `sessions.test.tsx`
- AC-11 rate-limit cooldown UX · covered by `forgot-password.test.tsx`'s 429 case
