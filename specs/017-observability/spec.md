# 017 — Observability, resilience, performance

## Goal

Know what the bot is doing, survive event storms without REST spam, and
state capacity honestly — all without new infrastructure.

## Requirements

- Zero-dep in-process metrics (`src/observability/metrics.ts`):
  counters + gauges + snapshot (uptime, started-at). Fixed names only —
  never user content, never per-user labels.
- Wired at choke points: service ingest/edit/delete(+bulk)/reactions/
  poll-refresh; router command executions + errors (per-command names are
  a fixed small set); media + retention `runOnce` summaries; gateway
  disconnect/reconnect/resume counters (+ log lines).
- Reaction + vote refresh coalescing: trailing 5s per message (closely
  spaced storms collapse to one REST fetch); `0` disables (tests, and an
  honest off-switch); bounded memory (entries deleted on fire).
  REST pacing beyond this stays with discord.js backoff (evaluated,
  sufficient — no speculative pacer).
- `/stats` (role-gated like other reads, ephemeral): uptime, row counts
  (messages/revisions/pending media/deletions via one `getArchiveStats`
  call), worker last summaries (in-memory), policy count. No fs stats,
  no content.
- Connection logging: disconnect/reconnect/resume/error lines (noisy
  enough to diagnose, quiet enough to ignore).
- `scripts/load-test.ts` (`npm run load:test [count]`): N synthetic
  snapshots into a temp DB, prints msg/s + MB. A tool, not a test —
  but it must run.
- Reconnect floods: documented residual (lib-queued REST + sync DB
  serialization); no queue system without evidence.

## Constraints

- No new intents/permissions/dependencies. Strict TS, no `any`.
- Metrics must not leak across test files (per-file isolation holds;
  within-file assertions use deltas; `resetMetrics` is test/support).

## Tests / completion

- Unit: registry shapes/deltas/reset; coalescer collapse + immediate
  mode + per-key independence; router counting; connection counters;
  `/stats` render/denied/unconfigured.
- Integration: service ops move counters (delta assertions).
- Existing reaction/vote handler tests take explicit `0` coalescing
  (unchanged behavior, honest wiring).
- `typecheck + lint + test + build` green; load script runs.
- Manual (blocked without token): checklists/acceptance.md.
