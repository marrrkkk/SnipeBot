# 014 — Retention and storage management

## Goal

The archive stops growing forever by operator choice: expiring old rows,
pruning revisions, reclaiming media bytes, and reporting size — with
defaults that keep everything until configured otherwise.

## Requirements

- `retention_policies` (exists since bootstrap; first used now):
  `scope` = `'global'` or guild id; nullable `keep_days`,
  `keep_revisions`, `media_keep_days`. Absent = keep everything
  (data-loss-by-default would betray the recovery product).
- Effective policy per guild scope (incl. DM/null scope): guild row ?? global row ?? keep-everything. `listActiveGuildIds` drives the sweep.
- Revision prune: keep newest N per message (window function); children
  of pruned revs deleted via anti-join (never orphans); reactions
  untouched (point-in-time per message); forward rows collapse to latest
  per message only while pruning.
- Message expiry: `created_at` older than N days → events purged, message
  rows deleted (cascades take children), files unlinked after row delete
  (crash → orphans, which the orphan sweep heals: DB-first ordering).
- Media expiry: same age basis; rows kept, `local_path` nulled, files
  unlinked only when unreferenced by any surviving row.
- Orphan sweep: storage keys without DB refs and older than 1h are
  deleted (in-flight-download grace). Requires `listEntries` (optional
  port method; skipped with a debug log when absent).
- `RetentionRunner` (poll design, 1h default): per-scope phases in order
  revisions → messages → media, then one global orphan pass; summary
  counts; start/stop/runOnce; per-item isolation.
- `/settings retention-set|retention-show|retention-clear`
  (ManageGuild, guild-only, ephemeral): set merges provided fields over
  stored (all-omitted → usage hint, no write); clear nulls retention
  columns only (roles/archiving untouched); show prints effective state.
- Separate `RetentionPolicy` type + port methods (no churn to the
  `GuildPolicy` paths).

## Constraints

- No new intents/permissions/dependencies/tables (policies table
  predates this phase). Strict TS, no `any`. Timer unref'd.
- Keys embed messageId, so message-expiry files are never shared;
  revision-prune files are reference-checked before unlink.

## Tests / completion

- Integration (`retention.test.ts`): prune keeps N + children follow +
  reactions intact; expiry cascades + events gone + file list returned;
  media expiry nulls paths; roundtrip + clear.
- Unit: runner per-scope phases, orphan age/ref rules, summary;
  settings flows (non-admin, set/show/clear, all-omitted).
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
