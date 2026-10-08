import { Client, Events } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  registerThreadCreate,
  registerThreadDelete,
  registerThreadUpdate,
} from '../../src/events/threadEvents.js';
import type { ArchiveService } from '../../src/services/archiveService.js';
import type { ChannelInfo } from '../../src/repositories/drizzleMessageRepository.js';

function fakeService(): {
  service: ArchiveService;
  channels: ChannelInfo[];
  removed: string[];
} {
  const channels: ChannelInfo[] = [];
  const removed: string[] = [];
  const service: ArchiveService = {
    ingestMessage: () => Promise.resolve({ ok: true }),
    recordEdit: () => Promise.resolve({ ok: true }),
    recordDelete: () => Promise.resolve({ ok: true }),
    recordDeleteBulk: () => Promise.resolve({ ok: true }),
    recordReactions: () => Promise.resolve({ ok: true }),
    refreshPoll: () => Promise.resolve({ ok: true }),
    recordChannel: (info) => {
      channels.push(info);
      return Promise.resolve({ ok: true });
    },
    removeChannel: (id) => {
      removed.push(id);
      return Promise.resolve({ ok: true });
    },
    annotateDeletion: () => Promise.resolve({ ok: true }),
  };
  return { service, channels, removed };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe('thread lifecycle handlers', () => {
  it('records created threads', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, channels } = fakeService();
      registerThreadCreate(client, service);
      client.emit(
        Events.ThreadCreate,
        {
          id: 't1',
          guildId: 'g1',
          type: 11,
          name: 'thr',
          parentId: 'c1',
          archived: false,
          archivedAt: null,
        } as never,
        true as never,
      );
      await flush();
      expect(channels).toEqual([
        {
          id: 't1',
          guildId: 'g1',
          kind: 11,
          name: 'thr',
          parentId: 'c1',
          archivedAt: null,
        },
      ]);
    } finally {
      void client.destroy();
    }
  });

  it('records archive state on update', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, channels } = fakeService();
      registerThreadUpdate(client, service);
      client.emit(
        Events.ThreadUpdate,
        { id: 't1' } as never,
        {
          id: 't1',
          guildId: 'g1',
          type: 11,
          name: 'thr',
          parentId: 'c1',
          archived: true,
          archivedAt: new Date('2026-06-01T00:00:00.000Z'),
        } as never,
      );
      await flush();
      expect(channels[0]).toMatchObject({
        id: 't1',
        archivedAt: '2026-06-01T00:00:00.000Z',
      });
    } finally {
      void client.destroy();
    }
  });

  it('removes deleted threads', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, removed } = fakeService();
      registerThreadDelete(client, service);
      client.emit(Events.ThreadDelete, { id: 't1' } as never);
      await flush();
      expect(removed).toEqual(['t1']);
    } finally {
      void client.destroy();
    }
  });

  it('skips unidentifiable thread payloads', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, channels, removed } = fakeService();
      registerThreadCreate(client, service);
      registerThreadDelete(client, service);
      client.emit(Events.ThreadCreate, { nope: true } as never, true as never);
      client.emit(Events.ThreadDelete, { nope: true } as never);
      await flush();
      expect(channels).toEqual([]);
      expect(removed).toEqual([]);
    } finally {
      void client.destroy();
    }
  });
});
