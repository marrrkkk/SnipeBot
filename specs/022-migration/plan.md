# 022 — Plan

**Approach:** spec → shared shell + sessions + view models → `/snipe`
(incl. POC retirement) → `/edits` (incl. `edits:rev` retirement) →
`/search` + context menus → tests → docs → validate. Router stays a
thin dispatcher; button table gains `edb`/`seb`, loses `edits`, keeps
`snb` (re-pointed at `snipe.ts`).

**Files:**

- Create: `specs/022-migration/*` (this phase),
  `src/ui/renderers/browserShell.ts`, `src/ui/sessions.ts`,
  `src/ui/renderers/editsBrowserV2.ts`,
  `src/ui/renderers/searchBrowserV2.ts`, `tests/unit/sessions.test.ts`,
  `specs/022-migration/checklists/acceptance.md`
- Modify: `src/ui/viewModels.ts` (+ walker/hit/bulk-group VMs),
  `src/ui/renderers/snipeBrowserV2.ts` (shell-backed, + bulk renderers,
  stable export names), `src/commands/snipe.ts` (V2 execute + `snb`
  handler), `src/commands/edits.ts` (V2 execute + `edb` handler),
  `src/commands/search.ts` (V2 execute + `seb` handler + session),
  `src/commands/contextMenu.ts` (V2 both),
  `src/repositories/drizzleMessageRepository.ts` (`MessageSearchPort` +
  `findById`), `src/interactions/buttons.ts`, `src/commands/index.ts`,
  `src/index.ts`, `docs/*`, tests for all touched surfaces
- Delete: `src/commands/snipeBrowser.ts` (logic moves into `snipe.ts`)

**Interfaces:**

- Shell: `renderListPage`, `renderDetailPage`, `renderStatePage`,
  `renderEphemeralState`, `V2Reply` (moves here from snipeBrowserV2).
- Sessions: `createSearchSessionStore({now, ttlMs, max, id?})`,
  `searchSessions` singleton; `StoredSearchQuery` (JSON-safe).
- View models: `EditWalkerViewModel`, `SearchHitViewModel`,
  `BulkGroupViewModel`, `toSearchHitViewModel`, `excerptText` export.
- Handlers: `handleSnipeButton` (snipe.ts), `handleEditsButton`
  (edits.ts), `handleSearchButton` (search.ts).
- CustomIds: `snb:pg|dt|bk|bg|bd|cl`, `edb:pg|dt|rv|bk|cl`, `seb:pg|dt|bk|cl`.

**State/auth notes:**

- Snipe/edits paginate by re-query (stateless, channel-scoped);
  search paginates via session id (server state, channel-bound).
- Every press re-checks `mayReadChannel` + policy role gate for the
  presser; stale `update()` → ephemeral follow-up → drop.
