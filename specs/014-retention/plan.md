# 014 — Plan

**Approach:** repo SQL first (hardest, most testable), runner second,
settings last. No handler or read-path changes.

**Files:**

- Create: `src/services/retention.ts`, `tests/unit/retention.test.ts`,
  `tests/integration/retention.test.ts`
- Modify: `src/repositories/drizzleMessageRepository.ts`
  (+retention reads/writes, prune/expire/list methods),
  `src/storage/types.ts` (+optional `listEntries`),
  `src/storage/localStorage.ts` (+impl), `src/commands/settings.ts`
  (+3 subcommands), `src/commands/policy.ts` (+retention port methods),
  `src/index.ts` (runner start/stop), `tests/unit/settings.test.ts`,
  `tests/unit/storage.test.ts`, `docs/storage.md`, `docs/data-model.md`,
  `docs/security.md`, `docs/decisions.md`, `README.md`

**Interfaces:** `RetentionPolicy`, `RetentionStore` (runner port),
`createRetentionRunner`, `listEntries`, settings subcommands.
