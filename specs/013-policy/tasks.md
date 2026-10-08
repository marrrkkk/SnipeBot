# 013 — Tasks

- [x] T1 Repo: `guild_settings` table + migration + get/save + corrupt
      throws (integration)
- [x] T2 Service: DM-off default / opt-in / guild-disabled / guild-default
      (integration)
- [x] T3 Policy: gate matrix incl. null-port + null-member (unit)
- [x] T4 Settings: non-admin, add/remove/list/clear, archiving toggle (unit)
- [x] T5 Enforcement: snipe/edits/search/context×2/buttons denied paths (unit)
- [x] T6 Registry/env/docs (D19, security model, README)
- [ ] T7 Live acceptance (checklists/acceptance.md) — needs token

Notes: `getGuildPolicy` renamed to `getPolicy` to match the port.
DM default OFF is a product decision (constitution privacy-by-design);
`ARCHIVE_DMS` uses exact-string compare, never coercion. Deletion
markers intentionally ungated (inert). Also fixed stale README intents.
