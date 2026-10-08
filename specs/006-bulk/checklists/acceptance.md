# 006 — Acceptance checklist (needs a real token + a test guild)

- [ ] Delete 5 messages at once (or `/clear`-style purge), `/snipe bulk:True`
      → one list embed with all five
- [ ] Purge containing an uncached (never-seen) message → skipped silently
- [ ] Two purges a minute apart → `/snipe bulk:True index:2` shows older
- [ ] Sniped content containing `@everyone` → renders literally, no ping
- [ ] `/snipe` without flag → unchanged single behavior
