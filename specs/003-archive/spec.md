# 003 — Persistent archive (SQLite/Drizzle)

## Goal

Snapshots survive restarts: full schema, migrations, repositories, revision
append, deletion markers.

## Requirements

- Schema per docs/data-model.md (guilds, channels, users, messages,
  message_revisions, attachments, embeds, reactions, polls,
  forward_snapshots, deletion_events, retention_policies) + indexes.
- `drizzle/` migration generated + `db:migrate` applies cleanly on empty
  and existing DB.
- Repositories implement `MessageRepository` (+ revision/deletion ports);
  `ArchiveService` implemented against them with transactions.
- `messageUpdate` → new revision; `messageDelete`/`Bulk` → markers even for
  never-seen ids. WAL pragmas; integration tests with temp-file DB.

## Constraints

- No `db:push` on populated installs; migrations reviewable SQL.
- No new infra (still single SQLite file).

## Tests / completion

- Integration: ingest → edit ×2 → delete → rows assert (3 revisions + marker).
- Bulk: N markers in one transaction. Restart: reopen DB, data intact.
