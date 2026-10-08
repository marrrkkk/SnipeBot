# 023 — Modern archive UI: detail-first snipe, select lists, sections

## Goal

Make the archive browsers modern and scannable: `/snipe` opens the
latest deletion as a rich detail card (not the list), details navigate
to each other, lists replace their wall of Details buttons with a
single jump select, and all three surfaces share one Section-based
design language (avatar thumbnail, accent, gallery, facts).

## Requirements (extend 021 FR-UI-1..10, 022 FR-UI-11..15)

### FR-UI-16 — detail-first /snipe

Bare `/snipe` renders the latest recoverable deletion's detail card.
The card carries Older/Newer (positional walk, disabled at the ends),
List (opens the page containing the message), and Close — one row.
`index:N` renders the Nth detail with identical chrome.

### FR-UI-17 — section detail cards

Detail/walker cards use a `Section` header (avatar thumbnail when the
author resolves live from cache, else text-only), container accent,
relative timestamps, a `MediaGallery` (≤4 images from CDN URLs) above
the always-present filename list, and a facts line. Avatar URLs never
enter `customId`s; missing avatars degrade to no thumbnail.

### FR-UI-18 — select-based lists

Paged lists keep Previous/Next/Close and replace per-row Details
buttons with one `StringSelect` (`snb:jp`, `edb:jp`, `seb:jp` + page/
session cursor; option value = id). Selecting renders the detail with
Back to the originating page. Select routing mirrors the button table;
per-press auth + stale fallback identical.

### FR-UI-19 — shared language on all three surfaces

Edits list/walker and search list/detail adopt the same Section,
gallery, select, and facts patterns via `browserShell.ts`. Bulk views
get the list-select + header polish; group detail structure unchanged.
Export names of existing renderers stay stable.

### FR-UI-20 — no new storage or intents

Avatar/thumbnail/gallery data is live-resolved or already archived
(CDN URLs in snapshots). No mapper, snapshot, schema, intent, or
dependency changes. `File` re-uploads and avatar archiving are
explicitly out.

## Constraints

- Strict TS, no `any`. View models stay discord.js-free (avatar is a
  `string | null`).
- CustomIds ≤100 chars; slash signatures unchanged.
- Per-press `mayReadChannel` + role gate on buttons AND selects.

## Tests / completion

- Extend snipe/edits/search/contextMenu suites: detail-first default,
  Older/Newer incl. ends, List→originating page, select jump + Back,
  thumbnail present/absent, gallery present/absent, select routing +
  unknown prefix, stale select.
- `typecheck + lint + format:check + test (+integration) + build` green.
- Manual (needs human): checklists/acceptance.md.
