# 011 — Plan

**Approach:** index infra first (existing suites prove parity), then the
query method, then the command. Raw SQL isolated to one method.

**Files:**

- Create: `src/database/searchIndex.ts`, `src/commands/search.ts`,
  `tests/unit/search.test.ts`, `tests/integration/search.test.ts`
- Modify: `src/database/connection.ts` (ensure on open),
  `scripts/migrate.ts` (same path), `src/repositories/drizzleMessageRepository.ts`
  (+`searchMessages`, port types), `src/services/*` (nothing — reads need
  no service; command queries the port directly like snipe/edits),
  `src/commands/index.ts`, `src/index.ts` (binding),
  `tests/unit/commands.test.ts`, `tests/unit/deployment.test.ts`,
  `docs/storage.md`, `docs/data-model.md`, `docs/decisions.md`

**Interfaces:** `SearchQuery`, `SearchHit`,
`MessageSearchPort { searchMessages }`, `configureSearchQuery`.
