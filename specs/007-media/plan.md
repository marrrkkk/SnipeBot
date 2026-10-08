# 007 — Plan

**Approach:** queue methods first, worker second, wiring last. Poll design
means handlers and the ingest path stay untouched.

**Files:**

- Create: `src/services/mediaArchiver.ts` (port, worker, key builder),
  `tests/unit/mediaArchiver.test.ts`, `tests/integration/media.test.ts`
- Modify: `src/repositories/drizzleMessageRepository.ts` (queue methods +
  carry-over), `src/storage/localStorage.ts` (segment traversal check),
  `src/config/env.ts` + `.env.example` (`MEDIA_MAX_BYTES`),
  `src/index.ts` (construct + start/stop), `tests/unit/storage.test.ts`,
  `docs/storage.md`

**Interfaces:**

- Produces: `MediaArchiveStore { listUnarchivedAttachments,
setAttachmentLocalPath }` (structurally satisfied by the repo),
  `createMediaArchiver({ store, storage, fetchFn?, maxBytes?,
failureLimit?, intervalMs? })` with `start/stop/runOnce`.
