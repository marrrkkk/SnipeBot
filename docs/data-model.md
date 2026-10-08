# Data model (implemented in Phase 3 — `src/database/schema.ts` + `drizzle/`)

Code truth: `src/domain/messageSnapshot.ts` (domain types),
`src/database/schema.ts`, migration `drizzle/0000_*.sql`,
`src/repositories/drizzleMessageRepository.ts`.

## Snapshot rules

- **Immutable:** `id`, `guildId`, `channelId`, `threadId`, `author.*`,
  `createdAt`, `messageType`.
- **Revisioned (append-only):** `content`, `editedAt`, `attachments`,
  `embeds`, `reactions`, `componentsRaw`, `poll`, `flags`, `pinned`.
  Each `MESSAGE_UPDATE` appends a `message_revisions` row.
- **Derived:** `deletedAt`, `deleteKind` (single/bulk/unknown), search
  index rows, media `localPath`.
- **Needs MessageContent intent:** `content`, `attachments`, `embeds`,
  `componentsRaw`, `poll`. Empty without it — store the emptiness, flag it.
- **Often partial/null:** `guildId` (DMs), `threadId`, `editedAt`,
  `reference.*`, `snapshotOfForwarded`, `reactions` (absent until observed).
- **Safe to ignore for now:** `nonce`, `webhook/application` metadata beyond
  ids, `mention_channels` denormalization (Phase 8).
- **Too volatile to archive verbatim:** live `url`/`proxy_url` (copy bytes
  instead), presence-adjacent fields.

## Tables (as built)

```text
guilds(id, name null, icon_hash null)
channels(id, guild_id null, kind null, name null, parent_id null, archived_at null)
users(id, username, discriminator null, bot, avatar_hash null, webhook_id null)
messages(id, guild_id null, channel_id null, thread_id null, author_id null,
         message_type null, created_at null, deleted_at null, delete_kind null,
         ref_message_id null, ref_channel_id null, ref_guild_id null, ref_type null)
message_revisions(id, message_id, rev_no, edited_at null, content,
                  flags, tts, pinned, sticker_ids JSON, fingerprint, captured_at)
attachments(id, message_id, rev_no, attachment_id, filename,
            content_type null, size_bytes null, remote_url null, proxy_url null,
            local_path null, height null, width null,
            duration_secs null, waveform null)
embeds(id, message_id, rev_no, idx, raw_json)
reactions(id, message_id, emoji_id null, emoji_name null, count, captured_at)
polls(id, message_id, rev_no null, raw_json)
forward_snapshots(id, message_id, raw_json)
deletion_events(id, message_id, channel_id null, kind, observed_at,
                audit_entry_id null, executor_id null)
retention_policies(id, scope unique, keep_days null, keep_revisions null,
                   media_keep_days null)
guild_settings(guild_id PK, snipe_role_ids JSON, archiving_enabled,
               updated_at)
```

- Indexes: `(channel_id, created_at)`, `(author_id, created_at)`,
  `(deleted_at)`, per-message lookups, `deletion_events(message_id)`,
  plus `message_fts` (FTS5 external content on revisions with
  insert/delete/update triggers; DDL in `src/database/searchIndex.ts`).
- Resolved uncertainties: stickers → `sticker_ids` JSON on the revision
  (normalization deferred — carried, not needed for snipe display);
  component-V2 payloads → raw JSON via `embeds`/`componentsRaw` path
  (no dedicated V2 columns; revisit if V2 querying is required);
  voice fields → `duration_secs`/`waveform` on attachments (done);
  `mention_*` → not stored (carried to Phase 8).
- `created_at`/`channel_id` nullable: never-observed deletes become
  id-only shells. Guild/channel shells start sparse; enriched observations
  (message channel objects, resolver fetches, thread lifecycle events)
  upsert kind/name/parent — enriched data is never clobbered by later
  sparse observations.
- Revisions append only when the observed-state fingerprint changes
  (content/editedAt/flags/tts/pinned/stickers/attachments/embeds/poll —
  so attachment-only edits are kept); reactions refresh point-in-time on
  every observation. `rev_no` uniqueness enforced in code (single sync
  writer — no concurrency hazard).
- First observed deletion wins on the message row; every sighting lands in
  `deletion_events` (audit correlation in Phase 15).

Verified during Phase 2 (discord.js `Message.js` `_patch`): forwarded
snapshots arrive as real `Message` instances with the reference's
id/channel/guild merged in, but `author` genuinely absent — the mapper
stores a documented `unknown` sentinel author rather than fabricating
attribution. `threadId` is resolved from the cached channel, else via the
lazy `ThreadResolver` (one fetch per unknown channel, 60s negative TTL);
only truly unresolvable channels fall back to `null`. `parentId` means
parent channel for threads, category for guild channels.

## Retention

`retention_policies` is live since Phase 14: global row plus per-guild
overrides, effective per field. Deletes are hard deletes from SQLite +
media dir; vacuum on schedule. No soft-delete limbo in v1.
