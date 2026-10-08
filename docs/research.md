# Research log

Format per entry: Question → Finding → Official source → Implication → Decision.

## R1 — Can deleted content be fetched after deletion?

- Finding: No general-purpose "fetch deleted message" endpoint exists.
  `MESSAGE_DELETE`/`MESSAGE_DELETE_BULK` carry ids only (content only if
  cached). History endpoints return live messages only.
- Source: https://docs.discord.com/developers/resources/message,
  https://docs.discord.com/developers/events/gateway-events
- Implication: recovery depends entirely on pre-deletion capture.
- Decision: persist a snapshot on every observed `MESSAGE_CREATE`; treat
  uncached deletes as id-only markers.

## R2 — Does MESSAGE_UPDATE carry history?

- Finding: No. One event per edit with the new state only.
- Source: gateway-events docs above.
- Implication: edit history must be accumulated locally.
- Decision: append-only `message_revisions` table; every update = new row.

## R3 — Can discord.js Message objects be durable storage?

- Finding: No — live, cached, circular, version-coupled objects.
- Source: discord.js docs + guide partials/caching topics.
- Implication: schema would break across upgrades; leaks Discord internals.
- Decision: `MessageSnapshot` domain type (`src/domain/messageSnapshot.ts`);
  discord.js types stop at the event adapter.

## R4 — What does MessageContent gate?

- Finding: `content`, `embeds`, `attachments`, `components`, `poll` are
  empty/omitted without the privileged intent (except own msgs, DMs,
  mentions, context-menu target).
- Source: https://docs.discord.com/developers/events/gateway#message-content-intent
- Implication: without it the archive is id-only shells.
- Decision: `MessageContent` is a required bootstrap intent; document the
  Developer Portal toggle + 10k-user review threshold.

## R5 — Which intents are minimal?

- Finding: `Guilds` (channels/threads/interactions), `GuildMessages`
  (create/update/delete/bulk), `MessageContent` (fields). Reactions/polls
  each have their own intents.
- Source: intents table at the gateway link above.
- Implication: enabling everything adds review burden + data exposure.
- Decision: bootstrap = those three; `GuildMessageReactions` /
  `GuildMessagePolls` land with Phases 8–9.

## R6 — Audit-log attribution reliable?

- Finding: entries exist (`MESSAGE_DELETE` 72, `MESSAGE_BULK_DELETE` 73,
  45d retention, `VIEW_AUDIT_LOG`) but carry executor/channel/count — not
  message content — and race with the gateway event.
- Source: https://docs.discord.com/developers/resources/audit-log
- Implication: correlation is heuristic, never ground truth.
- Decision: Phase 15 only; surface as "possibly deleted by X".

## R12 — How to correlate a delete to an audit entry? (Phase 15)

- Finding: entries carry executor + target (author) + channel + timestamp,
  but write timing races the gateway event in both directions.
- Implication: match on channel + 30s recency + target-absent-or-equal;
  one retry after 5s catches laggards; bulk entries are unmappable.
- Decision: record-first-then-attribute, annotate-only-unattributed,
  hedge in UI. No new intent (REST, not gateway).

## R7 — Are attachment URLs permanent?

- Finding: No. Signed CDN `url`/`proxy_url` with metadata
  (`size`, `content_type`, `height/width`, `duration_secs`, `waveform`).
- Source: message resource attachment object.
- Implication: archive must copy bytes locally to survive expiry.
- Decision: `MediaStorage` abstraction; local fs first (Phase 7), S3 later.

## R8 — Threads/forum/media channels?

- Finding: first-class channel/thread objects; starter messages, archive/
  lock states; history endpoints need `READ_MESSAGE_HISTORY`.
- Source: channel resource + gateway `GUILDS` intent thread events.
- Implication: model must not assume plain text channels.
- Decision: `channelId` + nullable `threadId` on snapshots; channel-type
  table in Phase 3.

## R9 — Forwards/snapshots?

- Finding: `message_snapshots[]`, author excluded, depth 1, immutable,
  `HAS_SNAPSHOT 1<<14`; forward = `message_reference.type 1`.
- Source: message resource snapshot section.
- Implication: persist snapshot JSON as-is plus normalized subset.
- Decision: `snapshotOfForwarded` field, depth-capped.

## R10 — Components V2 default? (SUPERSEDED 2026-10-08 by R13/D26)

- Finding: flag `1<<15`, disables content/embeds/poll/stickers, ≤40
  components, attachments hidden unless exposed via components.
- Source: https://docs.discord.com/developers/components/reference
- Implication: V2 changes rendering + archivable fields.
- Decision: classic embeds for bootstrap; V2 opt-in per surface in Phase 12.

## R13 — Components V2 as primary UI (verified 2026-10-08)

- Finding: `IS_COMPONENTS_V2` (`1<<15`) is per-message and
  irreversible; V2 disables top-level content/embeds/poll/stickers,
  hides attachments unless exposed via Media Gallery/File, caps at 40
  components; buttons live in Action Rows (≤5) or Section accessories
  with 1–100 char `custom_id`; interactions ACK within 3s, tokens live
  15 min; deferred ACKs cannot set the V2 flag (set it on the edit
  instead). discord.js 14.27.0 ships `ContainerBuilder`,
  `SectionBuilder`, `TextDisplayBuilder`, `SeparatorBuilder`,
  `MediaGalleryBuilder`, `FileBuilder`, `MessageFlags.IsComponentsV2`
  (`32768`, verified against the installed package).
- Source: https://docs.discord.com/developers/components/reference,
  https://docs.discord.com/developers/components/using-message-components,
  https://docs.discord.com/developers/interactions/receiving-and-responding,
  https://docs.discord.com/developers/resources/message,
  https://discord.js.org/docs/packages/discord.js/main
- Implication: every substantial interactive surface must be designed
  V2-native; view models stay discord.js-free and renderers own the
  builders; `customId`s carry short cursors (server reconstructs state).
- Decision: D26 — Components V2-first UI; details in
  `docs/components-v2.md`.

## R14 — Search pagination needs server-side sessions (2026-10-08)

- Finding: interactive-component `custom_id` is 1–100 chars
  (per the components reference); a full search query (text + author +
  date + flags) does not fit, so page-2+ buttons cannot carry the query.
- Source: https://docs.discord.com/developers/components/reference
  (`custom_id` row), https://docs.discord.com/developers/components/using-message-components
- Implication: snipe/edits browsers re-query per press (channel is the
  whole cursor), but search needs authoritative server state keyed by a
  short session id in the `customId`.
- Decision: `src/ui/sessions.ts` — 8-hex-char ids, 15-min TTL (matches
  the interaction token lifetime), 500-entry cap with lazy prune,
  channel-bound lookup; missing/expired sessions render the expired
  state (D27).

## R11 — SQLite/Drizzle for self-host?

- Finding: single-file, WAL mode, `drizzle-orm/better-sqlite3` sync driver,
  `drizzle-kit generate/migrate`, FTS5 available for search.
- Source: https://orm.drizzle.team/docs/get-started-sqlite
- Implication: zero-ops persistence fitting one-process deployment.
- Decision: SQLite + Drizzle + better-sqlite3; FTS5 in Phase 11.
