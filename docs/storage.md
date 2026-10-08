# Storage

## SQLite (durable archive)

- Driver: `drizzle-orm/better-sqlite3` (sync, zero-config, self-host ideal).
- File: `DATABASE_PATH` (default `./data/snipebot.db`).
- Pragmas on open (`src/database/connection.ts`): `WAL`, `busy_timeout=5000`,
  `synchronous=NORMAL`, `foreign_keys=ON`.
- Migrations: `drizzle-kit generate` → `drizzle/` → `npm run db:migrate`.
  Never `db:push` against a populated install (dev only).
- Backfill/pagination: history import pages `before` in 100s (API max);
  respect 429s with backoff (Phase 16).
- Full-text search: SQLite FTS5 external-content table over revisions
  (Phase 11) — no Elasticsearch/Postgres for a single-process target.

## Full-text search (Phase 11)

- `message_fts` (FTS5, external content on `message_revisions`) with
  insert/delete/update triggers; DDL lives in `src/database/searchIndex.ts`
  (virtual tables escape drizzle's schema builder) and runs idempotently
  on every open plus after migrations, with a one-time rebuild when empty.
- Query terms are double-quoted with prefix (`"term"*`); user
  metacharacters are escaped, never interpreted.

## Media (attachments)

- Interface: `MediaStorage` (`src/storage/types.ts`: put/get/exists/delete).
- Bootstrap impl: `LocalMediaStorage` (fs under `MEDIA_STORAGE_PATH`).
- Keys: `<guild|dm>/<channel>/<message>/<attachmentId>-<filename>` —
  never trust remote filenames for paths.
- Never persist hotlinked CDN URLs as the archive; `url` is metadata.
- Downloads are async/off the event hot path (Phase 7 worker queue) with
  per-download try/catch; unchanged attachment ids inherit paths across
  revisions (content-hash dedupe is a possible later optimization).
- Future: S3/R2/MinIO class behind the same interface. No cloud in v1.

## Media worker (Phase 7)

- The `attachments` table is the durable queue: null `local_path` = work.
  `MediaArchiver` (`src/services/mediaArchiver.ts`) polls every 10s,
  downloads sequentially via stdlib `fetch` (30s timeout), stores the
  bytes, writes back the storage key. Event handlers never wait for it.
- New revisions inherit `local_path` for unchanged attachment ids, so
  edits don't redownload (same id = same bytes).
- Limits: `MEDIA_MAX_BYTES` (default 100MB, content-length pre-check plus
  post-download verification). Failures are per-item isolated with
  in-memory retry counts (skipped after 3 per process lifetime; restarts
  retry — documented, not tracked in the DB).
- Filenames sanitized (`[^a-zA-Z0-9._-]`→`_`, `..` runs collapsed);
  traversal is rejected per path segment.

## Retention sweeps (Phase 14)

- `RetentionRunner` (`src/services/retention.ts`, hourly): per-scope
  phases revisions → messages → media, then one global orphan pass.
  Effective policy per scope: guild row, else global row, else keep
  everything (per-field merge). DB deletes land before file unlinks (a
  crash between them leaves orphans the next pass heals).
- Message expiry deletes rows (cascades take children) plus their
  deletion events; revision prune keeps newest N with children following
  via anti-joins (reactions untouched); media expiry nulls `local_path`
  and unlinks only unreferenced files.
- Orphan sweep deletes storage keys with no DB reference older than 1h
  (in-flight-download grace); skipped when storage can't list.

## Backup

Copy `*.db` + `-wal`/`-shm` (or checkpoint first) and the media dir.
See [deployment.md](deployment.md).
