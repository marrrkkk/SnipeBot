# 017 — Tasks

- [x] T1 Registry: counters/gauges/snapshot/reset (unit)
- [x] T2 Wiring: service ops + router + workers + connection (unit delta
      assertions + one integration)
- [x] T3 Coalescing: reaction + vote refresh collapse (unit, existing
      tests pinned to immediate)
- [x] T4 Stats command + binding + registry (unit)
- [x] T5 Load script + docs (architecture, D23, security note)
- [ ] T6 Live acceptance (checklists/acceptance.md) — needs token

Notes: `stats` success is ephemeral (operational info, like settings).
Measured profile: ~770 snapshots/s, 0.6 MB/1k msgs (dev hardware,
re-measure on target). No pacer, no queue system — evaluated, deferred
with reasons.
