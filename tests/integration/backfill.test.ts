import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toSnapshot } from '../../src/discord/mappers.js';
import { __resetDbForTests, closeDb, getDb, type Db } from '../../src/database/connection.js';
import { ensureSearchIndex } from '../../src/database/searchIndex.js';
import { DrizzleMessageRepository } from '../../src/repositories/drizzleMessageRepository.js';
import { createDrizzleArchiveService } from '../../src/services/drizzleArchiveService.js';
import { fakeMessage } from '../unit/helpers/fakes.js';

let dir: string;
let db: Db;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'snipebot-backfill-'));
  __resetDbForTests();
  db = getDb(join(dir, 'test.db'));
  migrate(db, { migrationsFolder: './drizzle' });
  ensureSearchIndex(db);
});

afterEach(async () => {
  closeDb();
  __resetDbForTests();
  await rm(dir, { recursive: true, force: true });
});

describe('backfill import', () => {
  it('imports unknown messages and counts skips', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'live', content: 'seen live' })));

    const result = await repo.importSnapshots([
      toSnapshot(fakeMessage({ id: 'old1', content: 'history one' })),
      toSnapshot(fakeMessage({ id: 'old2', content: 'history two' })),
      toSnapshot(fakeMessage({ id: 'live', content: 'seen live' })),
    ]);

    expect(result).toEqual({ imported: 2, skipped: 1 });
    expect((await repo.findById('old1'))?.content).toBe('history one');
  });

  it('never rewrites known messages and reruns cleanly', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    const live = toSnapshot(fakeMessage({ id: 'm1', content: 'v2' }));
    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'm1', content: 'v1' })));
    await service.recordEdit(live);

    const stale = toSnapshot(fakeMessage({ id: 'm1', content: 'v1' }));
    const result = await repo.importSnapshots([stale]);

    expect(result).toEqual({ imported: 0, skipped: 1 });
    expect((await repo.findById('m1'))?.content).toBe('v2');
    await expect(repo.countRevisions('m1')).resolves.toBe(2);

    const rerun = await repo.importSnapshots([stale]);
    expect(rerun).toEqual({ imported: 0, skipped: 1 });
  });
});
