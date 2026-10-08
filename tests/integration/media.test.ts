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
import { createMediaArchiver } from '../../src/services/mediaArchiver.js';
import { LocalMediaStorage } from '../../src/storage/localStorage.js';
import { fakeMessage } from '../unit/helpers/fakes.js';

let dir: string;
let db: Db;
let fetchCalls = 0;

function fakeFetch(_url: string | URL | Request): Promise<Response> {
  fetchCalls += 1;
  return Promise.resolve(new Response(new Uint8Array([7, 7, 7])));
}

function attachment(id: string, name: string, url: string): Record<string, unknown> {
  return {
    id,
    name,
    contentType: 'image/png',
    size: 3,
    url,
    proxyURL: url,
    height: null,
    width: null,
    duration: null,
    waveform: null,
  };
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'snipebot-media-'));
  __resetDbForTests();
  db = getDb(join(dir, 'test.db'));
  migrate(db, { migrationsFolder: './drizzle' });
  ensureSearchIndex(db);
  fetchCalls = 0;
});

afterEach(async () => {
  closeDb();
  __resetDbForTests();
  await rm(dir, { recursive: true, force: true });
});

describe('media archiving', () => {
  it('downloads bytes to disk and records the storage key', async () => {
    const repo = new DrizzleMessageRepository(db);
    const service = createDrizzleArchiveService(db);
    const storage = new LocalMediaStorage(join(dir, 'media'));
    const archiver = createMediaArchiver({ store: repo, storage, fetchFn: fakeFetch });

    await service.ingestMessage(
      toSnapshot(
        fakeMessage({
          id: 'm1',
          content: 'pic',
          attachments: [attachment('a1', 'pic.png', 'https://cdn/x/pic.png')],
        }),
      ),
    );
    expect(await repo.listUnarchivedAttachments(10)).toHaveLength(1);

    const summary = await archiver.runOnce();

    expect(summary).toEqual({ checked: 1, archived: 1, failed: 0 });
    expect(await repo.listUnarchivedAttachments(10)).toHaveLength(0);
    const found = await repo.findById('m1');
    const key = found?.attachments[0]?.localPath;
    expect(typeof key).toBe('string');
    if (key !== undefined && typeof key === 'string') {
      expect(await storage.exists(key)).toBe(true);
      expect(await storage.get(key)).toEqual(new Uint8Array([7, 7, 7]));
    }
  });

  it('inherits the path for unchanged attachments without redownloading', async () => {
    const repo = new DrizzleMessageRepository(db);
    const service = createDrizzleArchiveService(db);
    const storage = new LocalMediaStorage(join(dir, 'media'));
    const archiver = createMediaArchiver({ store: repo, storage, fetchFn: fakeFetch });
    const attached = attachment('a1', 'pic.png', 'https://cdn/x/pic.png');

    await service.ingestMessage(
      toSnapshot(fakeMessage({ id: 'm1', content: 'v1', attachments: [attached] })),
    );
    await archiver.runOnce();
    expect(fetchCalls).toBe(1);

    await service.recordEdit(
      toSnapshot(
        fakeMessage({
          id: 'm1',
          content: 'v2',
          editedAt: new Date('2026-02-01T00:00:00.000Z'),
          attachments: [attached],
        }),
      ),
    );

    const found = await repo.findById('m1');
    expect(found?.content).toBe('v2');
    expect(found?.attachments[0]?.localPath).not.toBeNull();
    expect(fetchCalls).toBe(1);
    await expect(repo.listUnarchivedAttachments(10)).resolves.toHaveLength(0);
  });
});
