# 006 — Plan

**Approach:** pure grouping function + one command branch + mention
suppression on three reply sites. No DB work.

**Files:**

- Modify: `src/commands/snipe.ts` (bulk option, `groupBulkDeletions`,
  bulk branch, `renderBulk`, `allowedMentions`), `src/commands/edits.ts`
  (`allowedMentions` on success reply), `tests/unit/snipe.test.ts`,
  `tests/unit/commands.test.ts`

**Interfaces:** unchanged ports. Produces: `groupBulkDeletions`,
`BULK_WINDOW_MS` (exported for tests/docs).
