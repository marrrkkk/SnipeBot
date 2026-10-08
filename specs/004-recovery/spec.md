# 004 — Deleted-message recovery (`/snipe`)

## Goal

`/snipe [index]` shows the nth most recently deleted message in the
interaction channel, recovered from the Phase-3 archive.

## Requirements

- `/snipe`, integer option `index` 1–10 (default 1): nth recoverable
  deletion in this channel, newest first.
- Recoverable = snapshot exists AND has substance: non-blank content, or
  attachments/embeds/poll/forwarded snapshot. Contentless markers
  (never-observed deletes) are skipped while counting.
- Fewer than `index` recoverable → ephemeral "only N deleted message(s)
  recoverable here."
- None → ephemeral "nothing to snipe" (never reveals other channels).
- Success reply is public (snipe is social); denials/empties ephemeral.
- Render (classic embed, not V2): author name, content (or
  "_no text content_" + attachment listing), deletion timestamp, attachment
  filenames/sizes line when present. Files themselves: Phase 7.

## Authorization (binding, from docs/security.md)

- No channel option: the command can only ever read the interaction
  channel — cross-channel leaks impossible by construction.
- Guild: caller needs live `ViewChannel` on the interaction channel
  (`interaction.memberPermissions`), else ephemeral denial and no DB read.
- DM (`memberPermissions` null): allowed — caller reads their own DM.

## Constraints

- No new intents/permissions/dependencies. Strict TS, no `any`.
- One failed snipe never crashes the process (router catch + command
  try/catch with tailored ephemeral replies).
- Query port behind a write-once module binding (`configureSnipeQuery`,
  set in `index.ts`); tests inject fakes. Precedent: `getDb` singleton.

## Discord API deps

Chat-input command + integer option (`SlashCommandBuilder`),
`memberPermissions.has(ViewChannel)`, `EmbedBuilder`. Sources:
docs/discord.md.

## Tests / completion

- Unit (`snipe.test.ts`, interaction fakes): latest-first, index 2,
  empty → ephemeral, no-ViewChannel → denied + no query call, DM allowed,
  contentless skipped.
- Integration: `listDeletionsForChannel` ordering + channel scoping.
- `typecheck + lint + test + build` green; deploy body contains `snipe`.
- Manual (blocked without token): checklists/acceptance.md.
