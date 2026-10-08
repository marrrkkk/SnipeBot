# 005 — Edit history (`/edits`)

## Goal

`/edits [index]` shows the before/after of the nth most recently edited
message in the interaction channel, from the Phase-3 revision store.

## Requirements

- `/edits`, integer option `index` 1–10 (default 1): nth most recently
  edited message in this channel (by Discord edit timestamp, newest first).
- "Edited" = ≥1 revision with non-null `edited_at`. First revision is
  typically the unedited original.
- Render (classic embed): author, current content as description,
  "Original" field with first content, footer with edit count, last-edit
  relative timestamp (`<t:unix:R>`), and message id. Empty text →
  "_no text content_". Long content truncated (description ≤2000,
  field ≤1000).
- None → ephemeral "No edited messages here."; index exceeds →
  ephemeral "Only N edited message(s) here."
- Success public; denials/empties ephemeral (same policy as `/snipe`).

## Authorization (binding, from docs/security.md)

Identical to 004: no channel option (interaction-channel scope only),
live `ViewChannel` required in guilds (no DB read on denial), DMs allowed.
Shared `mayReadChannel` helper — no duplicated policy logic.

## Constraints

- No new intents/permissions/dependencies. Strict TS, no `any`.
- Revision paging UI (buttons, compare view) is Phase 12; this phase is the
  read surface + data access only.
- Query port `EditHistoryPort` + write-once binding (same pattern as 004).

## Discord API deps

Chat-input + integer option, `EmbedBuilder`, `memberPermissions`.
Sources: docs/discord.md.

## Tests / completion

- Unit (`edits.test.ts`, interaction fakes): latest-first, index 2,
  empty → ephemeral, no-ViewChannel → denied + no query, DM allowed,
  truncation, unconfigured-closed.
- Integration: `listEditedMessages` ordering + channel scoping,
  `getRevisions` ascending content sequence.
- Shared-helper refactors (channelAccess, rendering, interaction fakes)
  keep all existing suites green.
- `typecheck + lint + test + build` green; deploy body contains `edits`.
- Manual (blocked without token): checklists/acceptance.md.
