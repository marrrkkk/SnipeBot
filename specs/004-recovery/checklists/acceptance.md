# 004 — Acceptance checklist (needs a real token + a test guild)

- [ ] `.env` set, `npm run deploy:commands` shows `snipe` deployed
- [ ] Send message, delete it, `/snipe` → public embed with its content
- [ ] Delete 3 messages, `/snipe index:2` → the second one
- [ ] Fresh channel, `/snipe` → ephemeral "nothing to snipe"
- [ ] Role without ViewChannel on channel → ephemeral denial
- [ ] Restart bot → `/snipe` still recovers pre-restart deletions
