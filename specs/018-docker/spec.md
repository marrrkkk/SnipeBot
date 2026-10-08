# 018 — Docker / self-host packaging

## Goal

`docker compose up` is the boring, correct path: hardened image, data on
volumes, migrations on boot, healthchecks that catch the classic
footguns — documented end to end and validated where possible without a
daemon.

## Requirements

- Non-root runtime user; no secrets baked in (env only); `data/` + `.env`
  never in the image (`.dockerignore` verified).
- Boot runs migrations, then the bot (`migrate && exec node`), so upgrades
  can't boot against a stale schema. `drizzle/` ships in the image.
- `HEALTHCHECK` via a real check script: config loads, DB opens, core
  tables exist (catches unmigrated/missing volumes with an actionable
  message); non-zero exit otherwise. Logic unit-tested; thin CLI wrapper.
- Compose: `env_file`, `./data:/app/data` volume, restart policy, no
  ports (no HTTP surface), commented knobs.
- `deployment.md` rewritten against the actual files: VPS/Docker/direct
  paths, env table (incl. `MEDIA_MAX_BYTES`, `ARCHIVE_DMS`), backup
  (WAL-aware) + restore, upgrade, healthcheck, troubleshooting.
- Validation actually performed and recorded: what ran green, and what
  needs a daemon/human (image build, first-boot logs) marked blocked,
  not claimed.

## Constraints

- No new runtime dependencies. No registry/publishing, no reverse proxy,
  no secrets manager (documented non-goals). Strict TS, no `any`.
- Direct-Node remains first-class (Docker optional, per D15).

## Tests / completion

- Unit (`healthcheck.test.ts`): healthy DB, missing tables, missing file,
  bad env — via a pure `checkHealth(dbPath)` plus thin wrapper.
- `typecheck + lint + test + build` green; `compose config` clean if the
  CLI exists; healthcheck script runs locally against a temp DB.
- Manual/daemon-gated (blocked as applicable): `docker compose up -d`,
  first-boot logs, `/ping` + `/stats` in Discord.
