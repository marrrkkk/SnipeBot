# 018 — Plan

**Approach:** health logic first (unit-tested, daemon-free), image files
second, docs third, validation last with honest blocked items.

**Files:**

- Create: `src/healthcheck.ts`, `src/scripts/healthcheck.ts`,
  `tests/unit/healthcheck.test.ts`
- Modify: `src/scripts/` (moved from `scripts/` so the build compiles
  CLIs with the app), `package.json` + `tsconfig.json` paths,
  `Dockerfile`, `docker-compose.yml`, `.dockerignore`,
  `docs/deployment.md`, `README.md` (if drifted),
  `docs/decisions.md`

**Interfaces:** `checkHealth(dbPath)`, boot chain, healthcheck CMD.
