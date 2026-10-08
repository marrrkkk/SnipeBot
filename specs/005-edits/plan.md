# 005 — Plan

**Approach:** extract shared helpers first (no behavior change, suites stay
green), then repo reads, then the command — same shape as 004.

**Files:**

- Create: `src/commands/channelAccess.ts`, `src/commands/rendering.ts`,
  `src/commands/edits.ts`, `tests/unit/edits.test.ts`,
  `tests/unit/helpers/interactions.ts`
- Modify: `src/commands/snipe.ts` (use shared helpers),
  `src/repositories/drizzleMessageRepository.ts`
  (+`listEditedMessages`, `+getRevisions`, port types),
  `src/commands/index.ts`, `src/index.ts`,
  `tests/unit/snipe.test.ts` (shared fakes),
  `tests/unit/commands.test.ts`, `tests/unit/deployment.test.ts`,
  `tests/integration/archive.test.ts`

**Interfaces:**

- Produces: `mayReadChannel`, `truncate`/`contentOrPlaceholder`,
  `EditHistoryPort { listEditedMessages, getRevisions, findById }`,
  `RevisionView`, `configureEditHistoryQuery`, `editsCommand`.
- Consumes: `MessageSnapshot`, repo, router (unchanged).
