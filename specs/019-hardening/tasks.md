# 019 — Tasks

- [x] T1 Secrets: token touchpoints enumerated + logging paths clean
- [x] T2 Logs: content/token/PII grep review, findings recorded
- [x] T3 Files: umask wrapper + wiring + test; ignore-files re-verified
- [x] T4 Permissions: invite set documented; no-excess grep evidence
- [x] T5 Deps: `npm audit` triage + safe fixes + full re-run
- [x] T6 Docs: rotation, abuse notes, D25
- [ ] T7 Live acceptance (checklists/acceptance.md) — needs token+daemon

Notes: evidence in `audit.md`. drizzle-orm HIGH fixed (`0.45.4`,
green); dev-only chains deferred with reasons. Stray duplicate
`main()` in migrate script removed. Stale-LSP diagnostics ignored
throughout (tsc is truth).
