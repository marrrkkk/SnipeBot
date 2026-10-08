# Deployment

SnipeBot is one process + one SQLite file + one media dir. No ports: it
only makes outbound connections (gateway, CDN).

## Environment

| Variable             | Required    | Default              | Notes                                                   |
| -------------------- | ----------- | -------------------- | ------------------------------------------------------- |
| `DISCORD_TOKEN`      | yes         | —                    | Bot token. Never bake into images.                      |
| `DISCORD_CLIENT_ID`  | for deploys | —                    | Application ID for `deploy:commands`.                   |
| `DISCORD_GUILD_ID`   | no          | —                    | Set: instant guild command deploy. Empty: global (≤1h). |
| `DATABASE_PATH`      | no          | `./data/snipebot.db` | In containers this is `/app/data/snipebot.db`.          |
| `MEDIA_STORAGE_PATH` | no          | `./data/media`       | Local attachment archive.                               |
| `MEDIA_MAX_BYTES`    | no          | `100000000`          | Largest single attachment archived.                     |
| `ARCHIVE_DMS`        | no          | `false`              | Exactly `'true'` enables DM archiving.                  |
| `NODE_ENV`           | no          | `development`        | Set `production` in containers (the image does).        |
| `LOG_LEVEL`          | no          | `info`               | `debug` for troubleshooting.                            |

`chmod 600 .env` — it holds the token.

## Docker Compose (recommended)

```sh
cp .env.example .env  # fill secrets
docker compose up -d --build
docker compose logs -f snipebot
```

What you get: non-root runtime user, `./data:/app/data` volume,
migrations applied automatically on every boot (safe to re-run),
and a healthcheck (`node dist/scripts/healthcheck.js` every 30s) that
fails loudly on missing volumes or unmigrated databases.

Upgrades: `docker compose up -d --build` again — migrations re-apply
harmlessly, data persists in the volume. Back up `data/` first anyway.

Troubleshooting:

- `permission denied` writing to `/app/data` → the host `./data` dir is
  owned by another uid. `chown` it to the container user (uid 1000 by
  default with `node:24` images) or set the dir's ownership to match.
- `unhealthy: database missing tables` → the volume is empty or new;
  the boot migration should have fixed it — check `docker compose logs`
  for migrate errors, then run `docker compose run --rm snipebot node
dist/scripts/migrate.js` manually.
- `unhealthy: cannot open database` → volume not mounted or path wrong;
  check `DATABASE_PATH` against the mount.

## Direct (Node)

```sh
npm ci
cp .env.example .env  # fill secrets, chmod 600 .env
npm run build
npm run db:migrate
npm run deploy:commands
node dist/index.js    # or a systemd unit with Restart=always
```

Keep `data/` (SQLite + media) on persistent disk. Unlike Docker, nothing
migrates automatically — run `db:migrate` after every upgrade.

## Backup / restore

```sh
# Online-safe-ish: checkpoint WAL first via sqlite3, or stop the bot.
sqlite3 data/snipebot.db 'PRAGMA wal_checkpoint(TRUNCATE);'
tar -czf snipebot-backup.tgz data/
```

Back up `*.db*` (all three WAL sidecars) plus the media dir together —
a DB without its media leaves `localPath` rows dangling. Restore: stop
the bot, extract over `data/`, start. Keep backups encrypted off-host.

Verify a backup copy without touching live data (the script reads
`DATABASE_PATH`, so override it per-invocation — never edit `.env`
for a check):

```sh
DATABASE_PATH=/tmp/restore-check/snipebot.db npx tsx src/scripts/healthcheck.ts
```
