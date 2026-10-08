# SnipeBot

Self-hosted Discord message archive, history, recovery, and inspection
system — whose primary UX is message sniping. You run the bot, you own
the data: SQLite + local media dir, no SaaS, no multi-tenant backend.

> Status: **v1.0.0 released** — full archive, recovery, search, and
> self-host packaging, all green. Carried future work is tracked in
> [specs/020-release/triage.md](specs/020-release/triage.md); interactive
> checklists needing a human in Discord/Docker live per-phase.

Historical note: a JS/discord.js-13 prototype existed at
`github.com/marrrkkk/SnipeBot` (in-memory, ≤20 msgs). This is a complete
remake — nothing is ported except the product idea.

## What it does

- Recovers deleted messages, bulk deletions, and edit history
  (per-channel, auth-checked): `/snipe`, `/edits` (+buttons), message
  context menu, best-effort deletion attribution
- Persistent local archive with retention policies (survives restarts)
- Full-text `/search` with filters; rich inspection (attachments,
  embeds, reactions, polls, voice durations, threads); `/backfill`
- `/settings` (roles, archiving, retention) and `/stats`, all
  least-privilege by design

## Requirements

- Node.js ≥ 24.17.0, npm
- A Discord application + bot token (Portal: https://discord.com/developers/applications)
- Privileged intent **Message Content** enabled (Bot page)

## Quick start

```sh
cp .env.example .env   # set DISCORD_TOKEN, DISCORD_CLIENT_ID
npm install
npm run deploy:commands
npm run dev
```

Docker: `docker compose up -d --build` (see [docs/deployment.md](docs/deployment.md)).

## Required intents / permissions

- Intents: `Guilds`, `GuildMessages`, `MessageContent` (privileged),
  `GuildMessageReactions`, `GuildMessagePolls`.
  Why: see [docs/discord.md](docs/discord.md).
- Permissions: `ViewChannel` + `ReadMessageHistory` (observe),
  `SendMessages` (reply). Optional `ViewAuditLog`. Never `Administrator`.

## Configuration

- Env (`cp .env.example .env`): `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`,
  `DATABASE_PATH`, `MEDIA_STORAGE_PATH`, `MEDIA_MAX_BYTES`,
  `ARCHIVE_DMS` (exactly `'true'` to archive DMs; default off).
- `/settings` (Manage Server only): `snipe-roles add|remove|list|clear`
  to restrict recovery commands, `archiving` to opt the server out,
  `retention-set|retention-show|retention-clear` for expiry windows
  (default: keep everything). Details: [docs/security.md](docs/security.md).

## Project layout

`src/` (discord → services → domain → repositories → database/storage,
including `src/scripts/` CLIs), `tests/`, `docs/`, `specs/`, `.specify/`. Details:
[docs/architecture.md](docs/architecture.md), [AGENTS.md](AGENTS.md).

## Scripts

`dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`,
`test:integration`, `deploy:commands`, `db:generate`, `db:migrate`,
`load:test`.

## Security

Self-hosted archive of others' messages — read [docs/security.md](docs/security.md)
before inviting the bot anywhere: token hygiene, least privilege, and the
rule that snipe/search never cross channel visibility.

## Roadmap

Phases 1–20 in [docs/roadmap.md](docs/roadmap.md); per-phase specs in `specs/`.
