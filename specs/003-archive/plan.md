# 003 — Plan

**Approach:** expand `src/database/schema.ts` → `drizzle-kit generate` →
implement `src/repositories/drizzle*.ts` → `src/services/archiveService.ts`
impl → wire `messageUpdate/messageDelete/messageDeleteBulk` handlers →
`tests/integration/archive.test.ts` on temp DB files.

**Files:** schema, connection, repositories/_, services/_, events/_,
drizzle/_, tests/integration/*. No new deps (drizzle-orm + better-sqlite3
already installed).
