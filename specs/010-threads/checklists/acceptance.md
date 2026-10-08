# 010 — Acceptance checklist (needs a real token + a test guild)

- [ ] Post in a thread, delete, `/snipe` in the thread → recovered
- [ ] Archive a thread, check DB: `channels` row has kind/name/parent
- [ ] Rename channel → next message updates the shell
- [ ] Delete thread → shell gone, message rows + snipes intact
- [ ] Forum post + media channel post → archived like normal messages
