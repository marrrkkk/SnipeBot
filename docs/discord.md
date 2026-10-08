# Discord API reference (verified 2026-10-08)

Central link registry. These are the canonical pages the architecture is
built on — check them before implementing unfamiliar APIs. See
[research.md](research.md) for Q→finding→decision entries.

## discord.js

- Main API docs: https://discord.js.org/docs/packages/discord.js/main
- Stable docs: https://discord.js.org/docs/packages/discord.js/stable
- Guide: https://discordjs.guide/
- Client options / caching (`ClientOptions`, `makeCache`, `sweepers`, `partials`):
  https://discord.js.org/docs/packages/discord.js/main/ClientOptions:Interface
- Client events: https://discord.js.org/docs/packages/discord.js/main/Client:Class
- Builders / slash commands: https://discordjs.guide/slash-commands/

Current release: **discord.js 14.27.0**, requires **Node.js ≥ 24.17.0**.
Examples use ESM (`import`).

## Discord developer docs (docs.discord.com)

- Developer home: https://docs.discord.com/developers/intro
- Gateway: https://docs.discord.com/developers/events/gateway
- Gateway events: https://docs.discord.com/developers/events/gateway-events
- Intents (incl. privileged + Message Content):
  https://docs.discord.com/developers/events/gateway#gateway-intents
- Message resource: https://docs.discord.com/developers/resources/message
- Channel resource: https://docs.discord.com/developers/resources/channel
- Audit log: https://docs.discord.com/developers/resources/audit-log
- Permissions: https://docs.discord.com/developers/topics/permissions
- OAuth2 + bot invite: https://docs.discord.com/developers/platform/oauth2-and-permissions
- Application commands: https://docs.discord.com/developers/interactions/application-commands
- Receiving/responding to interactions:
  https://docs.discord.com/developers/interactions/receiving-and-responding
- Components reference (V2): https://docs.discord.com/developers/components/reference
- Using message components: https://docs.discord.com/developers/components/using-message-components

## Spec Kit / Drizzle

- Spec Kit docs: https://github.github.io/spec-kit/
- Spec Kit repo: https://github.com/github/spec-kit
- Drizzle SQLite: https://orm.drizzle.team/docs/get-started-sqlite

## Key findings (summary; details in research.md)

- **Intents (minimal, final):** `Guilds` + `GuildMessages` + `MessageContent`
  (privileged) + `GuildMessageReactions` (Phase 8) + `GuildMessagePolls`
  (Phase 9, standard). No further intents planned; `GuildMembers` and
  `Presences` are never needed for archiving.
- **Message Content intent** gates `content`, `embeds`, `attachments`,
  `components`, `poll` everywhere (gateway + REST). Exceptions: own
  messages, DMs, mentions, context-menu target message.
- **History API:** `GET /channels/{id}/messages`, `limit` 1–100 (default
  50), `before`/`after`/`around` mutually exclusive; needs `VIEW_CHANNEL`,
  empty without `READ_MESSAGE_HISTORY`. Phase 16 backfills 100/page
  sequentially, relying on discord.js REST backoff for 429s; no revision
  history is available, only current states.
- **Audit log:** `MESSAGE_DELETE` (72), `MESSAGE_BULK_DELETE` (73), 45-day
  retention, needs `VIEW_AUDIT_LOG`. Attribution is best-effort only —
  Phase 15 correlates single deletes (channel + 30s + target rule, one
  retry) and surfaces them hedged; bulk is unmappable.
- **Attachments:** `url`/`proxy_url` are CDN links, not permanent storage;
  voice data adds `duration_secs` + `waveform`. Archive copies locally.
- **Snapshots/forwards:** `message_snapshots[]` (author excluded, depth 1,
  immutable). `HAS_SNAPSHOT` flag `1 << 14`.
- **Components V2 (primary UI, D26):** per-message flag `1 << 15`
  (`MessageFlags.IsComponentsV2`); disables top-level
  content/embeds/poll/stickers; attachments hidden unless exposed via
  components; ≤40 components; flag irreversible once set. Classic
  embeds are not the default (see `docs/components-v2.md`).
- **Caching:** `partials: [Message, Channel, Reaction]` + message sweeper;
  DB is durable, cache is not. Partial deletes → id-only markers.
- **Permissions to request:** `ViewChannel` + `ReadMessageHistory` (observe),
  `SendMessages` (reply). `ViewAuditLog` optional. `ManageMessages` /
  `Administrator` NOT required for sniping. Minimal invite bitfield
  (computed from the library, Phase 19): `68608`.
