# 015 — Plan

**Approach:** matcher first (pure fetch+match, fake guilds), repo second,
handler flow third, display last. No read-path changes beyond one footer.

**Files:**

- Create: `src/discord/auditLog.ts`, `tests/unit/auditLog.test.ts`
- Modify: `src/repositories/drizzleMessageRepository.ts`
  (+`annotateDeletionEvents`, executor in `getDeletion`/`ChannelDeletion`),
  `src/services/archiveService.ts` (+`annotateDeletion`),
  `src/services/stubArchiveService.ts`, `src/services/drizzleArchiveService.ts`,
  `src/events/messageDelete.ts` (attribution flow + retry opt),
  `src/commands/snipe.ts` (footer), `tests/unit/messageEvents.test.ts`,
  `tests/unit/snipe.test.ts`, `tests/integration/archive.test.ts`,
  `docs/discord.md`, `docs/decisions.md`, `docs/research.md`

**Interfaces:** `DeleteAttribution`, `annotateDeletion`,
`getDeletion` gains `executorId`.
