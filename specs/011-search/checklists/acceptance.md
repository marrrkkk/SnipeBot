# 011 — Acceptance checklist (needs a real token + a test guild)

- [ ] `/search docker` → messages containing it, newest-ranked first
- [ ] `/search author:@user` → only their messages
- [ ] `/search has:attachment` → only messages with files
- [ ] `/search deleted:true` → only deleted; default includes both (🗑️ marked)
- [ ] `/search` (no args) → ephemeral usage hint
- [ ] Special chars (`"`, `(`, `*`) → no crash, literal match
- [ ] Restart bot → index intact, search works
