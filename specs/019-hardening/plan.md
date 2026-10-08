# 019 — Plan

**Approach:** audit first (read-only, evidence into the spec), then the
small code changes audits justify, then docs. No feature work.

**Files:**

- Create: `src/security/files.ts`, `tests/unit/files.test.ts`
  (maybe — see below)
- Modify (only if audits justify): `src/index.ts`,
  `src/scripts/migrate.ts`, `docs/security.md`, `docs/deployment.md`,
  `docs/decisions.md`, `docs/discord.md`, `package.json`/`package-lock.json`
  (audit fixes only)

**Interfaces:** none new (umask wrapper is internal + tested).
