# 0005. Member notifications

**Date**: 2026-07-18
**Status**: Proposed

## Summary

This spec adds a shared notification system so members find out when something they care about happens in their group: a vote opens, a project moves forward, money comes in. Right now nothing tells them, a gap left open on purpose in the group membership, vaults, and projects specs. Members get an email and an in app entry for each event, can turn any event type off, and busy events like contributions get bundled into one summary instead of a flood of separate messages.

## Requirements

**User stories**:
- As a group member, I want to be notified when I am removed from a group, so that I am not caught by surprise.
- As a group member, I want to be notified when a vote opens or resolves, so that I can act or stay informed without checking manually.
- As a group member, I want to see a summary of contribution activity instead of a message for every single one, so my inbox does not fill up.
- As a group member, I want to turn off notification types I do not care about, so I only hear about what matters to me.
- As a group member, I want a list of my notifications with an unread count, so I have one place to catch up.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: When a member is removed from a group, invited to one, or the group is closed, every affected member receives a notification (email and in app), unless they disabled that event type.
- **AC-2**: When a vote (removal vote or project vote) opens or resolves, affected group members receive a notification, unless disabled.
- **AC-3**: When a contribution is recorded, group members receive one summary notification covering all contributions in a 15 minute window, not one notification per contribution, unless disabled.
- **AC-4**: When a project is submitted, activated, or closed, group members receive a notification, unless disabled.
- **AC-5**: A member can list their own notifications, paginated, with an unread count.
- **AC-6**: A member can mark a single notification read, or mark all of their notifications read at once.
- **AC-7**: A member can view and change their per type notification preference (enabled or disabled); disabling a type stops both the email and the in app entry for that type.
- **AC-8**: Delivery runs asynchronously through a queued job. A failed delivery retries with backoff, then is logged and dropped; it never fails or delays the request that triggered it.
- **AC-9**: A notification is never sent to a user who is no longer a member of the relevant group by the time the delivery job runs.
- **AC-10**: A member can only see and act on their own notifications and their own preferences; the only exception is an ADMIN, who may read (not act on) any user's notifications.
- **AC-11**: The contribution debounce window is scoped per member, per group, per event type, so activity in one group never delays or merges with activity in another.
- **AC-12**: Every notification job, whether it succeeds or fails, is recorded in the existing audit log.

## Decision

**Chosen option**: Option 3: Background job queue (BullMQ, backed by Redis)

Notifications are created and delivered through a BullMQ queue backed by Redis, running in process in the existing NestJS app via `@nestjs/bullmq`, with the contribution debounce implemented as a delayed, deduplicated job per member, group, and type.

**Implementation skills**: `redis-core` (`redis/agent-skills`, `.agents/skills/redis-core/`)

## Feature design

**Data model sketch**:

| Entity | Field | Type | Notes |
|---|---|---|---|
| Notification | id | String (cuid) | primary key |
| | userId | String | FK -> User, required |
| | groupId | String? | FK -> Group, nullable (a notification type may not be group scoped) |
| | type | NotificationType (enum) | INVITE_RECEIVED, MEMBER_REMOVED, GROUP_CLOSED, VOTE_OPENED, VOTE_RESOLVED, CONTRIBUTION_RECORDED, PROJECT_SUBMITTED, PROJECT_VOTE_RESOLVED, PROJECT_ACTIVATED, PROJECT_CLOSED |
| | channel | NotificationChannel (enum) | EMAIL, IN_APP; one event produces one row per channel actually delivered |
| | title | String | rendered short text |
| | body | String | rendered full text |
| | data | Json? | structured payload (ids, amounts) for a future client to build a link or detail view |
| | status | NotificationStatus (enum) | PENDING, SENT, FAILED |
| | readAt | DateTime? | nullable, set on mark read; only meaningful for IN_APP rows |
| | createdAt | DateTime | default now |
| NotificationPreference | id | String (cuid) | primary key |
| | userId | String | FK -> User, required |
| | type | NotificationType (enum) | same enum as above |
| | enabled | Boolean | default true |
| | createdAt | DateTime | default now |
| | updatedAt | DateTime | auto updated |

**Relationships**: User 1:N Notification, User 1:N NotificationPreference, Group 1:N Notification (nullable FK). Unique constraint on NotificationPreference (userId, type): a missing row means the type defaults to enabled, so there is no need to pre seed every type for every user on signup.

**State transitions**:

Notification.status: PENDING (job enqueued) -> SENT (delivery confirmed) or FAILED (all retries exhausted, logged and dropped). No transition out of SENT or FAILED.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /notifications | GET | cursor (opt), limit (opt), userId (opt, ADMIN only) | paginated notification list, unreadCount | bearer | 403 if userId given by a non ADMIN caller |
| /notifications/:id/read | PATCH | id (path) | updated notification | bearer, owner only | 404 not found or not owned |
| /notifications/read-all | PATCH | none | count marked read | bearer | none beyond auth |
| /notification-preferences | GET | none | one row per NotificationType with its enabled value (missing rows reported as enabled true) | bearer | none beyond auth |
| /notification-preferences/:type | PATCH | enabled:boolean (req) | updated preference | bearer, owner only | 422 invalid type |

**Key invariants**:
- A Notification is only ever created by an internal service call (`NotificationsService.notify()`), never by direct API input; there is no create/delete endpoint.
- A notification is only created or delivered for a user whose NotificationPreference for that type is enabled (or has no row, which defaults to enabled).
- Before a delivery job actually sends, it re checks the recipient is still a member of the relevant group (or still an existing account, for a non group scoped type); if not, it skips silently and logs the skip. (AC-9)
- A contribution debounce job is keyed by (userId, groupId, type) so it never aggregates across different groups or event types. (AC-11)

**Security model**:
- Every notification and preference read or write is scoped to the authenticated caller's own userId, enforced at the service layer, the same zero exception isolation the rest of the platform already applies to group data.
- The one exception: an ADMIN may pass `userId` on GET /notifications to read (never act on) another user's notifications, for support purposes. No other endpoint accepts an ADMIN override.
- No new compliance scope; the data here is operational (what happened, not payment details or identity documents).

**Configuration required**:
- `REDIS_URL` (or `REDIS_HOST` / `REDIS_PORT`): connection for the BullMQ queue, a new dependency this project has not run before.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: a member is removed from a group, an email and an in app notification are created and delivered, verifies **AC-1**, **AC-9**
- Failure case: the email provider call fails on every retry, the job is marked FAILED and logged, the triggering request (the removal itself) is unaffected, verifies **AC-8**, **AC-12**
- Debounce: three contributions land within the 15 minute window for the same member, group and type, exactly one summary notification is created, verifies **AC-3**, **AC-11**
- Auth/permission: a member requests another member's notifications and is rejected; an ADMIN requesting the same succeeds read only, verifies **AC-10**
- Preference respected: a member disables MEMBER_REMOVED, is removed from a group, and receives no notification of either channel, verifies **AC-7**

## Build plan

1. Migration for Notification, NotificationPreference, and their enums (NotificationType, NotificationChannel, NotificationStatus), satisfies **AC-5**, **AC-6**, **AC-7**
2. Redis and BullMQ infrastructure: NotificationsModule, queue registration via `@nestjs/bullmq`, REDIS_URL config (prerequisite, no AC alone)
3. End to end tracer slice: `NotificationsService.notify()` (checks preference, creates the DB row(s), enqueues the job), the delivery processor (sends email via the existing MailService, updates status, retry with backoff, audit log on failure), wired to one event (member removed) first, satisfies **AC-1**, **AC-8**, **AC-9**, **AC-12**
4. Read surfaces: GET /notifications (pagination, unread count), PATCH mark read and mark all read, satisfies **AC-5**, **AC-6**, **AC-10**
5. Preferences surface: GET and PATCH /notification-preferences, satisfies **AC-7**, **AC-10**
6. Extend triggers to the remaining group events (invite received, group closed, removal vote opened and resolved), satisfies **AC-1**, **AC-2**
7. Extend triggers to project events (submitted, vote resolved, activated, closed), satisfies **AC-2**, **AC-4**
8. Contribution debounce: delayed, deduplicated job per member, group, and type, 15 minute window, one summary notification, satisfies **AC-3**, **AC-11**
9. ADMIN read override on GET /notifications, satisfies **AC-10**

## Consequences

**Positive**:
- Closes a gap flagged in three earlier specs; group removal, votes, contributions, and project events all become visible to members instead of silent.
- One reusable path (`NotificationsService.notify()`) for every future event that needs to tell a member something, instead of another one off per feature.
- Real retry and backoff on delivery, without hand rolling either.

**Negative / tradeoffs**:
- Redis is new operational surface for this project: a connection to provision and keep healthy in every environment, including local development.
- The debounce window adds real complexity (a delayed, deduplicated job, plus the aggregation logic that builds the summary text) for the one event type (contributions) that needs it.

**Neutral**:
- Every existing module that triggers a notification (groups, votes, vaults, projects) gets one new outbound call each; none of their own data models change.
- `@nestjs/bullmq` becomes a new pattern in this codebase; future features with similar async delivery needs should reuse this module rather than introducing a second queue.

## Follow-up

- [ ] MCP servers exist for both Redis (`redis/mcp-redis`) and BullMQ (`adamhancock/bullmq-mcp`), giving live queue and cache inspection during development. Neither is connected; connecting either is a manual step in your MCP client settings.
- [ ] A BullMQ specific Agent Skill (`sickn33/antigravity-awesome-skills@bullmq-specialist`) was found but failed to install during this session (the source repository failed to clone, likely a transient network or repository size issue). Worth retrying before or during `/develop`.
- [ ] `redis-core` conventions are not yet referenced in `api/AGENTS.md`. Add a line to its `## Agent skills` section (or a new nested `src/notifications/AGENTS.md` once that module exists) pointing at `.agents/skills/redis-core/`.
- [ ] This spec does not revisit the still undefined ADMIN scope outside group data (flagged as deferred in spec 0002); the one exception granted here (read only notification access) is scoped narrowly and should not be read as settling that broader question.

## Rationale

Reasoning and options considered: see `rationale.md`.
