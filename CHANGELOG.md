# Changelog

All notable changes to SnipeBot. Format follows the major phases of the
`specs/` roadmap, newest first.

## [1.0.0] — 2026-10-08

First release. Self-hosted Discord message archive, recovery, and
inspection — one Node.js process, SQLite + local media, no SaaS.

### Recovery & history

- `/snipe [index]` — most recently deleted messages in-channel, plus
  `bulk:True` purge-group view (10 lines, more-count).
- `/edits [index]` — before/after per message, with Older/Newer buttons
  to walk every revision.
- Message context menu: **View Edit History**, **Search User Messages**.
- Deleted-message attribution surfaced as `possibly deleted by …`
  (best-effort audit-log correlation, never ground truth).

### Archive & search

- Persistent snapshots, append-only revisions, deletion markers —
  survives restarts; backfill imports channel history gap-free.
- `/search` — full-text (FTS5) plus author/date/attachment/poll/
  deleted filters, interaction-channel scoped.
- Attachments archived locally with voice durations, polls kept live,
  reactions refreshed, threads resolved with kind/name/parent.

### Self-hosting & safety

- Channel-scoped reads + `ViewChannel` checks; role allowlists,
  guild opt-out, DM archiving off by default (`/settings`, Manage Server).
- Retention sweeps (messages/revisions/media/orphans) with hourly runner.
- Docker Compose path (non-root, volumes, boot migrations, healthcheck)
  and direct-Node path; `/stats`, structured logs, in-process metrics.

### Notes

- Requires Node ≥ 24.17, privileged Message Content intent, and the
  permissions `ViewChannel + ReadMessageHistory + SendMessages`
  (invite bitfield `68608`; `ViewAuditLog` optional for attribution).
- See `docs/` for architecture, security model, and deployment; per-phase
  specs live under `specs/`.
