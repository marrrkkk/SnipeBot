# 016 — Acceptance checklist (needs a real token + a test guild)

- [ ] Fresh channel with history, `/backfill limit:50` → summary counts,
      `/snipe` + `/search` see the imported messages
- [ ] Re-run `/backfill` → everything skipped, no duplicates, no new revisions
- [ ] Live message then `/backfill` → live content preserved, not overwritten
- [ ] Non-admin `/backfill` → ephemeral denial
- [ ] Channel with 300+ messages, limit 250 → exactly 250 accounted
