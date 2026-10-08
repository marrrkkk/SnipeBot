# 016 — Backfill / history import

## Goal

A new (or wiped) install can fill its archive from Discord history —
explicitly, channel by channel, without duplicating or rewriting what
live observation already captured.

## Requirements

- `/backfill [limit]` (limit 1–1000, default 100): imports the interaction
  channel's history, newest pages first, 100 per REST page, sequential.
  Interaction channel only (no channel option — precedent holds).
- Fills gaps only: messages with zero revisions are snapshotted in;
  known messages are never rewritten (live observation owns their future).
  Re-running is safe by construction (dedupe + skip-known).
- Per-message mapping failures skip with a debug log (one bad apple never
  aborts the import); page fetch failure ends the run with partial
  progress reported.
- `deferReply` (ephemeral) before slow work; `editReply` summary:
  `Imported N new, skipped M known, across P pages.` Slice pages to the
  remaining limit (exact counts, no overshoot).
- Backfilled attachments queue for the media worker automatically (null
  `local_path`) — no backfill-specific media code; drains over ticks.
- Auth: `mayReadChannel` first (admins without channel access cannot
  pull what they cannot see), then `ManageGuild` (bulk read+write+spend
  is an admin action), guild-only. Same ephemeral denial style.
- Rate limits: rely on discord.js REST backoff; sequential pages only.
  Document the reliance.

## Constraints

- No new intents/permissions/dependencies/tables. Strict TS, no `any`.
- No revision history is reconstructed (the API doesn't provide it);
  a backfilled message starts at rev 1 with current state.

## Tests / completion

- Unit (`history.test.ts`): paging to exhaustion, empty, fetch failure.
- Integration: import counts, known-untouched (content preserved),
  rerun idempotence.
- Unit (`backfill.test.ts`): summary, ManageGuild denial, DM denial,
  unconfigured, fetch failure partials, limit slicing, mapper-skip.
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
