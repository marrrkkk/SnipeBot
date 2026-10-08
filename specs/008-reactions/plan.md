# 008 — Plan

**Approach:** repo write first, service port second, handlers third,
render last. Intent flip is a one-liner with a pinning test.

**Files:**

- Create: `src/events/reactions.ts`, `tests/unit/reactions.test.ts`,
  `tests/unit/client.test.ts`
- Modify: `src/repositories/drizzleMessageRepository.ts`
  (+`replaceReactions`), `src/services/archiveService.ts` (+`recordReactions`),
  `src/services/stubArchiveService.ts`, `src/services/drizzleArchiveService.ts`,
  `src/discord/mappers.ts` (extract `toReactionSnapshots`),
  `src/discord/client.ts` (+intent), `src/events/index.ts`,
  `src/commands/snipe.ts` (render lines), `tests/unit/snipe.test.ts`,
  `tests/integration/archive.test.ts`, `docs/discord.md`, `docs/decisions.md`

**Interfaces:** `recordReactions(messageId, reactions, at)`; repo
`replaceReactions(messageId, reactions, at)`.
