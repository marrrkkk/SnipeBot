# 016 — Tasks

- [x] T1 Fetch: paged walk to exhaustion + empty + failure (unit)
- [x] T2 Repo: gap-fill batch with counts + known-untouched + idempotent
      rerun (integration)
- [x] T3 Command: summary/limits/slicing/skips/denials/partials (unit)
- [x] T4 Registry + binding + docs (D22)
- [ ] T5 Live acceptance (checklists/acceptance.md) — needs token

Notes: always-fetch channel (one call vs paging loop — uniformity over
micro-saving); BigInt snowflake min (width-safe); mapper failures count
as skipped; vote-baseline gate already covers DM/opt-out for imported
rows only where snapshots carry guild context (backfilled rows carry the
observed channel/guild like live ones).
