# 012 — Plan

**Approach:** pure render/nav first, button flow second, context commands
third, registry last. Router stays a thin dispatcher throughout.

**Files:**

- Create: `src/interactions/buttons.ts`, `src/commands/contextMenu.ts`,
  `tests/unit/buttons.test.ts` (fold into router.test? separate),
  `tests/unit/contextMenu.test.ts`
- Modify: `src/commands/edits.ts` (nav render, button handler, initial
  buttons, query getter), `src/commands/search.ts` (export renderer),
  `src/commands/channelAccess.ts` (+`isFiledUnder`),
  `src/commands/types.ts` (+`MessageContextModule`),
  `src/commands/index.ts` (+context map),
  `src/interactions/router.ts` (message-context + button branches),
  `src/commands/deployment.ts` (context JSON), `tests/unit/edits.test.ts`,
  `tests/unit/router.test.ts`, `tests/unit/commands.test.ts`,
  `tests/unit/deployment.test.ts`, `docs/architecture.md`, `docs/decisions.md`

**Interfaces:** `renderRevisionPage`, `buildRevisionNav`,
`handleRevisionButton`, `getEditHistoryQuery`, `isFiledUnder`,
`messageContextMap`, `routeButton`.
