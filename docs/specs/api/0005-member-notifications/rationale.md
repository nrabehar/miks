# 0005. Member notifications, rationale

## Context

Three earlier specs each hit the same wall and deferred it. Spec 0002 (group membership) needed to tell a member they were removed, or that their group closed. Spec 0003 (vaults) needed to tell a group a contribution landed. Spec 0004 (projects) needed to tell a group a vote resolved or a project activated. In every case, the only thing that already existed was a one off `NotificationDeliveryService.sendCode()` used just for auth verification codes, wrapping a thin `MailService` (Resend backed email). None of it is reusable for arbitrary event driven messages, and there is no concept of a member choosing what they want to hear about.

Left undone, every future feature keeps re deferring the same gap, and the ones already shipped stay silent on events members plainly need to know about (their removal, their group's closure, money moving).

The forces at play: this must plug into four existing modules (groups, votes, vaults, projects) without those modules depending on each other; delivery must not block or fail the request that triggered it (a slow email should never break a vote resolution); and members need a way to say "stop telling me about X" that is honestly respected, not just recorded and ignored.

## Options considered

### Option 1: Synchronous, fire and forget calls from each module

Each module (groups, votes, vaults, projects) calls a shared `NotificationsService` method directly after its own database write, the same pattern already used for the audit log. The service writes the notification rows and sends the email inline, awaited but with errors caught and swallowed so a failure never surfaces to the caller.

**Pros**:
- No new infrastructure, ships fastest, easiest to reason about (one call, one code path).
- Matches an existing project pattern (the audit log call).

**Cons**:
- A slow email provider call adds latency directly to the request (masked only by catching, not eliminated).
- No real retry story: catching an error and giving up is the only option without a queue behind it.
- The contribution debounce (AC-3) has nowhere durable to hold state between events; it would need its own ad hoc timer mechanism.

### Option 2: Domain events via Nest's EventEmitterModule

Modules emit domain events (`member.removed`, `vote.resolved`, and so on); a listener in the notifications module reacts and delivers. Decouples the emitting modules further than a direct service call.

**Pros**:
- Cleaner separation, a module never needs to know notifications exist at all, just emits what happened.
- Easy to add more listeners later (for example, a future analytics listener) without touching the emitting module again.

**Cons**:
- In process only; still has no answer for retries, backoff, or the debounce window's delayed aggregation.
- Introduces a pattern (event emitter) not used anywhere else in this codebase yet, a second way of wiring cross module calls alongside the existing direct injection pattern.

### Option 3: Background job queue (BullMQ, backed by Redis)

Modules call `NotificationsService.notify(...)` directly (same call site as Option 1), but instead of sending immediately, the service enqueues a job. A worker, running in the same NestJS process via `@nestjs/bullmq`, consumes the queue, sends the email, updates the notification's status, and retries with backoff on failure. The contribution debounce uses a delayed job per member, group, and type: the first contribution schedules a job 15 minutes out, later ones reuse (deduplicate against) that job.

**Pros**:
- Real retry with backoff, out of the box, matching AC-8 without hand rolled logic.
- Delivery never blocks the triggering request; a Resend outage cannot slow down a vote resolution.
- BullMQ's delayed jobs are a direct, correct fit for the debounce window in AC-3 and AC-11, no separate timer mechanism to build.

**Cons**:
- Introduces a new piece of infrastructure (Redis) this project has never run before, with its own operational surface (a connection to keep healthy, a queue to monitor).
- More moving parts than Option 1 for a first version; a job that never gets picked up (a stuck worker) is a new failure mode to watch for.

## Rationale

The engineer's own priority, chosen directly in the design conversation, was a real retry story and a durable place to hold the debounce window's state, not the fastest thing to ship. Option 1 and Option 2 both leave the debounce window (AC-3, AC-11) with no home except an ad hoc, hand rolled timer, which is exactly the kind of bespoke mechanism the queue already solves correctly. BullMQ's delayed and deduplicated jobs are a direct match for "aggregate these events per member, per group, per type, over a window," not a workaround.

The operational cost is real (Redis is new to this project) but bounded: running the worker in process (no separate deployable) keeps it to one new connection to manage, not a new service to deploy and scale independently. That is the right size for the traffic this feature has today; a separate worker process is left for later if queue volume or worker isolation ever demands it.

## Tool discovery evidence

During the stack walk, a discovery pass (subagent on a cheap model, read only) was run for BullMQ and Redis tooling:

- **Agent Skills found**: `sickn33/antigravity-awesome-skills@bullmq-specialist` (BullMQ conventions), `redis/agent-skills` (official Redis skills: `redis-core`, `redis-connections`, `redis-security`, `redis-observability`, and others). No skill exists specifically for `@nestjs/bullmq`.
- **MCP servers found**: `redis/mcp-redis` (official, natural language Redis operations), `redis/mcp-redis-cloud` (Redis Cloud account management), `adamhancock/bullmq-mcp` (community, queue/job management and monitoring).
- **Installed this session**: `redis-core` (`.agents/skills/redis-core/`), successfully.
- **Failed to install**: `bullmq-specialist`; the source repository (`sickn33/antigravity-awesome-skills`) failed to clone twice (network/repository size issue). Recorded as a Follow-up in `index.md` to retry later.
- **Not connected**: both MCP servers require a manual connection step in the engineer's own MCP client settings; noted as Follow-up, not actioned here.
