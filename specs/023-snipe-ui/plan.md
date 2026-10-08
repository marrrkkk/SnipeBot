# 023 — Plan

**Approach:** spec → view models → shell → select routing → snipe →
edits → search + menus → tests → docs → validate. Export names stay
stable throughout so tests change for behavior, not plumbing.

**Files:**

- Create: `specs/023-snipe-ui/*`, `src/interactions/selects.ts`,
  `specs/023-snipe-ui/checklists/acceptance.md`
- Modify: `src/ui/viewModels.ts` (attachment URL fields, `avatarUrl`),
  `src/ui/renderers/browserShell.ts` (`renderSectionPage`, select row),
  `src/ui/renderers/snipeBrowserV2.ts` (section detail, select list),
  `src/ui/renderers/editsBrowserV2.ts` (section walker, select list),
  `src/ui/renderers/searchBrowserV2.ts` (select list, section detail),
  `src/commands/snipe.ts` (detail-first, `dt` pos semantics),
  `src/commands/edits.ts` + `search.ts` + `contextMenu.ts` (render
  through new builders; select handlers), `src/interactions/router.ts`
  (string-select branch), `src/interactions/buttons.ts` (unchanged
  table), docs, all touched test suites

**Interfaces:**

- VM: `AttachmentViewModel { …, contentType, url, proxyUrl }`,
  `MessageViewModel.avatarUrl: string | null`.
- Shell: `renderSectionPage({accent?, heading, subheading, avatarUrl?,
body, galleryUrls?, facts, extras?, buttons})`,
  `jumpSelect({customId, placeholder, options: {label, value,
description?}[]})` returning an `ActionRowBuilder`.
- Selects: `routeSelectMenu(interaction)` → per-prefix handlers
  `handleSnipeSelect / handleEditsSelect / handleSearchSelect`
  reading `interaction.values[0]`.
- CustomIds: `snb:dt:<id>:<pos>` (pos = 1-based recoverable position),
  `snb:jp:<page>`, `edb:jp:<page>`, `seb:jp:<sess>:<page>`;
  `snb:pg/bk/bg/bd/cl`, `edb:*`, `seb:*` unchanged.

**State/auth notes:**

- Detail nav recomputes the recoverable list per press and clamps;
  List target = `ceil(pos / PAGE_SIZE)`; Back from select-jump uses the
  `jp` cursor page.
- Avatars resolve per render from `client.users.cache` (tests inject
  fakes); gallery URLs come from archived attachment CDN links.
