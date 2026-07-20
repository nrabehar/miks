# 0003. Group membership UI (create, invite, join, members, leave, removal vote, close)

**Date**: 2026-07-19
**Status**: In Progress

## Summary

The backend for groups (creating one, inviting and joining by email, leaving, a formal vote to remove a member, and closing a group) has been done since spec [api 0002](../../api/0002-group-membership/index.md), but the web app still has no screens for any of it: the dashboard is a bare placeholder. This spec designs every screen and flow needed to expose that backend: a group list dashboard, create group, invite and accept, member list and edit, leave, a removal vote, and close. No new backend work is needed; this is purely the frontend built on an already finished API.

## Requirements

**User stories**:
- As a new user, I want to create a group right away so my circle has a shared space.
- As an active member, I want to invite someone by email and see my pending invites.
- As an invited person, I want to open the invite link, log in or register if needed, and land as a member without any extra steps.
- As an active member, I want to see who is in my group, leave if I want to, and edit the group's details.
- As an active member, I want to propose removing a disruptive member through a fair vote, and see how the vote is going.
- As the last remaining member, I want to close a group that has run its course.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A logged in user with at least one group sees a dashboard listing all their groups (paginated); a user with zero groups is sent straight to the create group form instead of an empty dashboard.
- **AC-2**: The create group form (name, description optional, a currency dropdown defaulting to MGA) creates the group and navigates the user directly into it.
- **AC-3**: Inside a group, any active member can invite someone by email, and sees the list of pending invites with a revoke action (behind a confirmation dialog).
- **AC-4**: Opening an invite link while not authenticated shows a public preview (group name, inviter, expiry); it prompts log in or register (carrying the invite token through), and once authenticated it automatically accepts the invite if the account's email matches, landing the user in the group with no extra click.
- **AC-5**: An invite link that is expired, already consumed, or revoked shows a clear, distinct error state (not a generic failure); an authenticated user whose email does not match the invite sees a clear mismatch error instead of a generic one.
- **AC-6**: The member list shows active and left members (paginated); any active member can edit the group's name, description, and currency while the group is not closed.
- **AC-7**: An active member can leave the group through a confirmation dialog; the sole remaining active member cannot leave and instead sees why (they must close the group instead).
- **AC-8**: The sole remaining active member sees a close group action, gated by a confirmation dialog that plainly states this is permanent and the group becomes read only forever; once closed, every mutating action (invite, edit, leave, propose vote, close again) disappears from the UI.
- **AC-9**: From the member list, an active member (not the target) can propose a removal vote against another active member, through a form defaulting threshold and quorum to the mandatory floor and asking only for a duration; the action is hidden or disabled with a clear reason when fewer than 2 other active members exist.
- **AC-10**: An open removal vote shows inline on the target's row as a live tally (FOR / AGAINST / ABSTAIN counts) with response buttons for every eligible active member; the targeted member sees the tally with no response controls of their own.
- **AC-11**: A vote whose scheduled close time has passed still shows as open until the next fetch of that vote flips it (no client side polling); once the fetch resolves it, the UI reflects the member's new LEFT status and frozen values with no further action needed.
- **AC-12**: A user who is not an active member of the group in the URL never sees any protected group content, even briefly; a dedicated route guard checks membership before rendering and redirects away with a clear message on a 403.
- **AC-13**: Every group mutation (create, invite, revoke invite, accept invite, edit, leave, close, propose vote, respond to vote) requires a live connection and is never queued for offline retry; group and member reads still render from the offline cache as usual.
- **AC-14**: Every new UI string ships in both `locales/fr.json` and `locales/mg.json` together, per the project's existing i18n convention.

## Decision

**Chosen option**: Option 1: build the full group lifecycle now, group context driven by the URL, the removal vote shown inline on the member row (see [rationale.md](rationale.md) for the alternatives considered).

## Feature design

**Data model sketch**:

No new persisted entities. Every entity (`Group`, `GroupMember`, `GroupInvite`, `Vote`, `VoteResponse`) is already modeled server side, per api spec [0002](../../api/0002-group-membership/index.md). The only new frontend state is ephemeral:
- The active group id lives in the URL (`/groups/$groupId`), never duplicated into a Zustand store.
- A new `src/features/groups/` feature folder (schema, api, queries, hooks, components), following the same shape as `src/features/auth/`, with query key factories for the group list, group detail, member list, invite list, and vote detail.
- The pending invite token, when landing on the public invite route while unauthenticated, is carried through login/register via a URL search param (e.g. a `redirect` back to `/invites/$token` after auth), not stored in a client side store.

**State transitions**:

Mirrors the backend exactly, reflected rather than reimplemented: `Group.status`: `ACTIVE` shown normally, `CLOSED` renders every group screen read only (no invite, edit, leave, vote, or close controls). `GroupMember.status`: `ACTIVE` rows get full row actions, `LEFT` rows render as history only. `GroupInvite.status`: `PENDING` shows in the pending list with a revoke action; `ACCEPTED` / `REVOKED` / `EXPIRED` are read as the invite landing route's terminal error states. `Vote.status`: `OPEN` shows the live tally and response controls; `APPROVED` / `REJECTED` / `INVALID` only ever appear after a fetch resolves them (no local timer flips the UI early).

**API surface** (all already exist server side, per api spec 0002; this table maps the frontend action to each):

| Frontend action | Endpoint | Method | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|---|
| Dashboard load | /groups | GET | page, limit | caller's groups (paginated) | |
| Create group form submit | /groups | POST | name, description?, currencyCode | group id | 422 invalid currency |
| Group page load (route guard) | /groups/:id | GET | | group detail | 403 not a member |
| Edit group form submit | /groups/:id | PATCH | name?, description?, currencyCode? | updated group | 403 not a member, 409 group closed |
| Member list load | /groups/:id/members | GET | page, limit | active + left members | 403 not a member |
| Invite form submit | /groups/:id/invites | POST | email | invite id | 409 already a member, 409 pending invite exists, 409 group closed |
| Pending invites list load | /groups/:id/invites | GET | page, limit | pending invites | 403 not a member |
| Revoke invite | /groups/:id/invites/:inviteId | DELETE | | 204 | 404 not found, 409 already accepted |
| Invite landing page load | /invites/:token | GET | | preview (group name, inviter, expiry) | 404 invalid, expired, or consumed |
| Invite auto accept (post auth) | /invites/:token/accept | POST | | new membership id | 403 email mismatch, 409 expired/consumed/revoked |
| Leave button | /groups/:id/leave | POST | | 204 | 409 last active member |
| Close button | /groups/:id/close | POST | | group closed | 409 not the last active member |
| Propose removal vote form | /groups/:id/members/:memberId/removal-votes | POST | approvalThreshold, minQuorum, durationHours | vote id | 403 targeting self, 409 open vote exists, 422 below mandatory floor, 422 fewer than 2 other active members |
| Vote response buttons | /votes/:voteId/responses | POST | choice (FOR/AGAINST/ABSTAIN) | 200 | 403 target voting on own removal, 409 vote already closed |
| Vote tally display | /votes/:voteId | GET | | vote detail, tally, status | 403 not a member |

**Key invariants**:
- The active group id is always read from the route, never from a duplicate client side store; there is exactly one source of truth for "which group am I looking at".
- The removal vote's status shown in the UI is always whatever the last fetch of `GET /votes/:voteId` returned; nothing locally computed ever overrides it, since resolution only happens server side on read.
- A closed group's screens render every mutating control absent, not merely disabled, so a closed group cannot be mistaken for a live one.
- No group mutation is ever queued by the offline mutation layer; each mutation call site opts out explicitly rather than relying on a global default.

**Security model**:
- No new authorization rule is introduced; every check (active membership, self targeting, vote target exclusion) is already enforced server side by `GroupMembershipGuard` (api spec 0002). The frontend never re-implements or duplicates a check, it only reflects the API's 403/409 responses.
- A new `_authenticated/groups/$groupId` pathless layout route is the single place group membership is checked before rendering: its `beforeLoad` calls `GET /groups/:id`, and a 403 redirects to the dashboard with an error message, mirroring the existing `_authenticated.tsx` guard pattern rather than inventing a new one.
- The invite landing route is public (matches the API), and the auth carry through (redirect param back to the invite after login/register) never exposes the raw invite token to any endpoint except the accept call itself.

**Configuration required**:
- None. No new `VITE_*` variables; the only backend surface used is already shipped.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: create a group, invite an email, accept the invite as a matching authenticated user, member list shows two active members, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
- Happy path: propose a removal vote at the mandatory floor, have every eligible member respond, the tally updates on each response, verifies **AC-9**, **AC-10**.
- Failure case: the sole remaining active member tries to leave, sees the blocking message, then closes the group instead; every group screen afterward renders with no mutating controls, verifies **AC-7**, **AC-8**.
- Failure case: an authenticated user opens an invite addressed to a different email, sees the mismatch error, not a generic failure, verifies **AC-5**.
- Auth/permission: a user who is not a member of group X navigates directly to `/groups/X`, is redirected away before any group content renders, verifies **AC-12**.
- Edge case: a vote's `scheduledCloseAt` has passed but nobody has re-fetched it yet, the UI still shows it as open; the next fetch (a manual refresh or a response) flips it to its resolved status, verifies **AC-11**.

## Build plan

No project wide build approach is recorded in `AGENTS.md` or a scope header (the same gap every existing spec in this repo already flags), so this plan defaults to end to end (Tracer Bullet) slices: get one thin path (create a group, see it) fully working before broadening to invites, leaving, voting, and closure.

1. Scaffold `src/features/groups/` (schema, api, queries with key factories, hooks) and the new route shell: `_authenticated/groups/index.tsx` (dashboard list) and the pathless `_authenticated/groups/$groupId.tsx` layout with its membership guard `beforeLoad`, satisfies **AC-1**, **AC-12**.
2. Create group form and flow, including the zero groups redirect straight to the form, satisfies **AC-1**, **AC-2**.
3. Group detail page: member list (active + left, paginated) and the edit group form, satisfies **AC-6**.
4. Invite flow: invite form, pending invites list, revoke action with its confirm dialog, satisfies **AC-3**.
5. Public invite landing route `/invites/$token`: preview, the auth carry through redirect, auto accept on return, and its terminal error states (expired, consumed, revoked, email mismatch), satisfies **AC-4**, **AC-5**.
6. Leave flow (confirm dialog, last active member block message) and close flow (confirm dialog with the extra permanence warning, every screen goes read only once closed), satisfies **AC-7**, **AC-8**.
7. Removal vote: the propose form on a member row (floor defaulted threshold/quorum, duration only), the response buttons, and the live tally display, satisfies **AC-9**, **AC-10**, **AC-11**.
8. Exclude every group mutation call site from the offline mutation queue, satisfies **AC-13**.
9. Add every new i18n key to both `locales/fr.json` and `locales/mg.json` together, per the project's existing convention, satisfies **AC-14**.
10. Vitest and React Testing Library coverage for each flow above (happy path plus its main failure case), per the project's existing testing convention.

## Consequences

**Positive**:
- Every backend capability from api spec 0002 finally has a frontend surface; a user can go from signup to a working group with members, in the app, for the first time.
- No new library, provider, or pattern: every screen reuses the existing feature folder shape, the existing route guard pattern, and the existing pagination convention (`ListQueryDto`), keeping the codebase consistent.
- The route level membership guard (task 1) means every later feature that adds a group scoped screen (vaults, projects) can nest under the same `$groupId` layout instead of re-checking membership itself.

**Negative / tradeoffs**:
- The removal vote UI is the most complex piece here (inline tally, response gating, lazy resolution reflected honestly rather than optimistically) for a feature that, by the product's own design, is meant to be rare; it is still specced fully now rather than half built, since a partial vote UI would be worse than none.
- The invite auth carry through (redirect param through login/register back to the invite) is extra plumbing compared to a simpler "log in first, then paste the link again" flow, chosen because forcing a user to re-find the email is worse UX.
- Seven-plus screens land together in one spec; the review and test surface is wide, though the tracer bullet ordering means each slice is independently demoable as it lands.

**Neutral**:
- `web/AGENTS.md` gains new route, feature folder, and pagination usage entries once this is built (via `/sync`).
- `docs/scope/web/scope.md` has no row for this feature yet; add one (via `/scope`) once this spec is confirmed.

## Follow-up

- [ ] No project wide build approach is recorded in `AGENTS.md` or a scope header; once one is, reconcile this spec's `## Build plan` ordering against it if different (the same open item every existing spec in this repo carries).
- [ ] `docs/scope/web/scope.md` has no row for this feature; add one (via `/scope`) linking this spec.
- [ ] The currency dropdown's exact supported list (this spec assumes MGA default, plus EUR and USD) was not asked of the engineer; confirm the real supported list with product before or during build.
- [ ] `web/AGENTS.md`'s "Not yet built" note on `useWorkspaceRole()` assumed a future role bearing membership feature; group membership has no roles at all (flat, every active member equal), so that hook is likely unneeded. Worth a quick reconciliation pass (via `/sync`) once this spec is confirmed.
- [ ] Whether a closed group can ever be reopened is still undecided (api spec 0002's own Follow-up); this spec's read only rendering assumes closure stays terminal and would need a small revisit if that changes.

## Rationale

Reasoning and the alternatives considered: see [rationale.md](rationale.md).
