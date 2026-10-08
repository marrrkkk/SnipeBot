# 017 — Plan

**Approach:** registry first, choke-point wiring second, coalescing
third, surfaces (`/stats`, load script) last. Docs throughout.

**Files:**

- Create: `src/observability/metrics.ts`, `src/events/connection.ts`,
  `src/commands/stats.ts`, `scripts/load-test.ts`,
  `tests/unit/metrics.test.ts`, `tests/unit/stats.test.ts`
- Modify: `src/services/drizzleArchiveService.ts` (6 counters),
  `src/interactions/router.ts` (command/error counters),
  `src/services/mediaArchiver.ts` + `src/services/retention.ts`
  (runOnce summaries), `src/events/reactions.ts` + `src/events/pollVotes.ts`
  (coalescing opt), `src/events/index.ts`, `src/index.ts` (stats binding),
  `src/commands/index.ts`, `src/repositories/drizzleMessageRepository.ts`
  (+`getArchiveStats`, `StatsPort`), `tests/unit/reactions.test.ts`,
  `tests/unit/polls.test.ts`, `tests/unit/router.test.ts`,
  `tests/unit/commands.test.ts`, `tests/unit/deployment.test.ts`,
  `tests/integration/archive.test.ts`, `package.json` (`load:test`),
  `docs/architecture.md`, `docs/decisions.md`, `docs/security.md`

**Interfaces:** metrics fns, `StatsPort`, `configureStatsQuery`,
coalescing opts, load script CLI.
