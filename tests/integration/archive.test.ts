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
import { resetMetrics, snapshotMetrics } from '../../src/observability/metrics.js';
import { fakeMessage } from '../unit/helpers/fakes.js';

let dir: string;
let dbPath: string;
let db: Db;

function openDb(): void {
  __resetDbForTests();
  db = getDb(dbPath);
  migrate(db, { migrationsFolder: './drizzle' });
  ensureSearchIndex(db);
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'snipebot-archive-'));
  dbPath = join(dir, 'test.db');
  openDb();
});

afterEach(async () => {
  closeDb();
  __resetDbForTests();
  await rm(dir, { recursive: true, force: true });
});

describe('archive persistence', () => {
  it('ingests a snapshot and reassembles it via findById', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    const snap = toSnapshot(
      fakeMessage({
        id: 'm1',
        content: 'hello',
        embeds: [{ toJSON: () => ({ title: 'E' }) }],
      }),
    );

    await expect(service.ingestMessage(snap)).resolves.toEqual({ ok: true });

    const found = await repo.findById('m1');
    expect(found?.content).toBe('hello');
    expect(found?.author.username).toBe('alice');
    expect(found?.embeds).toEqual([{ raw: { title: 'E' } }]);
    expect(found?.snapshotOfForwarded).toBeNull();
    await expect(repo.countRevisions('m1')).resolves.toBe(1);
  });

  it('dedupes identical re-ingests to a single revision', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    const snap = toSnapshot(fakeMessage({ id: 'm1', content: 'same' }));

    await service.ingestMessage(snap);
    await service.ingestMessage(snap);

    await expect(repo.countRevisions('m1')).resolves.toBe(1);
  });

  it('appends a revision per edit and returns the latest', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);

    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'm1', content: 'v1' })));
    await service.recordEdit(
      toSnapshot(
        fakeMessage({ id: 'm1', content: 'v2', editedAt: new Date('2026-02-01T00:00:00Z') }),
      ),
    );
    await service.recordEdit(
      toSnapshot(
        fakeMessage({ id: 'm1', content: 'v3', editedAt: new Date('2026-03-01T00:00:00Z') }),
      ),
    );

    await expect(repo.countRevisions('m1')).resolves.toBe(3);
    const found = await repo.findById('m1');
    expect(found?.content).toBe('v3');
    expect(found?.editedAt).toEqual(new Date('2026-03-01T00:00:00.000Z'));
  });

  it('appends a revision when only attachments change', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    const attachment = (url: string): Record<string, unknown> => ({
      id: 'a1',
      name: 'pic.png',
      contentType: 'image/png',
      size: 10,
      url,
      proxyURL: url,
      height: null,
      width: null,
      duration: null,
      waveform: null,
    });

    await service.ingestMessage(
      toSnapshot(
        fakeMessage({ id: 'm1', content: 'same', attachments: [attachment('https://cdn/1')] }),
      ),
    );
    await service.recordEdit(
      toSnapshot(
        fakeMessage({ id: 'm1', content: 'same', attachments: [attachment('https://cdn/2')] }),
      ),
    );

    await expect(repo.countRevisions('m1')).resolves.toBe(2);
    const found = await repo.findById('m1');
    expect(found?.attachments[0]?.url).toBe('https://cdn/2');
  });

  it('lists edited messages per channel, newest edit first', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'm1', content: 'v1' })));
    await service.recordEdit(
      toSnapshot(
        fakeMessage({ id: 'm1', content: 'v2', editedAt: new Date('2026-02-01T00:00:00.000Z') }),
      ),
    );
    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'm2', content: 'w1' })));
    await service.recordEdit(
      toSnapshot(
        fakeMessage({ id: 'm2', content: 'w2', editedAt: new Date('2026-03-01T00:00:00.000Z') }),
      ),
    );
    await service.ingestMessage(
      toSnapshot(fakeMessage({ id: 'm3', channelId: 'c2', content: 'z1' })),
    );
    await service.recordEdit(
      toSnapshot(
        fakeMessage({
          id: 'm3',
          channelId: 'c2',
          content: 'z2',
          editedAt: new Date('2026-04-01T00:00:00.000Z'),
        }),
      ),
    );
    await service.recordDelete('gone', 'c2', new Date());

    const edited = await repo.listEditedMessages('c1', 10);
    expect(edited.map((e) => e.messageId)).toEqual(['m2', 'm1']);

    const revs = await repo.getRevisions('m1');
    expect(revs.map((r) => r.content)).toEqual(['v1', 'v2']);
    expect(revs[1]?.editedAt).toEqual(new Date('2026-02-01T00:00:00.000Z'));
  });

  it('replaces reactions without touching revisions', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'm1', content: 'hi' })));

    await repo.replaceReactions('m1', [{ emojiId: null, emojiName: '👍', count: 3 }], new Date());

    expect((await repo.findById('m1'))?.reactions).toEqual([
      { emojiId: null, emojiName: '👍', count: 3 },
    ]);
    await expect(repo.countRevisions('m1')).resolves.toBe(1);

    await repo.replaceReactions('ghost', [], new Date());
    await expect(repo.findById('ghost')).resolves.toBeNull();
  });

  it('refreshes poll results without touching revisions', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    const poll = (votes: number): Record<string, unknown> => ({
      question: { text: 'Best?' },
      answers: [{ id: 1, text: 'yes', vote_count: votes }],
    });
    const withPoll = (votes: number): ReturnType<typeof toSnapshot> =>
      toSnapshot(fakeMessage({ id: 'm1', content: '', poll: { toJSON: () => poll(votes) } }));

    await service.ingestMessage(withPoll(1));
    await service.refreshPoll(withPoll(5));

    expect((await repo.findById('m1'))?.poll?.raw).toEqual(poll(5));
    await expect(repo.countRevisions('m1')).resolves.toBe(1);
  });

  it('establishes a baseline when refreshing an unknown message', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);

    await service.refreshPoll(
      toSnapshot(
        fakeMessage({
          id: 'mx',
          content: 'late',
          poll: { toJSON: () => ({ question: { text: 'Q?' }, answers: [] }) },
        }),
      ),
    );

    expect((await repo.findById('mx'))?.content).toBe('late');
    await expect(repo.countRevisions('mx')).resolves.toBe(1);
  });

  it('enriches channel shells and updates them on re-ingest', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    const base = toSnapshot(fakeMessage({ id: 'm1', content: 'hi' }));
    const inThread = {
      ...base,
      channelId: 'c1',
      threadId: 't1',
      channel: { id: 't1', kind: 11, name: 'thr', parentId: 'c1' },
    };

    await service.ingestMessage(inThread);
    expect(await repo.findById('m1')).toMatchObject({
      channelId: 'c1',
      threadId: 't1',
      channel: { id: 't1', kind: 11, name: 'thr', parentId: 'c1' },
    });

    await service.ingestMessage({
      ...inThread,
      channel: { id: 't1', kind: 11, name: 'renamed', parentId: 'c1' },
    });
    expect((await repo.findById('m1'))?.channel?.name).toBe('renamed');
  });

  it('deletes channel shells without touching messages', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    const base = toSnapshot(fakeMessage({ id: 'm1', content: 'hi' }));
    await service.ingestMessage({
      ...base,
      channel: { id: 'c1', kind: 0, name: 'general', parentId: null },
    });

    await repo.deleteChannel('c1');

    const found = await repo.findById('m1');
    expect(found?.channel).toBeNull();
    expect(found?.content).toBe('hi');
  });

  it('lists deletions per channel, newest first', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.recordDelete('old', 'c1', new Date('2026-01-01T00:00:00.000Z'));
    await service.recordDelete('new', 'c1', new Date('2026-02-01T00:00:00.000Z'));
    await service.recordDelete('other', 'c2', new Date('2026-03-01T00:00:00.000Z'));

    const listed = await repo.listDeletionsForChannel('c1', 10);
    expect(listed.map((d) => d.messageId)).toEqual(['new', 'old']);
  });

  it('records deletion of a never-seen message as an id-only marker', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);

    await expect(service.recordDelete('mx', 'c1', new Date())).resolves.toEqual({
      ok: true,
    });

    await expect(repo.findById('mx')).resolves.toBeNull();
    const deletion = await repo.getDeletion('mx');
    expect(deletion?.kind).toBe('single');
  });

  it('annotates only unattributed deletion rows', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.recordDelete('m1', 'c1', new Date('2026-01-01T00:00:00.000Z'));
    await service.recordDelete('m1', 'c1', new Date('2026-01-02T00:00:00.000Z'));
    db.$client
      .prepare(
        `UPDATE deletion_events SET executor_id = 'old', audit_entry_id = 'e0'
         WHERE id = (SELECT MAX(id) FROM deletion_events WHERE message_id = 'm1')`,
      )
      .run();

    await repo.annotateDeletionEvents('m1', { executorId: 'mod1', auditEntryId: 'e1' });

    const rows = db.$client
      .prepare(
        `SELECT executor_id AS e, audit_entry_id AS a FROM deletion_events
         WHERE message_id = 'm1' ORDER BY id`,
      )
      .all() as { e: string | null; a: string | null }[];
    expect(rows).toEqual([
      { e: 'mod1', a: 'e1' },
      { e: 'old', a: 'e0' },
    ]);
    expect((await repo.getDeletion('m1'))?.executorId).toBe('old');
  });

  it('records bulk deletions for all ids', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);

    await expect(service.recordDeleteBulk(['a', 'b', 'c'], 'c1', new Date())).resolves.toEqual({
      ok: true,
    });

    for (const id of ['a', 'b', 'c']) {
      expect((await repo.getDeletion(id))?.kind).toBe('bulk');
    }
  });

  it('moves service counters', async () => {
    resetMetrics();
    const service = createDrizzleArchiveService(db);
    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'm1', content: 'x' })));
    await service.recordEdit(
      toSnapshot(fakeMessage({ id: 'm1', content: 'y', editedAt: new Date() })),
    );
    await service.recordDelete('m9', 'c1', new Date());
    const counters = snapshotMetrics().counters;
    expect(counters['messages.ingested']).toBe(1);
    expect(counters['messages.edited']).toBe(1);
    expect(counters['messages.deleted']).toBe(1);
  });

  it('survives close/reopen with migrations applying cleanly', async () => {
    const service = createDrizzleArchiveService(db);
    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'm1', content: 'persist me' })));
    closeDb();

    openDb();
    const repo = new DrizzleMessageRepository(db);
    expect((await repo.findById('m1'))?.content).toBe('persist me');
  });

  it('round-trips guild policy with null for unknown guilds', async () => {
    const repo = new DrizzleMessageRepository(db);
    await expect(repo.getPolicy('g9')).resolves.toBeNull();
    await repo.savePolicy('g9', { snipeRoleIds: ['r1'], archivingEnabled: true });
    expect(await repo.getPolicy('g9')).toMatchObject({
      snipeRoleIds: ['r1'],
      archivingEnabled: true,
    });
    await repo.savePolicy('g9', { snipeRoleIds: [], archivingEnabled: false });
    expect(await repo.getPolicy('g9')).toMatchObject({
      snipeRoleIds: [],
      archivingEnabled: false,
    });
  });

  it('throws on corrupt policy rows', () => {
    const repo = new DrizzleMessageRepository(db);
    db.$client
      .prepare(
        `INSERT INTO guild_settings (guild_id, snipe_role_ids, archiving_enabled, updated_at)
         VALUES ('bad', '[[[', 1, '2026-01-01T00:00:00.000Z')`,
      )
      .run();
    expect(() => repo.getPolicy('bad')).toThrow(/corrupt/);
  });

  it('skips DM snapshots unless archiving is opted in', async () => {
    const repo = new DrizzleMessageRepository(db);
    const plain = createDrizzleArchiveService(db);
    await plain.ingestMessage(
      toSnapshot(fakeMessage({ id: 'dm1', guildId: null, channelId: 'd1', content: 'secret' })),
    );
    await expect(repo.findById('dm1')).resolves.toBeNull();

    const opted = createDrizzleArchiveService(db, { archiveDMs: true });
    await opted.ingestMessage(
      toSnapshot(fakeMessage({ id: 'dm2', guildId: null, channelId: 'd1', content: 'kept' })),
    );
    expect((await repo.findById('dm2'))?.content).toBe('kept');
  });

  it('skips guilds that opted out of archiving', async () => {
    const repo = new DrizzleMessageRepository(db);
    await repo.savePolicy('g1', { snipeRoleIds: [], archivingEnabled: false });
    const service = createDrizzleArchiveService(db);
    await service.ingestMessage(toSnapshot(fakeMessage({ id: 'm1', content: 'skipped' })));
    await expect(repo.findById('m1')).resolves.toBeNull();
  });

  it('does not baseline DM votes when opted out', async () => {
    const service = createDrizzleArchiveService(db);
    const repo = new DrizzleMessageRepository(db);
    await service.refreshPoll(
      toSnapshot(
        fakeMessage({
          id: 'dmv',
          guildId: null,
          channelId: 'd1',
          content: '',
          poll: { toJSON: () => ({ question: { text: 'Q?' }, answers: [] }) },
        }),
      ),
    );
    await expect(repo.findById('dmv')).resolves.toBeNull();
    await expect(repo.countRevisions('dmv')).resolves.toBe(0);
  });
});
