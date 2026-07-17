# Verify: vaults, contributions, flow rules, and shares · spec 0003 · updated 2026-07-17

_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

(none — this is a backend-only feature; verify through the commands below)

## Commands

- [ ] Register a user, `POST /groups` → creator becomes an ACTIVE member and `GET /groups/:id/vaults` shows one `WITHDRAWABLE` vault at zero balance, created automatically → AC-1, AC-2
- [ ] Invite a second user, accept the invite → the new member's `GET /groups/:id/vaults` shows their own `WITHDRAWABLE` vault, auto created on join → AC-2
- [ ] `POST /groups/:id/vaults` with a name → a `GROUP` type vault appears in the vault list at zero balance → AC-1
- [ ] `POST /groups/:id/contributions` with an amount, no active flow rule yet → contribution is saved, response has zero transactions, and it still counts toward the member's share → AC-3, AC-6
- [ ] `POST /groups/:id/flow-rules` with `sourceType: CONTRIBUTION` and destinations summing to 100% (one `VAULT`, one `MEMBER_WITHDRAWABLE_VAULTS`) → rule created active → AC-4
- [ ] `POST /groups/:id/flow-rules` with destinations summing to 99 or 101 → 422 → AC-4
- [ ] `POST /groups/:id/contributions` with the rule active → response includes one transaction per destination, `GET /groups/:id/vaults` balances updated by the exact percentage split (remainder to the last destination), `GET /groups/:id/shares` reflects the live share used for the `MEMBER_WITHDRAWABLE_VAULTS` split → AC-5, AC-7
- [ ] Create a second active `CONTRIBUTION` flow rule, record another contribution → both rules apply independently, producing two full sets of transactions → AC-4
- [ ] `POST /groups/:id/flow-rules/:ruleId/replace` with a new split → old rule becomes inactive, new rule created with `replacesRuleId` pointing back, past transactions still trace to the original rule → AC-8
- [ ] Replace the same rule a second time → 409 → AC-8
- [ ] `POST /groups/:id/me/withdraw` for less than or equal to the withdrawable vault's balance → balance decrements, a `WITHDRAWAL` transaction appears in the ledger → AC-9
- [ ] `POST /groups/:id/me/withdraw` for more than the balance → 422, no transaction created → AC-9
- [ ] A member leaves the group → their withdrawable vault balance is preserved and still withdrawable, no longer accrues new distributions → AC-10
- [ ] `POST /groups/:id/transactions/:txId/reverse` on your own withdrawal → an offsetting transaction is created, balance adjusted → AC-11
- [ ] Reverse the same transaction again → 409 → AC-11
- [ ] `POST /groups/:id/transactions/:txId/reverse` on a `CONTRIBUTION`-sourced transaction → 422, directs to the contribution reverse endpoint instead → AC-14 (invariant)
- [ ] `POST /groups/:id/contributions/:contribId/reverse` on a contribution that produced two distribution transactions → both offset in one call, `reversedAt` set, shares recomputed → AC-14
- [ ] Reverse a contribution that had zero transactions (recorded before any rule existed) → `reversedAt` still set, shares recomputed, nothing to offset → AC-6, AC-14
- [ ] Reverse the same contribution again → 409 → AC-14
- [ ] A non member calls any endpoint in this feature (vaults, contributions, flow-rules, transactions, shares, withdraw) → 403 via the existing `GroupMembershipGuard` → AC-12
- [ ] A member tries to withdraw, reverse another member's transaction, or reverse another member's contribution → 403 → AC-11, AC-14
- [ ] `GET /groups/:id/transactions` and `GET /groups/:id/transactions?vaultId=...` → full ledger, filterable by vault, visible to any ACTIVE member → AC-12
- [ ] Check `audit_log` rows exist for every mutating action above (vault creation, contribution, flow rule create/replace, withdrawal, both reversal kinds), each attributed to the acting member's user id → AC-13

## Acceptance-criteria coverage

- AC-1 vault creation … covered by the vault-creation and group-vault-list steps
- AC-2 auto withdrawable vault … covered by the register/join steps
- AC-3 contribution recording … covered by the no-rule contribution step
- AC-4 flow rule definition, independent multi-rule application … covered by the flow-rule creation, validation, and two-rules steps
- AC-5 automatic distribution on contribution … covered by the active-rule contribution step
- AC-6 contribution with no active rule, no retroactive replay … covered by the no-rule and zero-transaction reversal steps
- AC-7 live share recompute … covered by the active-rule contribution step's share check
- AC-8 flow rule replace, never edited in place … covered by the replace and double-replace steps
- AC-9 withdrawal up to balance … covered by the withdraw steps
- AC-10 former member's vault preserved … covered by the leave step
- AC-11 reverse own withdrawal, not twice … covered by the transaction-reverse steps
- AC-12 full transparency to every ACTIVE member, non-member rejected … covered by the non-member and ledger-read steps
- AC-13 audit logging … covered by the audit_log check
- AC-14 reverse own contribution, whole distribution, not twice, not via the single-transaction endpoint … covered by the contribution-reverse steps
