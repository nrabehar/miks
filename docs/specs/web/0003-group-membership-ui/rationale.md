# Rationale: Group membership UI

## Context

Api spec [0002](../../api/0002-group-membership/index.md) built the entire group membership backend (create, invite, join, leave, edit, a removal vote, close), fully verified and tested, months ago by scope timeline. The web app has never caught up: `web/AGENTS.md` and the current dashboard route show only a placeholder header with a logout menu, no group data anywhere. A user who registers today has no way to actually use the product's core object, the group.

This is also the first feature to sit on top of frontend spec [web 0001](../0001-frontend-architecture/index.md) (the scaffold) and [web 0002](../0002-auth-flows/index.md) (auth screens) without any further backend work of its own: the entire job is exposing an already finished, already tested API surface. The forces at play are therefore almost entirely on the frontend side: how much of the lifecycle to build in one pass, how a multi group user moves between groups, how to handle an invite link opened by someone not yet logged in, and how honestly to reflect a vote whose resolution the backend only computes lazily on read.

## Options considered

### Option 1: Full lifecycle in one spec, URL driven group context, inline vote panel

Build every screen (create, invite, join, members, edit, leave, removal vote, close) in this one spec, with the active group id living in the route rather than a store, and the removal vote shown inline on the member row it targets.

**Pros**:
- Matches how the backend itself was designed and shipped as one unit (api spec 0002); splitting the frontend across several specs would fragment a lifecycle the API already treats as one coherent whole.
- URL driven context needs no new client state layer and is trivially shareable/bookmarkable/back-button-safe, consistent with the project's existing "server state in Query, routing in TanStack Router, Zustand for UI only" rule.
- An inline vote panel keeps the removal action next to the person it concerns, no extra navigation hop for what is meant to be a rare, high stakes action.

**Cons**:
- The single spec is large (10 build tasks, 14 acceptance criteria); the review and test surface for one merge is wide.
- Inline placement means the member list row must carry two distinct pieces of UI (identity plus an optional vote panel), a bit more component complexity than a flat list.

### Option 2: Core lifecycle only, defer the removal vote to a follow up spec

Ship create, invite, join, members, edit, leave, and close now; write the removal vote UI as its own later spec.

**Pros**:
- Smaller first spec, faster to ship and review; a user gets a usable group experience sooner.
- The removal vote is genuinely the most complex and least frequently used piece; deferring it isolates that complexity.

**Cons**:
- Leaves a real, already built and tested backend capability (AC-9 through AC-11 of api spec 0002) with no frontend for an indeterminate second phase, the same kind of gap this very spec exists to close for auth and dashboard.
- A member list with no removal path at all reads as an unfinished feature to any user who actually needs to remove someone, worse than a currently rare but present control.

### Option 3: A dedicated votes page/tab instead of an inline row panel

Give votes (removal now, project approval later) their own page or tab, separate from the member list.

**Pros**:
- Scales better once project votes exist too; one page becomes the home for every kind of vote instead of scattering vote UI across different screens.
- More room to show full vote detail (proposer, full response list, time remaining) than a compact inline panel allows.

**Cons**:
- One more navigation hop to respond to a vote that specifically concerns a member you are already looking at in the member list.
- Premature generalization: this spec only needs the `MEMBER_REMOVAL` vote type; building a page designed to also house `PROJECT` votes now means designing for a feature (projects UI) that has no spec yet.

## Rationale

Option 1 was chosen because the two smaller alternatives each solve a narrower problem than the one actually in front of this project: a member visible product surface, already fully built and tested server side, with zero frontend today. Option 2's deferral would repeat the exact gap this spec exists to close (a shipped backend capability with no screen), just for one fewer feature. Option 3's dedicated votes page optimizes for a second vote type (`PROJECT`) that has no spec yet; building for it now would be designing ahead of a decision that has not been made (`docs/scope/web/scope.md` has no projects UI row). The URL driven group context follows directly from the project's own established rule in `web/AGENTS.md` (server state in Query, Zustand for UI state only, nothing duplicated); putting the active group id anywhere else would be inventing a second source of truth for something the router already owns.

The extra weight of Option 1 (a wide single spec) is accepted deliberately: the build plan slices it into ten tracer bullet tasks, each independently demoable, so the size of the spec does not force the size of any one pull request.
