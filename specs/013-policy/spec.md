# 013 — Permissions and authorization model

## Goal

Server admins control WHO may use recovery commands and WHAT gets
archived — closing the loop opened by `docs/security.md`.

## Requirements

- `guild_settings(guild_id PK, snipe_role_ids JSON, archiving_enabled
0/1 default 1, updated_at)`: first real migration (`0001`, generated
  from diff). Absent row = defaults (open roles, archiving on).
- Role gate: non-empty allowlist ⇒ caller needs ≥1 listed role
  (live member roles, defensively narrowed for both manager and raw
  shapes); null member + non-empty list ⇒ deny. Empty list ⇒ open.
  Uniform denial text. Applied to snipe/edits/search, both context
  commands, and revision buttons.
- Binding absent (tests/dev) ⇒ gate skipped (documented dev/test
  passthrough; prod always wires it in `index.ts`).
- DM archiving: default OFF (privacy by design — constitution wins);
  `ARCHIVE_DMS=true` env opts in (explicit `'true'` compare, never
  boolean coercion). Enforced in `saveSnapshot` (covers ingest/edit/
  vote-baseline uniformly); skips log at debug and return ok.
- Guild opt-out: `archiving_enabled = 0` skips `saveSnapshot` the same
  way. Deletion markers stay ungated (inert without content).
- Corrupt policy JSON ⇒ throw (fail closed + loud via router catch),
  covered by test.
- `/settings` (ManageGuild-gated, guild-only):
  `snipe-roles add|remove|list|clear` (+role option) and
  `archiving <enabled bool>`. Ephemeral everything.
- AuthZ reads never invent data: no write-through on read.

## Constraints

- No new intents/permissions (ManageGuild is standard)/dependencies.
  One migration. Strict TS, no `any`.
- Interface additions ripple to test fakes — accept.

## Tests / completion

- Integration: policy roundtrip, absent-row defaults, corrupt throws,
  DM skipped by default / kept when opted in, guild-disabled skips,
  guild default archives.
- Unit: gate matrix (open/allow/deny/DM/null-port/null-member),
  settings flows (non-admin, add/remove/list/clear, archiving toggle),
  per-surface denial (one test each incl. buttons).
- `typecheck + lint + test + build` green.
- Manual (blocked without token): checklists/acceptance.md.
