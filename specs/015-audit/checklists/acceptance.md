# 015 — Acceptance checklist (needs a real token + a test guild)

- [ ] Mod deletes a message, `/snipe` → footer names the mod as possible deleter
- [ ] Self-deleted message → footer names the author (or absent, honestly)
- [ ] Bot without View Audit Log → snipe works, no footer, no errors
- [ ] Bulk purge → no attribution claimed anywhere
- [ ] Restart bot → attribution of new deletes still works
