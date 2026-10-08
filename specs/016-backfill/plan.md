# 016 — Plan

**Approach:** fetch paging first (fake channels), repo batch second,
command last. No read-path or handler changes.

**Files:**

- Create: `src/discord/history.ts`, `src/commands/backfill.ts`,
  `tests/unit/history.test.ts`, `tests/unit/backfill.test.ts`
- Modify: `src/repositories/drizzleMessageRepository.ts`
  (+`BackfillPort`, `+importSnapshots`),
  `src/commands/index.ts`, `src/index.ts` (binding),
  `tests/unit/commands.test.ts`, `tests/unit/deployment.test.ts`,
  `tests/integration/archive.test.ts` (or new `backfill.test.ts` —
  new file, cleaner), `docs/discord.md`, `docs/decisions.md`

**Interfaces:** `HistoryChannel`, `fetchHistoryPage`,
`BackfillPort { importSnapshots }`, `configureBackfillQuery`.
