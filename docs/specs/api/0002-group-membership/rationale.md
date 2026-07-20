# 0002. Group membership, rationale

## Context

MIKS has no group module in code yet at all (the doc itself lists `group` among the modules with "no controller nor service beyond the default `GET /`"). Only the Prisma models exist: `Group`, `GroupMember` (status `ACTIVE`/`LEFT`), and a bare `Vote`/`VoteResponse` pair that is hard wired to `Project`. Every other planned module (contribution, project, vote, flow, transaction) needs a group and a member to exist first, so this is a foundational, blocking piece of work, the same way authentication (spec 0001) was.

The product document (`docs/cahier-des-charges.md`) settles an unusual and load bearing rule up front: MIKS imposes no hierarchical role inside a group (no treasurer, no president, no admin enforced by the platform). The group is meant to self organize; the only formal decision mechanism the platform provides is the Vote. The same document also flags, as one of its own open points, that the platform wide `ADMIN` role's scope is undefined, and explicitly warns this must be clarified "to avoid confusion with the no imposed role per group principle." A membership design that quietly reintroduces a role (an implicit "owner can remove anyone") would violate the product's stated model; one that gives the platform `ADMIN` a backdoor into group data would violate its separately stated multi tenant isolation rule ("group data must never be accessible to a non member, regardless of application role"). Both had to be resolved explicitly rather than assumed.

A second forcing function is that "how does someone actually join a group" and "how is someone removed" are nowhere specified in the product document at all; the doc only states that membership is unique and that a member has a status. This spec had to invent both flows from the stated principles (no imposed role, vote as sole decision mechanism), not from an existing written rule.

## Options considered

### Option 1: Flat membership, no roles, removal only via a generalized Vote

Every active member has identical capabilities (invite, edit group, propose a removal). The existing `Vote`/`VoteResponse` model is generalized from "project only" to a polymorphic subject (`PROJECT` or `MEMBER_REMOVAL`), so member removal reuses the platform's one formal decision mechanism instead of inventing a second one.

**Pros**:
- Matches the product document's explicit "no imposed role, vote is the only formal mechanism" rule exactly, no interpretation gap.
- One voting engine to build, test, and later extend to other subject types (e.g. flow rule changes), instead of parallel ad hoc mechanisms.

**Cons**:
- Requires touching the existing `Vote` model (making `projectId` nullable, adding a discriminator and `groupId`), a schema change to something already modeled, versus building something net new.
- Removing a member now always takes a vote (threshold, quorum, duration), even for a case as simple as "everyone agrees this person should go"; there is no fast path.

### Option 2: Lightweight ownership role (e.g. `creatorId` or an `OWNER` flag) can invite/edit/remove

The group creator, or an explicit owner flag on `GroupMember`, gets exclusive rights to invite, edit the group, and remove members, similar to how most SaaS "team" features work.

**Pros**:
- Familiar pattern, fast to build, no changes needed to the `Vote` model at all.
- Removal is instant, no waiting on a quorum.

**Cons**:
- Directly contradicts the product document's explicit rule that the creator "has no special technical privilege imposed by the platform"; shipping this would mean re litigating a decision the product owner already made in writing.
- Concentrates a real financial-group action (removing someone from a money holding group) in one person with no formal check, the opposite of the transparency goal that motivates MIKS in the first place (see the document's own framing of "opacité financière" as a problem MIKS exists to solve).

### Option 3: Keep `Vote` project only, add a separate parallel `MembershipVote` mechanism

Leave the existing `Vote`/`VoteResponse` untouched, and add new, structurally similar models just for membership decisions (removal, and a future closure vote if ever needed).

**Pros**:
- Zero migration risk to the existing `Vote` model or anything that already reads it.
- Membership voting rules could diverge freely from project voting rules later without any shared-model coupling.

**Cons**:
- Two parallel voting engines (schema, service, endpoints, tests) that do almost the same thing, doubling the surface area to build and maintain, and doubling the places a future "who can vote, how is a result computed" bug can hide.
- Splits "the platform's one formal decision mechanism" into two mechanisms in practice, undermining the very consistency the product document's rule was aiming for.

## Rationale

Option 1 was chosen because it is the only one that does not quietly override a rule the product owner already wrote down. The product document treats "no imposed role" and "vote is the only formal mechanism" as load bearing, not incidental, framing them as *the* answer to the platform's core trust problem (opacity, a single person carrying all operational weight). Option 2 solves the same engineering problem faster but by reintroducing exactly the kind of unilateral power the product exists to avoid; Option 3 preserves the letter of "no roles" but breaks the spirit of "one mechanism" by duplicating it. Generalizing `Vote` (Option 1) costs one nullable column and a discriminator now, in exchange for a single, consistent decision engine that a future "vote on a flow rule change" or "vote on a project cancellation" feature can plug into without inventing anything new.

The platform `ADMIN` scope question (the product document's own open point 2) was resolved the same way: strict isolation, zero exception, even for `ADMIN`. The document's isolation rule ("quel que soit son rôle applicatif") is phrased as an absolute, and a support/moderation carve out was not something the product owner had actually asked for, only something a future support workflow might eventually need. Keeping isolation absolute now and revisiting it explicitly later (tracked in Follow up) is safer than baking in an exception nobody has specified the rules for yet (what counts as abuse, what the moderation action actually does, whether it is itself audit logged).

## 2026-07-20 addendum: removal vote discovery API

### Context

Building the group membership UI (web spec [0003](../../web/0003-group-membership-ui/index.md)) surfaced a real gap this spec left open: nothing in the original API surface lets a caller find an *open* removal vote for a member without already knowing its id. Only `POST /groups/:id/members/:memberId/removal-votes` (propose, which returns the new vote's own id) and `GET /votes/:voteId` (which needs that id already) exist. That works for the member who just proposed the vote (their own client already holds the id), but not for anyone else who opens the member list later and is supposed to see the live tally and respond, since AC-10 in this very spec already promises "everyone else can respond." The original spec simply did not specify how a caller other than the proposer finds the vote, an oversight now that a real client needs to build against it.

### Options considered

**Option A: one endpoint listing every open removal vote for the group, `GET /groups/:id/removal-votes`.** The caller (already an active member, guarded the same way every other group route is) fetches this once per group screen and matches votes to member rows itself.

- Pros: one request regardless of how many members have an open vote against them; mirrors the existing `GET /groups/:id/invites` shape exactly (a paginated list of open items scoped to the group), so it is a small, familiar addition, not a new pattern.
- Cons: the caller has to do the small extra work of matching `targetMemberId` to the member row itself, rather than the API doing it for them.

**Option B: a per member endpoint, `GET /groups/:id/members/:memberId/removal-votes`, mirroring the existing `POST` at the same path.** The caller asks, per row, "does this member have an open vote."

- Pros: no client side matching, the response is already scoped to one member.
- Cons: a member list screen showing N members means N requests just to know which rows have an open vote, an N+1 pattern the rest of this API avoids (`GET /groups/:id/members` and `GET /groups/:id/invites` already return their whole list in one call).

### Rationale

Option A was chosen because it matches this spec's own established pattern (a group scoped list, one call, guarded by the same `GroupMembershipGuard`), and because a real removal vote is rare (the whole design premise of this spec's `## Consequences` already notes it is meant to be an infrequent, deliberate action), so the list this endpoint returns is realistically always tiny, at most one open vote per member. Paying one small client side match against a short list beats paying N requests for what is, in practice, almost always zero or one open vote in the whole group. Option B is the more "obvious" per resource shape and was not wrong, but it optimizes for a request shape (one member, one answer) at the cost of the exact N+1 problem this API has consistently avoided everywhere else.
