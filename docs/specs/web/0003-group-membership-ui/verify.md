# Verify: group membership UI · spec 0003 · updated 2026-07-20
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual — removal vote (AC-9, AC-10, AC-11; unblocked by the api's `GET /groups/:id/removal-votes` discovery addendum)
- [ ] On a member row with fewer than 2 other active members in the group, the propose vote button is disabled with a visible reason instead of hidden silently → AC-9
- [ ] With at least 2 other active members, open the propose dialog on a member row, enter a duration, submit → the vote opens (threshold/quorum are not asked, computed to the mandatory floor) → AC-9
- [ ] Attempt to propose a second vote against the same target while one is already open → see the "already open" error, not a generic failure → AC-9
- [ ] As an active member other than the target, see the open vote's live tally (FOR/AGAINST/ABSTAIN counts) inline on the target's row, with FOR/AGAINST/ABSTAIN response buttons → respond → the tally updates after the response → AC-10
- [ ] As the targeted member, view your own row → see the tally with no response buttons of your own → AC-10
- [ ] As a member who already responded, view the target's row again → response buttons are replaced by an already-responded note, no double vote possible → AC-10
- [ ] Let a vote's `scheduledCloseAt` pass without any client polling, then trigger any refetch (respond to it, or revisit the tab) → the vote resolves server side on that read and disappears from the open list; the target's member row reflects their new LEFT status once the member list refetches, with no further action → AC-11

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

## Commands
- [ ] `npx tsc --noEmit -p web/tsconfig.app.json` → passes clean
- [ ] `npx vitest run` (in `web/`) → all suites pass

## Acceptance-criteria coverage
- AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-12, AC-13, AC-14 covered by the UI/manual steps above, all built and passing typecheck/tests.
- AC-9, AC-10, AC-11 covered by the removal vote UI/manual steps above, built on the api's removal vote discovery addendum, passing typecheck/tests.
