# 002 — Plan

**Approach:** new `src/discord/mappers.ts` + `tests/unit/mappers.test.ts`
with JSON fixtures mirroring the Discord message resource. Wire into
`src/events/messageCreate.ts` against the `ArchiveService` interface
(stub impl logs + ok until Phase 3).

**Files:** create mapper + fixtures; modify `messageCreate.ts`; add
`tests/unit/mappers.test.ts`. No new deps (fixtures inline or JSON).
