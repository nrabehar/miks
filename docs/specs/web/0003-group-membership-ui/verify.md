# Verify: group membership UI · spec 0003 · updated 2026-07-20
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Log in with a user who has zero groups → land straight on the create group form, not an empty dashboard → AC-1
- [ ] Log in with a user who has groups → see the paginated dashboard list, use previous/next → AC-1
- [ ] Fill the create group form (name, optional description, currency defaulting to MGA) → submit → land inside the new group → AC-2
- [ ] Inside a group, invite an email → see it appear in the pending invites list with a revoke action behind a confirm dialog → AC-3
- [ ] Open an invite link while logged out → see the public preview (group name, inviter, expiry) → log in/register → land in the group automatically with no extra click → AC-4
- [ ] Open an invite link that is expired/consumed/revoked → see a distinct terminal error state, not a generic failure → AC-5
- [ ] Open an invite link as an authenticated user whose email does not match → see a clear mismatch error → AC-5
- [ ] Member list shows active and left members, paginated; edit the group's name/description/currency while it is not closed → AC-6
- [ ] As an active member (not the sole one), leave through the confirm dialog → AC-7
- [ ] As the sole remaining active member, attempt to leave → see the blocking message instead → AC-7
- [ ] As the sole remaining active member, close the group through its confirm dialog (permanence warning) → every mutating control (invite, edit, leave, propose vote, close) disappears from every screen → AC-8
- [ ] A user who is not an active member of a group navigates directly to `/groups/:id` → redirected away before any group content renders, with a clear message → AC-12
- [ ] Go offline, attempt any group mutation (create, invite, revoke, edit, leave, close) → it fails loudly immediately, never queues for replay; group/member reads still render from the offline cache → AC-13
- [ ] Switch the app language to Malagasy → every group screen string resolves (no raw `groups.*` keys visible) → AC-14

## Not yet buildable (blocked)
- [ ] Propose a removal vote from a member row, defaulting threshold/quorum to the mandatory floor, asking only for duration; hidden/disabled with fewer than 2 other active members → AC-9 — **blocked**: needs the backend API addition below.
- [ ] An open removal vote shows inline on the target's row as a live tally (FOR/AGAINST/ABSTAIN) with response buttons for every eligible member except the target → AC-10 — **blocked**: no endpoint exists for the frontend to discover an open vote's id for a member; only `POST /groups/:id/members/:memberId/removal-votes` (propose, returns the new vote's id) and `GET /votes/:voteId` (needs that id already) exist. Route `/architect group membership UI: add an API surface for the frontend to discover a group's open removal vote(s)` before building this.
- [ ] A vote past its `scheduledCloseAt` still shows open until the next fetch flips it to its resolved status → AC-11 — same block as above.

## Commands
- [ ] `npx tsc --noEmit -p web/tsconfig.app.json` → passes clean
- [ ] `npx vitest run` (in `web/`) → all suites pass

## Acceptance-criteria coverage
- AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-12, AC-13, AC-14 covered by the UI/manual steps above, all built and passing typecheck/tests.
- AC-9, AC-10, AC-11 not yet buildable: blocked on a missing backend API surface, routed to `/architect`.
