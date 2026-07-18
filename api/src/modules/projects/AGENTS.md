# Projects

Spec: [docs/specs/api/0004-projects/index.md](../../../../docs/specs/api/0004-projects/index.md).

## File pointers

- `src/modules/projects/` — `ProjectsController` (`/groups/:groupId/projects` submit/list/get, `:id/votes` reopen, `:id/revenue`, `:id/expense`, `:id/entries/:transactionId/reverse`, `:id/close`, `:id/transactions`), `ProjectsService` (submission, list/get with the lazy activation retry, reopening a vote for an `INVALID` still-`PENDING` project, `loadProject`), `ProjectEntriesService` (revenue/expense recording, reversal, closure, the project scoped ledger), `ProjectActivationService` (the shared APPROVED→ACTIVE attempt, used by both the vote resolver and the lazy retry), `ProjectVoteResolver` (the `PROJECT` side of vote resolution, registers with `../votes/`'s `VoteResolverRegistry`), DTOs (`dto/`, note `ProjectFlowDestinationDto` uses a submission scoped `vaultName` rather than an existing `vaultId`, resolved to a real id inside `ProjectsService.submit`'s transaction since the project's own vaults don't exist yet at validation time).
- Imports `VaultsModule` (for `FlowRulesService.applyProjectEntryRules`) and `VotesModule` (for `VotesService`, `VoteConfigService`, `VoteResolverRegistry`); see `../votes/AGENTS.md` and `../vaults/AGENTS.md`.

## Conventions

- **`ProjectActivationService.attempt` never opens its own transaction**, so it composes safely whether called from inside `ProjectVoteResolver.onResolved`'s transaction (the moment a vote resolves `APPROVED`) or from `retryIfApproved`'s own transaction (the lazy retry on a project's next read, AC-4). Two guards, independent of each other: a balance conditional `vault.updateMany` on the sourceVault (only succeeds while its balance still covers `requestedBudget`, since a `GROUP` vault isn't owned by one project) and a status conditional `project.updateMany` (only proceeds while the project row still reads `APPROVED`). Losing the status race after already debiting undoes that debit in the same transaction.
- **Project closure never moves money** (an explicit engineer decision during the build, not a spec default): `ProjectEntriesService.close` only flips status via a status conditional update (`project.updateMany` guarded on `status: 'ACTIVE'`); any nonzero project vault balance stays exactly where it is.
- **Revenue credits, expense debits, same destination model.** Both call `FlowRulesService.applyProjectEntryRules` (see `../vaults/AGENTS.md`), which throws 422 if no active matching rule exists for the project, and 422 on a DEBIT destination without enough balance, atomically (no partial write).
- **Member notifications (AC-11) are not wired.** No generic, per-member notification-preference-respecting delivery path exists anywhere in this codebase yet (only a dedicated mail-based invite-code path in `../auth/`); this is a pre-existing gap left open by group membership's and vaults' own events too, not something specific to this module.

_Drafted by /sync from the introducing change, worth a quick human pass._
