# Architecture

SnipeBot is a single self-hosted Node.js process: Discord gateway →
thin event adapters → application services → repositories → SQLite +
local media dir. See [discord.md](discord.md) for API facts,
[data-model.md](data-model.md) for persistence, [storage.md](storage.md)
for files, [security.md](security.md) for the authorization model.

## Layers

```text
Discord integration (src/discord, src/events, src/commands, src/interactions)
        ↓  discord.js types only at this boundary; normalize to domain types
application services (src/services) — orchestration, error isolation
        ↓
domain (src/domain) — MessageSnapshot et al., no discord.js imports
        ↓
repositories (src/repositories) — interfaces; implemented by database layer
        ↓
database/storage (src/database, src/storage) — drizzle/SQLite, fs media
```

Rules (enforced, see AGENTS.md):

- Event handlers stay thin: parse/validate, call a service, catch per-event.
- Commands are modules (`CommandModule` in `src/commands/types.ts`),
  routed by `src/interactions/router.ts`. No giant if-chain.
- Never persist discord.js `Message` objects. Normalize to
  `MessageSnapshot` (`src/domain/messageSnapshot.ts`) at the boundary.
- Domain/services never import `discord.js`. Only the outer layer does.
- One failure (one message, one download, one interaction) never crashes
  the process. Per-event try/catch + process-level logging.

## Module map (bootstrap)

| Path                             | Role                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/index.ts`                   | Wiring only: config → client → events → login                                                                                                                      |
| `src/config/env.ts`              | zod-validated env, fail fast                                                                                                                                       |
| `src/discord/client.ts`          | Client factory: intents, partials, sweepers                                                                                                                        |
| `src/events/`                    | One file per event + `index.ts` registrar                                                                                                                          |
| `src/commands/`                  | `CommandModule`s + `commandMap` registry                                                                                                                           |
| `src/interactions/router.ts`     | Interaction dispatch (chat-input, autocomplete, future components)                                                                                                 |
| `src/domain/`                    | Snapshot types (discord.js-free)                                                                                                                                   |
| `src/ui/`                        | V2-first UI: `viewModels.ts` + `browser.ts` + `sessions.ts` (discord.js-free) → `renderers/` (generic `browserShell.ts` + per-surface V2 renderers, owns builders) |
| `src/services/`                  | `ArchiveService` interface + drizzle impl (`recordDeleteBulk` added)                                                                                               |
| `src/repositories/`              | `DrizzleMessageRepository` (shells, revisions, deletions, reassembly)                                                                                              |
| `src/database/`                  | drizzle connection + preliminary schema                                                                                                                            |
| `src/storage/`                   | `MediaStorage` interface + local-fs impl                                                                                                                           |
| `src/utils/logger.ts`            | Zero-dep JSON logger, no secret/content logging                                                                                                                    |
| `src/scripts/deploy-commands.ts` | REST command registration                                                                                                                                          |
| `src/scripts/migrate.ts`         | drizzle migration runner                                                                                                                                           |

## Cache vs archive

- **discord.js cache = operational cache.** Sweepable
  (`messages: { interval: 3600, lifetime: 1800 }`). Never the source of truth.
- **SQLite = durable archive.** Every observed create/update/delete becomes
  a snapshot row immediately; deletions that arrive as partials become
  id-only markers when the content was never seen.
- Message updates do not carry history: each `MESSAGE_UPDATE` persists a new
  revision row. Deleted content cannot be fetched after the fact — capture
  before deletion or it is gone (see [research.md](research.md)).

## Interaction lifecycle

`interactionCreate` → `routeInteraction` → command module `execute()` (or
`routeButton`, or message-context map) → ephemeral reply on failure.

- Chat-input commands: `commandMap` by slash name (unchanged).
- Message context commands: `messageContextMap` by command name
  (Discord-provided, no parsing). User context commands: none (no
  user-scoped surface justified).
- Buttons: `src/interactions/buttons.ts` table keyed by `customId` prefix.
  V2 browser schemes (all short cursors, ≤100 chars; snowflake args
  contain no colons, so naive split is safe):
  `snb:pg|dt|np|bk|cl` (singles; `np` walks by position) +
  `snb:bg|bd` (bulk groups); jump selects `snb:jp|jb` (value = picked
  id/position),
  `edb:pg|dt|rv|bk|cl` (edits list + revision walker) + `edb:jp`,
  `seb:pg|dt|bk|cl` (search; carries a session id — see below) + `seb:jp`.
  Selects route via `src/interactions/selects.ts` (same prefix table
  shape, same per-press auth); unknown prefixes debug-logged.
  Validated per route; unknown prefixes debug-logged (this is also
  where the retired `edits:rev:` scheme lands).
- Stale component tokens: `update()` → ephemeral `followUp()` → drop.

## Discord UI layer (Components V2-first, D26)

```text
Archive Domain
       ↓
Application Services
       ↓
View Models (src/ui/viewModels.ts — discord.js-free)
       ↓
Components V2 Renderer (src/ui/renderers/ — owns all builders)
       ↓
Discord Interaction (flags: MessageFlags.IsComponentsV2)
       ↓
Buttons / Selects / Actions
       ↓
Interaction Router (src/interactions/buttons.ts)
       ↓
Application Layer (re-checks auth, reconstructs state)
```

Rules:

- Components V2 is the default presentation architecture for
  substantial interactive surfaces (browsing, search, edit history,
  details, filters, pagination, context). Trivial confirmations may
  stay plain text with a documented reason.
- `views` = what the user should see (view models);
  `renderers` = how it is represented in V2 (`ContainerBuilder` trees).
  `src/domain`, `src/services`, `src/repositories` never import
  `discord.js` — and view models don't either; only `src/ui/renderers/`
  and the outer Discord layer construct builders.
- No fake V2: never stuff `EmbedBuilder` output into a V2 tree.
  Redesign with text displays/sections/media (see
  `docs/components-v2.md`).
- Browser state (`src/ui/browser.ts`) is reconstructable server-side
  (guild/channel/query/page/filters/selection); `customId`s carry short
  cursors, not authority. Snipe/edits browsers re-query per press
  (stateless, channel-scoped); search queries don't fit `customId`s, so
  search pagination uses the bounded session store (`src/ui/sessions.ts`:
  8-hex-char ids, 15-min TTL, 500-entry cap, channel-bound lookup).
  Archive size ≠ query result size ≠ UI page size (default 5 rows/page;
  the historical 20-message storage limit must never return).
- Every V2 interaction re-checks authorization (`mayReadChannel` +
  policy role gate) in the application layer; expired tokens render a
  clean "browser expired → run the command again" state.

## Observability

- In-process metrics only (`src/observability/metrics.ts`): fixed-name
  counters/gauges, no user content, no per-user labels, reset on restart.
  Wired at service ops, router executions/errors, worker runs, gateway
  lifecycle. `/stats` renders counts + uptime (ephemeral, role-gated).
- Hot-path coalescing: reaction/vote refreshes collapse per message (5s
  trailing, `0` disables); thread resolution caches per channel; REST
  pacing otherwise rides discord.js backoff. No queue system without
  evidence (reconnect floods stay lib-queued + sync-serialized).
- Load profile (measured 2026-10-08, `npm run load:test 1000`): ~770
  snapshots/s single-process SQLite on dev hardware; re-measure on your
  own target before promising anything.
