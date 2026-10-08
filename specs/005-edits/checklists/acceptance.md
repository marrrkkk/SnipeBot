# 005 — Acceptance checklist (needs a real token + a test guild)

- [ ] `npm run deploy:commands` shows `edits` deployed
- [ ] Send message, edit it twice, `/edits` → embed with original + current
- [ ] `/edits index:2` after editing two messages → the older one
- [ ] Fresh channel, `/edits` → ephemeral "No edited messages here."
- [ ] Role without ViewChannel → ephemeral denial
- [ ] Restart bot → `/edits` still shows pre-restart history
