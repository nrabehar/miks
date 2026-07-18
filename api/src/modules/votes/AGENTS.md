# Votes (shared vote lifecycle)

Spec: [docs/specs/api/0004-projects/index.md](../../../../docs/specs/api/0004-projects/index.md) (the `VotesModule` extraction, AC-13).

## File pointers

- `src/modules/votes/` — `VotesService` (open a vote, respond, get, the lazy resolution engine), `VoteResolverRegistry` (a `Map<VoteSubjectType, VoteResolver>`), `VoteResolver` (the interface a domain module implements), `VotesController` (`/votes/:voteId`, `/votes/:voteId/responses`), `VoteConfigService`/`VoteConfigController` (`PATCH /groups/:groupId/vote-config`, the group's standing default `approvalThreshold`/`minQuorum`/`durationHours` stored in `Group.metadata`), DTOs (`dto/`).
- Exports `VotesService`, `VoteResolverRegistry`, `VoteConfigService`; imported by `GroupsModule` and `ProjectsModule`, neither of which this module imports back.

## Conventions

- **Resolver registry breaks the circular dependency a shared Vote model would otherwise create.** `VotesService` never knows what a project or a member removal is; it dispatches to whichever `VoteResolver` is registered for the vote's `subjectType` when a vote closes. A domain module's resolver (e.g. `MemberRemovalVoteResolver` in `../groups/`, `ProjectVoteResolver` in `../projects/`) registers itself in `onModuleInit()`.
- **`VoteResolver.onResolved` runs inside the same transaction that flips `Vote.status`**, guarded by that update; its return value (not instance state, since these resolvers are singletons shared across concurrent requests) is passed to `afterResolved`, which runs after the transaction commits (audit logging, notifications). This return-value handoff exists specifically so a resolver's activation result (e.g. `ProjectVoteResolver`'s payout outcome) survives from the transactional phase to the post-commit phase without a shared mutable field.
- **`VotesService.open()` accepts an optional transaction client**, defaulting to the plain `PrismaService`, so a caller (e.g. project submission) can create its own row plus the opening `Vote` atomically in one transaction; a standalone open (e.g. a removal vote proposal) just omits it.
- **Lazy resolution, no background job**: a `Vote` past its `scheduledCloseAt` is only evaluated the first time anyone reads or responds to it (`resolveVote`/`closeVote`), the same no-cron convention `GroupInvite` expiry uses in `../groups/`.
- **`VoteConfigService` defaults**: `approvalThreshold: 50`, `minQuorum: 1`, `durationHours: 72`, merged over whatever a group's `Group.metadata.voteConfig` overrides. Changing it only affects votes opened after the change.

_Drafted by /sync from the introducing change, worth a quick human pass._
