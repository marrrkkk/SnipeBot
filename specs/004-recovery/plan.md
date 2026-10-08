# 004 — Plan

**Approach:** read port + command module + binding, alldims covered by
fakes; one repo read method with integration coverage.

**Files:**

- Create: `src/commands/snipe.ts` (builder, port, binding, command),
  `tests/unit/snipe.test.ts`
- Modify: `src/repositories/drizzleMessageRepository.ts`
  (+`listDeletionsForChannel`), `src/commands/index.ts` (register),
  `src/index.ts` (configure binding), `tests/integration/archive.test.ts`

**Interfaces:**

- Produces: `SnipeQueryPort { listDeletionsForChannel(channelId, limit),
findById(id) }` (structural — repository satisfies it, no `implements`
  clause crossing layers), `configureSnipeQuery`, `snipeCommand`.
- Consumes: `MessageSnapshot`, `ArchiveService`-adjacent repo, router
  (unchanged — static `commandMap` picks up the new module).

**Steps:** repo method + integration test → command + unit tests →
wire-up → deploy-body assertion → full verification.
