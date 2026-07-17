# Verify: Group membership · spec 0002 · updated 2026-07-17

_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Commands

- [ ] `npx prisma migrate status` (in `api/`) → shows "Database schema is up to date!", all 5 migrations applied → underlies every AC
- [ ] `POST /auth/register` for a new user, then `POST /groups` with `{name, currencyCode: "MGA"}` → 201, response group has `status: "ACTIVE"`; `GET /groups/:id/members` shows exactly one ACTIVE member (the creator) → AC-1
- [ ] `POST /groups` with `currencyCode: "ZZZ"` (unknown code) → 422 → AC-1
- [ ] As an active member, `POST /groups/:id/invites` with `{email}` → 201 with invite id; invited email receives a message containing an accept link (check Resend/mail logs) → AC-2
- [ ] Register a second user whose email matches the invite; `GET /invites/:token` (public, no auth) → 200 preview with group name, inviter display name, expiry → AC-2
- [ ] That second user calls `POST /invites/:token/accept` while authenticated → 201/200, `GET /groups/:id/members` now shows 2 ACTIVE members → AC-3
- [ ] Same accepting user's email does NOT match the invite (different account) → `POST /invites/:token/accept` → 403 → AC-3
- [ ] An active member calls `DELETE /groups/:id/invites/:inviteId` on a still-pending invite → 204; a later `POST /invites/:token/accept` on that token → 409 → AC-4
- [ ] Fire two concurrent `POST /invites/:token/accept` requests for the same token → exactly one succeeds, the other gets 409, `GroupMember` count increases by exactly 1 → AC-5
- [ ] A user leaves (`POST /groups/:id/leave`) then a fresh invite is sent and accepted for the same user → a NEW `GroupMember` row appears (status ACTIVE), the old `LEFT` row is untouched → AC-6
- [ ] With 2 active members, one calls `POST /groups/:id/leave` → 204, membership flips to LEFT; the sole remaining member then calls leave again → 409 → AC-7
- [ ] That last remaining member calls `POST /groups/:id/close` → 200, group `status: "CLOSED"`, `closedAt` set; further `POST /groups/:id/invites` on it → 409 → AC-8
- [ ] In a group with exactly 3 active members, a non-target member proposes `POST /groups/:id/members/:memberId/removal-votes` with `minQuorum: 1` → 422 (below the mandatory floor of 2); retried with `minQuorum: 2, approvalThreshold: 50, durationHours: 1` → 201 → AC-9
- [ ] In a 2-active-member group (1 other member besides target), proposing a removal vote → 422 ("fewer than 2 other active members") → AC-9
- [ ] The targeted member calls `POST /votes/:voteId/responses` → 403; another eligible member responds `FOR` → 200, responding twice → 409 → AC-10
- [ ] Set `durationHours` very small (or manually backdate `scheduledCloseAt` in the DB for a test vote), then `GET /votes/:voteId` after it has passed → vote flips from OPEN to APPROVED/REJECTED/INVALID on this read (not before); if APPROVED, the target's `GroupMember.status` becomes `LEFT` and their `MemberShareCache`/`Vault` rows are unchanged → AC-11
- [ ] Any active member calls `PATCH /groups/:id` with new `name` → 200 updated; the same call on a CLOSED group → 409 → AC-12
- [ ] A user who is not a member of group X calls `GET /groups/X` → 403; the same call as a platform `ADMIN` (not a member of X) → identical 403 → AC-13
- [ ] After each mutating call above (create, invite sent/accepted/revoked/expired, leave, propose/decide vote, remove, close, edit), query `audit_log` for a matching `event_type`/`group_id` row → AC-14

## Acceptance-criteria coverage

- AC-1 group creation + creator auto-join + invalid currency · AC-2 invite creation + email send · AC-3 invite accept + email match · AC-4 invite revoke · AC-5 invite expiry/consumption/race · AC-6 unique-active-membership + rejoin · AC-7 voluntary leave + last-member block · AC-8 group closure + read-only after · AC-9 removal vote proposal + quorum/threshold floor · AC-10 target exclusion from voting · AC-11 lazy vote evaluation + frozen balances · AC-12 group edit + closed-group block · AC-13 zero-exception group isolation (incl. ADMIN) · AC-14 audit log coverage
