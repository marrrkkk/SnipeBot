# 011 — Tasks

- [x] T1 Index: FTS DDL + triggers + conditional rebuild, ensured in
      `getDb` (existing suites stayed green = parity proof; fresh-DB
      ordering fixed with skip-if-missing + ensure-after-migrate)
- [x] T2 Repo: `searchMessages` text path (match, dedupe, rank) + filters
      (integration)
- [x] T3 Repo: filters-only browse + empty-query rejection + MATCH safety
      (integration; inclusive date bounds)
- [x] T4 Command: list render + auth + validation (unit)
- [x] T5 Registry + binding + docs (D17)
- [ ] T6 Live acceptance (checklists/acceptance.md) — needs token

Notes: `channelId` required on the query (leak-proof by construction);
drizzle builders can't express MATCH/window/rank — one contained raw-SQL
method. Cross-channel `channel:` syntax carried (needs per-channel authZ).
