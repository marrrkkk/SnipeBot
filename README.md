# SnipeBot

[![ci](https://github.com/marrrkkk/SnipeBot/actions/workflows/ci.yml/badge.svg)](https://github.com/marrrkkk/SnipeBot/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Self-hosted Discord message archive, recovery, and inspection bot.
You run it, you own the data: SQLite + a local media folder — no SaaS,
no shared database, no central server. Its headline feature is
**sniping**: recovering deleted messages and browsing edit history,
right inside Discord, through a native Components V2 browser UI.

## Features

- **`/snipe`** — opens the latest deleted message as a rich detail card
  (author avatar, channel, timestamps, content, attachment gallery,
  reactions/embeds/polls summary). **Older/Newer** walk through other
  deletions, **List** opens the paged browser, and a **jump select**
  picks any result. `/snipe index:3` jumps straight to #3;
  `/snipe bulk:true` browses bulk-deletion purges as groups.
- **`/edits`** — paged browser of edited messages plus a revision walker
  (Older/Newer through every revision, never just before/after).
- **`/search`** — full-text archive search (`text:`, `author:`,
  `after: YYYY-MM-DD`, `has: attachment|poll`, `deleted:`) with paged
  V2 results and per-hit detail views.
- **Message context menus** — right-click any message: _View Edit
  History_ or _Search User Messages_.
- **Archive engine** — every observed message snapshotted to SQLite on
  sight (deletes/edits can't be fetched after the fact); attachments
  copied locally before CDN links expire; reactions, polls, voice
  durations, threads, and best-effort deletion attribution all archived.
- **`/backfill`** — import a channel's recent history (paged, resumable).
- **`/settings` + `/stats`** — per-server role gates, archiving opt-out,
  retention windows, and archive statistics.
- **Privacy by design** — channel visibility is re-checked at read time
  on every command _and_ every button press, so `/snipe` can never leak
  channels the caller can't see. DMs are not archived unless explicitly
  enabled. Logs never contain message content.

## Requirements

- Node.js ≥ 24.17.0 and npm (or Docker — see below)
- A Discord application with a bot token
- The privileged **Message Content** intent enabled (Bot page)

## Setup

### 1. Create the Discord application

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. **Bot** page → **Reset Token** → copy it (this is `DISCORD_TOKEN`).
3. **Bot** page → enable **Message Content Intent** (privileged).
4. Copy the **Application ID** (this is `DISCORD_CLIENT_ID`).
5. Invite the bot with minimal permissions (`ViewChannel` +
   `ReadMessageHistory` + `SendMessages` = bitfield `68608`):

   ```text
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=68608&scope=bot%20applications.commands
   ```

### 2. Configure

```sh
cp .env.example .env   # then fill in DISCORD_TOKEN + DISCORD_CLIENT_ID
chmod 600 .env
```

| Variable             | Required    | Default              | Notes                                                              |
| -------------------- | ----------- | -------------------- | ------------------------------------------------------------------ |
| `DISCORD_TOKEN`      | yes         | —                    | Bot token. Never commit it.                                        |
| `DISCORD_CLIENT_ID`  | for deploys | —                    | Application ID for `deploy:commands`.                              |
| `DISCORD_GUILD_ID`   | no          | —                    | Set: instant guild command deploy. Empty: global (takes up to 1h). |
| `DATABASE_PATH`      | no          | `./data/snipebot.db` | SQLite file (use `/app/data/…` in containers).                     |
| `MEDIA_STORAGE_PATH` | no          | `./data/media`       | Local attachment archive.                                          |
| `MEDIA_MAX_BYTES`    | no          | `100000000`          | Largest single attachment archived.                                |
| `ARCHIVE_DMS`        | no          | `false`              | Must be exactly `'true'` to archive DMs.                           |
| `NODE_ENV`           | no          | `development`        | Containers set `production`.                                       |
| `LOG_LEVEL`          | no          | `info`               | `debug` for troubleshooting.                                       |

### 3. Install, migrate, deploy, run

```sh
npm ci
npm run db:migrate       # create/upgrade the SQLite schema
npm run deploy:commands  # register slash + context-menu commands
npm run dev              # watch mode, or:
npm run build && node dist/index.js
```

For production without Docker: `NODE_ENV=production node dist/index.js`
(e.g. behind systemd with `Restart=always`); re-run `db:migrate` after
every upgrade.

### 4. Docker (recommended for self-hosting)

```sh
docker compose up -d --build
docker compose logs -f snipebot   # expect "Logged in as …"
```

The container runs migrations automatically on every boot, runs as a
non-root user, persists `./data` (database + media) via a volume, and
exposes no ports (outbound gateway traffic only). Upgrades:
`docker compose up -d --build` again (migrations re-apply harmlessly).
Full details, backup/restore, and troubleshooting:
[docs/deployment.md](docs/deployment.md).

## Usage

All recovery commands are channel-scoped and auth-checked — you only
ever see messages from channels you can currently view.

| Command                                           | What it does                                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/snipe`                                          | Latest deleted message as a detail card. Older/Newer walk history, List opens the browser, Close ends it.                         |
| `/snipe index:3`                                  | The 3rd-latest recoverable deletion (1–10).                                                                                       |
| `/snipe bulk:true`                                | Bulk-deletion purges as browsable groups.                                                                                         |
| `/edits`                                          | Edited-message browser; open any message to walk every revision.                                                                  |
| `/search text:docker author:@mark has:attachment` | Full-text search with filters; results are browsable.                                                                             |
| Right-click message → _View Edit History_         | Revision walker for that message.                                                                                                 |
| Right-click message → _Search User Messages_      | That author's messages in this channel.                                                                                           |
| `/backfill limit:100`                             | Import this channel's recent history into the archive.                                                                            |
| `/settings …`                                     | `snipe-roles` (restrict commands to roles), `archiving` (server opt-out), `retention-*` (expiry windows). Requires Manage Server. |
| `/stats`                                          | Archive counts and uptime.                                                                                                        |
| `/ping`                                           | Liveness check.                                                                                                                   |

**How sniping works:** the bot must be online and able to see the
channel _before_ deletion — Discord offers no fetch-deleted-messages
API, so recovery depends entirely on pre-deletion capture. Uncached
deletes become id-only markers (`*no text content*`).

## Required intents & permissions

- **Intents:** `Guilds`, `GuildMessages`, `MessageContent`
  (privileged — toggle in the Portal), `GuildMessageReactions`,
  `GuildMessagePolls`. Rationale: [docs/discord.md](docs/discord.md).
- **Bot permissions:** `ViewChannel` + `ReadMessageHistory` (observe),
  `SendMessages` (reply). Optional: `ViewAuditLog` (best-effort
  "possibly deleted by X" hints). Never `Administrator` or
  `ManageMessages` — sniping needs neither.

## Project layout

```text
src/
  discord/      gateway adapters (discord.js stops here)
  events/       thin per-event handlers
  commands/     slash + context-menu modules
  interactions/ button/select router tables
  ui/           discord.js-free view models, browser state, search
                sessions → renderers/ (Components V2 builders)
  domain/       MessageSnapshot (the archive contract)
  services/     archive/media/retention orchestration
  repositories/ query ports (drizzle-backed)
  database/     connection + schema      storage/  local media
  scripts/      deploy-commands, migrate, healthcheck, load-test
tests/          unit + integration suites (+ helpers/fakes)
docs/           architecture, discord truth, decisions, roadmap, …
specs/          Spec Kit phases 000–023 (spec → plan → tasks)
```

Architecture, boundaries, and the Components V2 system:
[docs/architecture.md](docs/architecture.md) ·
[docs/components-v2.md](docs/components-v2.md) ·
[AGENTS.md](AGENTS.md) (agent operating manual).

## Scripts

| Script                                                  | Purpose                               |
| ------------------------------------------------------- | ------------------------------------- |
| `npm run dev`                                           | Watch mode (`tsx`)                    |
| `npm run build` / `npm start`                           | Compile / run compiled app            |
| `npm run typecheck` / `npm run lint` / `npm run format` | Strict TS, eslint, prettier           |
| `npm test` / `npm run test:integration`                 | Unit (vitest) / DB integration suites |
| `npm run deploy:commands`                               | Register Discord commands             |
| `npm run db:generate` / `db:migrate` / `db:push`        | Drizzle schema workflow               |
| `npm run load:test`                                     | Local throughput probe                |

## Security

This bot stores other people's messages — treat the archive as
sensitive. Read [docs/security.md](docs/security.md) before inviting
it anywhere: token hygiene (`chmod 600 .env`, umask-restricted files),
least privilege, read-time visibility enforcement, retention semantics,
and encrypted off-host backups. To report a vulnerability privately,
see [SECURITY.md](SECURITY.md).

## Contributing

Contributions welcome — start with [CONTRIBUTING.md](CONTRIBUTING.md)
(and [AGENTS.md](AGENTS.md) for the operating rules). Bug reports and
feature ideas: [open an issue](https://github.com/marrrkkk/SnipeBot/issues).
Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) — you run it, you own the data.

## Roadmap & history

Planned and shipped work lives in [docs/roadmap.md](docs/roadmap.md)
with per-phase specs under `specs/`; decisions in
[docs/decisions.md](docs/decisions.md). The previous discord.js-13
prototype is preserved on the `legacy` branch — this codebase is a
complete remake sharing only the product idea.
