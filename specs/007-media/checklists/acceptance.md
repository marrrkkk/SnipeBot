# 007 — Acceptance checklist (needs a real token + a test guild)

- [ ] Post an image, wait ~15s, check `data/media/<guild>/<channel>/…`
      contains the file and the DB row has `local_path`
- [ ] Post `a..png`-style name → stored, no traversal, served in snipe later
- [ ] Edit the message (same attachment) → no second download, path kept
- [ ] Stop bot before first poll tick, restart → file still archived
- [ ] Oversize config (`MEDIA_MAX_BYTES=10`) → skipped with error log
