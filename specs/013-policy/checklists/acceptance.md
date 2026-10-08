# 013 — Acceptance checklist (needs a real token + a test guild)

- [ ] `/settings snipe-roles add @Mods` → only Mods can `/snipe` now
- [ ] Non-mod `/snipe` → ephemeral role denial, nothing logged as error
- [ ] `/settings snipe-roles clear` → everyone with ViewChannel again
- [ ] `/settings archiving enabled:False` → new messages not archived
      (re-enable after!)
- [ ] `ARCHIVE_DMS=true` + DM delete → sniped; default false → nothing
- [ ] Non-admin `/settings` → ephemeral denial
