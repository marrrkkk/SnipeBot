# 008 — Tasks

- [x] T1 Repo: `replaceReactions` (shell-if-missing, no revision touch)
  - integration (set updated, revision count unchanged)
- [x] T2 Service: `recordReactions` port + stub + drizzle impl
- [x] T3 Mapper: extract `toReactionSnapshots` helper (reuse, green)
- [x] T4 Handlers: add/remove/removeAll/removeEmoji → one refresh path
      (unit: records, partial-unfetchable skipped)
- [x] T5 Render: reactions/embeds/sticker-count lines in `/snipe` (unit)
- [x] T6 Intent: `GuildMessageReactions` + pinning test + docs touch
- [ ] T7 Live acceptance (checklists/acceptance.md) — needs token

Notes: reaction events carry `MessageReaction | PartialMessageReaction`
(handler takes the structural `{ message }`); remove/removeAll/emoji share
the fetch-when-partial refresh; sticker names not backfilled (counts only).
