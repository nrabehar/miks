# Rationale: 0003. Vaults, contributions, flow rules, and shares

## Context

Authentication (spec 0001) and group membership (spec 0002) are both built. Every remaining piece of the product (projects, project approval votes, the dashboard, notifications) depends on a group being able to receive money declarations, split them automatically across its vaults, and keep every member's proportional share correct. Right now the Prisma schema already models `Vault`, `Contribution`, `FlowRule`/`FlowDestination`, `MemberShareCache`, and `Transaction` in full (from the initial migration), but no service code exists for any of them.

MIKS's cardinal rule (`cahier-des-charges.md` section 2) shapes everything here: the platform never holds real money, never executes a transfer, and never guarantees funds. Every entity in this spec is a *declaration* (a member says "I contributed X" or "I'm withdrawing Y"), not a real financial transaction. This keeps the feature free of payment processing, PCI scope, or banking regulation, but it also means the feature's only value is the correctness and transparency of the ledger it keeps: if the numbers don't reconcile, the entire product's pitch (visible, tamper proof group finances) falls apart.

Two open points from the product doc had no answer before this spec: whether a flow rule can be edited after other distributions already happened against it (section 11, point 6), and how a member ever gets money out of a withdrawable vault MIKS itself never moves (section 11, point 7). Both are settled below. A third, related open point carried over from spec 0002's own Follow-up (what happens to a leaving or removed member's withdrawable balance) is also settled here, since this is the first spec that defines what a withdrawable balance even does.

The scope stays deliberately narrower than the full section 5 of the product doc: `PROJECT_REVENUE` flows and `PROJECT` type vaults are real rows in the schema, but nothing yet exists to produce them (no project module), so building their handling now would be speculative. They wait for the projects spec.

## Options considered

The central design choice is how a recorded contribution actually turns into vault balances and share updates.

### Option 1: Synchronous, in request, transactional distribution (recommended)

Recording a contribution and applying every active flow rule for it happen inside the same request, inside one database transaction: the contribution is saved, each active rule's destinations are computed, the resulting transactions are written, vault balances update, and every active member's share cache recomputes, all before the response returns.

**Pros**:
- The caller sees the real, final result immediately (the response can include the actual transactions produced), which matters for a product whose whole pitch is "see your money's status in real time."
- No new infrastructure: no queue, no worker, no job scheduler. The project has none today and group membership's own build (spec 0002) deliberately avoided introducing one, preferring lazy evaluation at read time over background jobs.
- Nothing can be "in between" states from another request's point of view: a contribution either fully landed with its distribution, or the whole write rolled back.

**Cons**:
- A slow flow application (many rules, many members needing a share recompute) adds directly to the contribution request's latency. For the group sizes and contribution volumes this product targets (informal savings groups, not thousands of transactions a second) this is not a real constraint, but it would not scale to a very different traffic profile.

### Option 2: Asynchronous, queued distribution

The contribution is saved and acknowledged immediately; a background worker picks it up moments later to apply flow rules and update caches.

**Pros**:
- Decouples contribution recording from however long distribution takes, which matters at high volume.

**Cons**:
- Requires a queue and a worker, infrastructure this project has none of yet; introducing one for this feature alone is a disproportionate operational cost for the traffic this product expects.
- The response to "I just contributed" cannot show the real distribution yet, undermining the transparency pitch, and the group's dashboard would need to explain a "processing" state that has no product basis today.

### Option 3: Manual or batch distribution trigger

Contributions accumulate; a member (or a scheduled job) explicitly triggers "apply flow rules now" for whatever has piled up.

**Pros**:
- Simplest to build; no per contribution distribution logic to get right under concurrency.

**Cons**:
- Directly contradicts the product doc's own rule (section 5.4): "as soon as an entry is declared, MIKS automatically applies the matching flow rule(s) and records the resulting movements, without manual intervention from the group." Building this would mean re litigating a decision the product doc already made.

## Rationale

Option 1 wins because it is the only one that satisfies the product doc's explicit "no manual intervention" rule (section 5.4) without introducing infrastructure (a queue, a worker) the project doesn't have and doesn't yet need at this product's expected scale. It also keeps this feature consistent with spec 0002's established pattern of lazy, request time evaluation over background jobs (the vote closing and invite expiry logic both work this way), so the codebase doesn't end up with two different concurrency models for "when does state actually update."

The three product doc open points were settled directly with the engineer rather than guessed:
- **Flow rules are immutable, replace only** (not mutable in place): once a rule has been used to distribute even one contribution, silently changing its percentages would make every past transaction unexplainable by looking at the rule that supposedly produced it. Replacing (deactivate old, create new with `replacesRuleId` pointing back) keeps every past distribution attributable to the exact rule that was active when it happened, at the cost of a self referencing FK the schema didn't have yet.
- **Withdrawal is declarative**: consistent with the cardinal "not a bank" rule, a withdrawal is a member's own declaration that money already left the platform's visibility, not an instruction MIKS executes. This is the same posture the product already takes toward contributions (declared, not verified).
- **A leaving or removed member's withdrawable balance is frozen, not forfeited**: it is money the product doc's own share formula already attributed to them before they left; taking it away or handing it to the group would silently rewrite history the audit log otherwise guarantees is immutable. They keep the ability to declare a withdrawal against what's already there, they just stop accruing anything new.

## References

None (references consent: `none`, kept clean per the engineer's choice).
