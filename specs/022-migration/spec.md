# 022 — Migrate /snipe, /edits, /search to Components V2

## Goal

Finish the V2-first migration (D26): the three archive read surfaces —
`/snipe`, `/edits`, `/search` — plus the two message context menus
become V2-native. The 021 proof-of-concept command (`/snipebrowse`)
and the classic `edits:rev:` button scheme retire; classic embed paths
for these surfaces are removed, not kept in parallel.

## Requirements (extend 021 FR-UI-1..10)

### FR-UI-11 — /snipe is a V2 browser

Default: paged singles browser (5/page, newest first) with
Previous/Next/Details-per-row/Close; Details opens the message-detail
view with Back. `index: N` opens the Nth recoverable deletion's detail
directly (Back returns to its page); out-of-range stays an ephemeral
count message. `bulk: true` opens the bulk-groups browser (list +
group detail with Prev/Next-group, Back, Close); `index` selects the
Nth group. Group rendering preserves current semantics (≤10 members +
more-count).

### FR-UI-12 — /edits is a V2 browser + walker

Default: paged edited-messages browser with Details-per-row opening
the revision walker. `index: N` opens the Nth message's walker at its
latest revision. Walker shows one revision (author, channel, Revision
N of M, content) with Older/Newer always present and disabled at the
ends, plus Back (list context) and Close. The `edits:rev:` customId
scheme retires in favor of `edb:`; in-flight old buttons fall into the
router's unknown-prefix path (debug-logged, ignored) — acceptable
because component tokens expire after 15 minutes.

### FR-UI-13 — /search is a V2 session browser

Results render as a paged V2 browser (5/page) with Details opening the
message-detail view. Full queries do not fit the 100-char `customId`
budget, so pagination state lives in a bounded server-side session
store (`src/ui/sessions.ts`: 8-hex-char ids, 15-min TTL, 500-entry cap,
lazy prune, channel-bound lookup). Expired/missing sessions render the
clean expired state. Option parsing/validation behavior (constraints
required, date format, ephemeral guidance) is unchanged.

### FR-UI-14 — context menus go V2

View Edit History renders the V2 walker (Older/Newer + Close, no Back
without list context). Search User Messages renders the V2 session
browser (same `seb:` buttons as `/search`).

### FR-UI-15 — classic paths removed

`renderSnipe`/`renderBulk` (snipe.ts), `renderRevisionPage`/
`buildRevisionNav`/`handleRevisionButton` (edits.ts), `renderHits`
(search.ts), and the `/snipebrowse` POC module are deleted. Ephemeral
plain-text guidance/validation/denial messages stay (trivial,
non-interactive — justified §26 exception). `/stats`, `/settings`,
`/backfill`, `/ping` are out of scope and stay as-is.

## Constraints

- No new intents/permissions/dependencies/tables. Strict TS, no `any`.
- Slash signatures unchanged (`snipe` index/bulk, `edits` index,
  `search` text/author/after/has/deleted) — deploy body changes only by
  the `snipebrowse` removal.
- `MessageSearchPort` gains `findById` (already satisfied structurally
  by `DrizzleMessageRepository`; no runtime change) for search detail
  views. Search detail requires filed-under + auth only — kept (non-
  deleted) messages are valid hits, so the snipe recoverability
  predicate does NOT apply.
- Shared builders live in `src/ui/renderers/browserShell.ts`
  (generic list/detail/state pages); surface files own row strings +
  customIds. View models stay discord.js-free.

## Tests / completion

- Rewrite: `snipe.test.ts`, `edits.test.ts`, `search.test.ts`,
  `contextMenu.test.ts` (V2 payloads, navigation, auth, stale states);
  update `router.test.ts` (`edb:` dispatch); new `sessions.test.ts`;
  extend renderer coverage for bulk/edits/search lists + walker.
- `typecheck + lint + format:check + test (+integration) + build` green.
- Manual (blocked without token): checklists/acceptance.md.
