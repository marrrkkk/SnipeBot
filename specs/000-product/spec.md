# 000 — Product specification (SnipeBot remake)

## Why

Server owners lose context when messages are deleted/edited: moderation
evidence, answered questions, shared files vanish. The old SnipeBot proved
demand (recover last ≤20 in-memory) but not durability.

## Who

Self-hosting Discord server owners/admins who run their own bot and own
their data (Docker/VPS/home server).

## What (eventual)

Persistent archive of observed messages (snapshots, revisions, deletion
markers, attachment copies); recovery UX (`/snipe`, `/edits`, history,
search); rich inspection (attachments/embeds/reactions/polls/threads);
retention + storage management; best-effort audit-log attribution.

## Boundaries (cannot recover)

- Messages sent before the bot observed them (no historical deletion API).
- Content never received (missing intents/permissions, downtime, uncached partials).
- Attachments not successfully downloaded before expiry.
- Channels the bot cannot view; DMs per policy.
- Executor identity beyond best-effort audit correlation.

## Success criteria

An operator can install via docs, invite with documented intents/permissions,
survive restarts without losing the archive, and recover observed deletions/
edits scoped to the caller's visible channels.
