# 021 — Plan

**Approach:** view models + browser state first (pure, discord.js-free),
V2 renderer second, button/interaction wiring third, proof-of-concept
`/snipe` browser path fourth, docs last. Router stays a thin dispatcher.

**Files:**

- Create: `src/ui/viewModels.ts`, `src/ui/browser.ts`,
  `src/ui/renderers/snipeBrowserV2.ts`, `src/commands/snipeBrowser.ts`,
  `tests/unit/snipeBrowserV2.test.ts`,
  `specs/021-components-v2/checklists/acceptance.md`
- Modify: `src/commands/index.ts` (register POC command),
  `src/interactions/buttons.ts` (`snb` route),
  `src/interactions/router.ts` (no change — button table covers it),
  `docs/*` + `AGENTS.md` (done), `specs/012-ui/spec.md` (supersede note)

**Interfaces:**

- `toMessageViewModel(snap)`, `toSnipeBrowserViewModel(items, state)`,
  `toDetailViewModel(snap, …)` — pure, in `src/ui/viewModels.ts`.
- `createBrowserState`, `totalPages`, `clampPage`, `pageSlice`,
  `parseBrowserAction(customId)` — pure, in `src/ui/browser.ts`.
- `renderBrowserPage(view)`, `renderDetail(view)`, `renderEmpty()`,
  `renderDenied()`, `renderExpired()`, `renderError()` — V2 payloads
  (`{ flags, components }`) in `src/ui/renderers/snipeBrowserV2.ts`.
- `snipeBrowserCommand` (`/snipebrowse` POC), `handleSnipeBrowserButton`
  — Discord-boundary only, in `src/commands/snipeBrowser.ts`.

**State/auth notes:**

- `customId` carries short cursors (`snb:pg:<page>`,
  `snb:dt:<messageId>:<page>`, `snb:bk:<page>`, `snb:cl`); the handler
  re-queries the archive and re-checks `mayReadChannel` + policy gate.
- Page size default 5, configurable per call; archive/query sizes unbounded.
