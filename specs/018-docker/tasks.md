# 018 — Tasks

- [x] T1 Healthcheck: config/DB/tables checks (unit: healthy, missing
      tables, missing file)
- [x] T2 Image: non-root, volumes, boot migrate, HEALTHCHECK, ignore files
- [x] T3 Compose: env/volume/restart/comments, no ports
- [x] T4 Docs: deployment rewrite + D24
- [x] T5 Validation: full gate, healthcheck script live (tsx + dist),
      compose YAML parses; image build + first boot need a daemon (blocked)
- [ ] T6 Live acceptance (checklists/acceptance.md) — needs token+daemon

Notes: `src/scripts/` move keeps one `tsc` program (no layout churn);
healthcheck ran green against the real migrated DB.
