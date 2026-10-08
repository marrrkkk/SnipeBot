# 009 — Plan

**Approach:** repo row-swap first, service decision second, handlers third,
render last. Check djs `Poll.toJSON` shape in source before writing the
extractor (accuracy over guessing).

**Files:**

- Create: `src/events/pollVotes.ts`, `tests/unit/polls.test.ts`
- Modify: `src/repositories/drizzleMessageRepository.ts` (+`refreshPoll`),
  `src/services/archiveService.ts` (+`refreshPoll`),
  `src/services/stubArchiveService.ts`,
  `src/services/drizzleArchiveService.ts`, `src/discord/client.ts`,
  `src/events/index.ts`, `src/commands/snipe.ts` (poll + voice lines),
  `tests/unit/snipe.test.ts`, `tests/unit/client.test.ts`,
  `tests/integration/archive.test.ts`, `docs/discord.md`, `docs/decisions.md`

**Interfaces:** `refreshPoll(snapshot)` on the service;
`repo.refreshPoll(messageId, raw)`.
