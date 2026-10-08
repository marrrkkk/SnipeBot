# 007 — Attachments/media archiving

## Goal

Attachment bytes land on local disk shortly after the message is archived,
without slowing the event hot path, surviving restarts and redeliveries.

## Requirements

- DB rows are the durable queue: any `attachments` row with null
  `local_path` is work. A poll worker (`MediaArchiver`, 10s interval)
  downloads due rows via global `fetch`, stores via `MediaStorage`, writes
  back the storage key. No handler changes — zero hot-path coupling.
- Dedupe without downloads: a new revision inherits `local_path` from the
  previous revision for unchanged attachment ids (same id = same bytes).
- Key layout: `<guild|dm>/<channel>/<message>/<attachmentId>-<safe name>`
  (`safe`: `[^a-zA-Z0-9._-]`→`_`, `..` runs collapsed, ≤100 chars).
  `local_path` stores the key (portable across baseDir moves).
- Limits: `MEDIA_MAX_BYTES` env (default 100MB); content-length pre-check
  plus post-download verification; 30s fetch timeout; sequential downloads.
- Failure handling: per-item isolation; in-memory fail counts, skipped
  after 3 within a process lifetime (restarts retry — documented).
  Permanent cases (404, oversize, null URL) never crash the worker.
- `LocalMediaStorage` traversal check becomes segment-based (a file named
  `a..png` must work; `../evil` must not).
- Retention enforcement stays in Phase 14; `MediaStorage.delete` is the hook.

## Constraints

- No new runtime dependencies (`fetch`/`Response` are stdlib).
- No migrationregen beyond this phase's needs; schema stays additive.
- Strict TS, no `any`. `setInterval` handle unref'd + `stop()` (no test hangs).

## Tests / completion

- Unit (`mediaArchiver.test.ts`, fake store/repo/fetch): download+store+
  path writeback, key shape/safety, 404→null+skip-after-3, oversize skip,
  null-URL skip, already-archived untouched.
- Integration (`media.test.ts`, real repo + real `LocalMediaStorage` +
  fake fetch): ingest → `runOnce()` → `local_path` set + bytes on disk;
  edit with same attachment id inherits path with no second download.
- `storage.test.ts`: `a..png` allowed, `../evil` rejected.
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
