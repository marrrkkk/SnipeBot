# 007 — Tasks

- [x] T1 Repo: `listUnarchivedAttachments` + `setAttachmentLocalPath` +
      revision carry-over of `local_path` (integration)
- [x] T2 Worker: download→store→writeback, key shape/safety (unit)
- [x] T3 Worker: 404/oversize/null-URL handling + skip-after-3 (unit)
- [x] T4 Integration: real store+repo, bytes on disk, carry-over with no
      second download
- [x] T5 Storage: segment-based traversal check (`a..png` ok, `../evil` no)
- [x] T6 Wiring: env, index start/stop, docs
- [ ] T7 Live acceptance (checklists/acceptance.md) — needs token

Notes: drizzle sync builders are lazy — writes need `.run()`, reads
`.get()`/`.all()` (established in 003). Poll design = zero handler
changes. In-memory failure counts (restarts retry). Boot does not
auto-migrate (unchanged). Retention enforcement stays in Phase 14.
