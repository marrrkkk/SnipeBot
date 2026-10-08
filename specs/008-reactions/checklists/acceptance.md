# 008 — Acceptance checklist (needs a real token + a test guild)

- [ ] React to a message, delete it, `/snipe` → reactions line present
- [ ] React, remove the reaction, delete, `/snipe` → line gone/updated
- [ ] Remove-all then delete → no reactions line
- [ ] Rich embed message deleted → `/snipe` shows embed title/count
- [ ] Restart bot → reaction refresh still works (intent enabled)
