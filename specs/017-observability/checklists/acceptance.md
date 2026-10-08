# 017 — Acceptance checklist (needs a real token + a test guild)

- [ ] `/stats` → counts that move after sending/deleting messages
- [ ] Emoji-storm a message (10+ reactions fast) → single refresh in logs
- [ ] Kill network briefly → disconnect/reconnect lines, clean resume
- [ ] `npm run load:test 20000` → prints throughput, temp DB cleaned up
- [ ] Restart bot → counters reset (documented ephemeral), archive intact
