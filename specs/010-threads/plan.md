# 010 — Plan

**Approach:** domain + resolver first, repo ports second, handlers last.
Every step keeps existing suites green (mapper/handler params optional).

**Files:**

- Create: `src/discord/threads.ts`, `src/events/threadEvents.ts`,
  `tests/unit/threads.test.ts`, `tests/unit/threadEvents.test.ts`
- Modify: `src/domain/messageSnapshot.ts` (+`ChannelSnapshot`, field),
  `src/discord/mappers.ts` (override param + channel build),
  `src/repositories/drizzleMessageRepository.ts` (shell upsert from
  snapshot, `deleteChannel`), `src/services/archiveService.ts`
  (+`recordChannel`, `+removeChannel`), `src/services/stubArchiveService.ts`,
  `src/services/drizzleArchiveService.ts`, `src/events/messageCreate.ts`,
  `src/events/messageUpdate.ts`, `src/events/index.ts`,
  `tests/unit/mappers.test.ts`, `tests/unit/messageCreate.test.ts`,
  `tests/unit/messageEvents.test.ts`, `tests/integration/archive.test.ts`,
  all `ArchiveService` test fakes, `docs/data-model.md`, `docs/decisions.md`

**Interfaces:** `ThreadResolver { resolve }`, `ThreadResolution`,
`recordChannel(info)` / `removeChannel(id)`, `repo.deleteChannel(id)`.
