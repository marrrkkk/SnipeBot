# 013 — Plan

**Approach:** store → gates → helper/binding → admin surface → enforce
everywhere. Each layer tested before the next consumes it.

**Files:**

- Create: `src/commands/policy.ts`, `src/commands/settings.ts`,
  `tests/unit/policy.test.ts`, `tests/unit/settings.test.ts`
- Modify: `src/database/schema.ts` (+`guild_settings`, regenerate →
  `drizzle/0001`), `src/repositories/drizzleMessageRepository.ts`
  (+`getGuildPolicy`, `+saveGuildPolicy`), `src/services/drizzleArchiveService.ts`
  (gates + `{ archiveDMs }` option), `src/config/env.ts` + `.env.example`
  (`ARCHIVE_DMS`), `src/commands/snipe.ts`, `src/commands/edits.ts`,
  `src/commands/search.ts`, `src/commands/contextMenu.ts` (gate calls),
  `src/commands/index.ts`, `src/index.ts` (bindings + service opts),
  all `ArchiveService` test fakes (2 new methods — none; ports are new,
  fakes only gain where they implement full service),
  `tests/integration/archive.test.ts`, `docs/security.md`,
  `docs/data-model.md`, `docs/decisions.md`, `README.md`

**Interfaces:** `GuildPolicy { snipeRoleIds }`,
`PolicyPort { getPolicy, savePolicy }`,
`checkCommandAccess`, `configurePolicyQuery`, `settingsCommand`.
