# 014 — Tasks

- [x] T1 Repo: retention reads/writes/clear + prune + expiry + guild
      scopes + referenced paths (integration)
- [x] T2 Runner: per-scope phases, orphan age/ref rules, summary (unit)
- [x] T3 Storage: `listEntries` recursive walk (unit)
- [x] T4 Settings: retention-set/show/clear + validation (unit)
- [x] T5 Wiring (index start/stop) + docs (storage, data-model,
      security retention, D20, README)
- [ ] T6 Live acceptance (checklists/acceptance.md) — needs token

Notes: per-field policy merge (guild inherits global baseline);
DB-first ordering makes crashes self-healing via orphans; `retention.ts`

- `listEntries` carried over and verified this turn.
