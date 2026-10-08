# 020 — Tasks

- [x] T1 Harvest: grep backlog markers across src/specs/docs
- [x] T2 Triage: FIXED/CARRIED/DROPPED with reasons in triage.md
- [x] T3 Audit refresh + safe fixes + re-run
- [x] T4 Docs cross-check (README, roadmap, ANALYSIS, AGENTS currency)
- [x] T5 Live verification (login/deploy/migrate/healthcheck/boot)
- [ ] T6 Release cut — human step (no VCS exists; commands below, not run)

Release cut (run by the human — not improvised by the agent):

```sh
git init && git add -A && git commit -m "SnipeBot v1.0.0"
git tag -a v1.0.0 -m "SnipeBot v1.0.0"
```

Only then: attach a remote and push at will. The tree is release-ready
as it stands (gate green, CHANGELOG written, version set).
