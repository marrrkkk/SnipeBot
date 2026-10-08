# 008 — Reactions + richer message metadata

## Goal

Reactions stay fresh after archival, and `/snipe` shows the rich context
it already stores (reactions, embeds, stickers).

## Requirements

- Enable the standard (non-privileged) `GuildMessageReactions` intent.
  Document in `docs/discord.md`; amend decision D8.
- Handle `MessageReactionAdd/Remove/RemoveAll/RemoveEmoji` with ONE refresh
  path: resolve the message (fetch when partial, skip on failure) →
  `recordReactions(messageId, snapshots, at)`. No revision is appended;
  refresh replaces the point-in-time set. Per-event isolation; bot-own
  reactions are data, not skipped (counts are counts).
- Repo `replaceReactions`: shell-if-missing, delete + insert in one
  transaction. Never touches revisions.
- Service `recordReactions` on the interface (+ stub). Handlers fetch via
  Discord then call it with domain `ReactionSnapshot[]` (mapper helper
  reused — services stay discord-free).
- `/snipe` render adds, when present: Reactions line
  (`👍 ×3 · <:name:id> ×1`, custom vs unicode), Embeds line
  (`N embed(s): <first title or 'no title'>`), stickers as count.
  Same `allowedMentions` suppression applies (shared path).
- Sticker names are NOT backfilled: only counts display (ids alone are
  meaningless; name capture is carried, not needed for v1).

## Constraints

- No new privileged intents/permissions/dependencies/tables.
- One REST fetch per reaction event max; storm debouncing is Phase 17.
- Strict TS, no `any`.

## Tests / completion

- Integration: `replaceReactions` updates the set with revision count
  unchanged.
- Unit (reaction fakes, real `Client` emit): add/remove record snapshots;
  partial+unfetchable skipped; removeAll records empty; bot-authored
  reactions still recorded.
- Unit: client intents include `GuildMessageReactions`; snipe render shows
  reactions/embeds/sticker-count lines.
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
