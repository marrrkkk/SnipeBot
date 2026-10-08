# Development

## Prereqs

- Node.js ≥ 24.17.0 (`node -v`; project uses discord.js 14.27.0)
- npm (pinned via `package-lock.json` after first install)

## Setup

```sh
cp .env.example .env   # fill DISCORD_TOKEN (+ CLIENT_ID for deploys)
npm install
npm run db:migrate     # once drizzle/ has migrations (Phase 3+)
npm run deploy:commands
npm run dev
```

`DISCORD_GUILD_ID` set → instant guild-command deploy; empty → global
(up to 1h propagation).

## Scripts

| Script                                     | What                                   |
| ------------------------------------------ | -------------------------------------- |
| `dev`                                      | tsx watch                              |
| `build` / `start`                          | tsc → dist → node                      |
| `typecheck` / `lint` / `format(:check)`    | tsc --noEmit / eslint / prettier       |
| `test` / `test:watch` / `test:integration` | vitest unit / watch / integration      |
| `deploy:commands`                          | register slash commands via REST       |
| `db:generate` / `db:migrate` / `db:push`   | drizzle-kit workflow (push = dev only) |

## Troubleshooting

- `DisallowedIntents` / 4014 on connect → enable the privileged
  `Message Content` toggle in the Developer Portal Bot page (and request
  approval past the 10k-user threshold).
- Empty `content`/`attachments` on received messages → same cause.
- Guild commands not appearing → re-run `deploy:commands` with
  `DISCORD_GUILD_ID`; global commands take up to an hour.
- `better-sqlite3` build failure → ensure Python3 + build tools;
  Node 24 supported. Docker image builds from `node:24-bookworm-slim`.
- `data/` locked/WAL leftovers → stop the bot before copying the DB.
