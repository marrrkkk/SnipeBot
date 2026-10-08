# 019 — Security hardening

## Goal

Prove, don't promise: audit secrets, logs, permissions and dependencies
against the code as it stands, close the gaps found, and record the rest.

## Requirements

- Secret audit (evidence, not vibes): every `DISCORD_TOKEN` touchpoint
  enumerated (read, login, REST) with no logging anywhere on those paths;
  no token-shaped values in tests/fixtures; `.env` ignored + dockerignored;
  `.env.example` shape-only.
- Log-content audit: no `message.content`, tokens, or user PII flowing
  through logger calls (grep-recorded, manually reviewed).
- File permissions: restrictive umask (`0o077`) at entry points
  (`index.ts`, `migrate.ts`) so DB/WAL/media arrive `600`/`700`;
  unit-tested wrapper + documented operator duty for pre-existing files.
- Permission review: exact minimal invite set documented (bitfield
  computed, not guessed); code requests nothing beyond it; `ManageGuild`
  is caller-side only (re-verified, not re-implemented).
- `npm audit`: triaged on the record; compatible fixes applied with a
  full suite re-run; anything deferred named with reasons.
- Token rotation + abuse-surface notes land in docs (rotation steps,
  no-cooldowns evaluation, ReDoS/regex pass).
- `package-lock.json` present and used by all install paths
  (reproducible builds are a security property).

## Constraints

- No new intents/permissions/dependencies/tables. Strict TS, no `any`.
- No behavior change to archiving or authZ; hardening only.
- Fixes must not churn the lockfile recklessly (minor/patch only,
  suite must stay green).

## Tests / completion

- Unit: umask wrapper applies/restores; (audits are evidence + review,
  recorded in spec, not executable tests — except where they mandate code).
- `typecheck + lint + test + build` green after any audit-driven change.
- Manual (blocked without token/daemon as marked): checklist.
