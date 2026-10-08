import {
  Client,
  Collection,
  Events,
  AuditLogEvent,
  type GuildTextBasedChannel,
  type Message,
  type OmitPartialGroupDMChannel,
  type PartialMessage,
  type ReadonlyCollection,
  type Snowflake,
} from 'discord.js';
import { describe, expect, it } from 'vitest';
import type { MessageSnapshot } from '../../src/domain/messageSnapshot.js';
import {
  registerMessageDelete,
  registerMessageDeleteBulk,
} from '../../src/events/messageDelete.js';
import { registerMessageUpdate } from '../../src/events/messageUpdate.js';
import type { ArchiveService } from '../../src/services/archiveService.js';
import { fakeMessage } from './helpers/fakes.js';

function fakeService(): {
  service: ArchiveService;
  edits: MessageSnapshot[];
  deletes: { messageId: string; channelId: string | null }[];
  bulks: { messageIds: string[]; channelId: string | null }[];
  attributed: { messageId: string; attribution: { executorId: string; auditEntryId: string } }[];
} {
  const edits: MessageSnapshot[] = [];
  const deletes: { messageId: string; channelId: string | null }[] = [];
  const bulks: { messageIds: string[]; channelId: string | null }[] = [];
  const attributed: {
    messageId: string;
    attribution: { executorId: string; auditEntryId: string };
  }[] = [];
  const service: ArchiveService = {
    ingestMessage: () => Promise.resolve({ ok: true }),
    recordEdit: (snap) => {
      edits.push(snap);
      return Promise.resolve({ ok: true });
    },
    recordDelete: (messageId, channelId) => {
      deletes.push({ messageId, channelId });
      return Promise.resolve({ ok: true });
    },
    recordDeleteBulk: (messageIds, channelId) => {
      bulks.push({ messageIds, channelId });
      return Promise.resolve({ ok: true });
    },
    recordReactions: () => Promise.resolve({ ok: true }),
    refreshPoll: () => Promise.resolve({ ok: true }),
    recordChannel: () => Promise.resolve({ ok: true }),
    removeChannel: () => Promise.resolve({ ok: true }),
    annotateDeletion: (messageId, attribution) => {
      attributed.push({ messageId, attribution });
      return Promise.resolve({ ok: true });
    },
  };
  return { service, edits, deletes, bulks, attributed };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function auditGuild(entries: Record<string, unknown>[], calls?: { count: number }): unknown {
  return {
    fetchAuditLogs: (_opts: unknown): Promise<unknown> => {
      if (calls !== undefined) calls.count += 1;
      return Promise.resolve({
        entries: new Collection(entries.map((e, i) => [String(i), e])),
      });
    },
  };
}

type EmittableMessage = OmitPartialGroupDMChannel<Message | PartialMessage>;
type EmittableNewMessage = OmitPartialGroupDMChannel<Message>;

function emitUpdate(client: Client, oldMessage: unknown, newMessage: unknown): void {
  client.emit(
    Events.MessageUpdate,
    oldMessage as EmittableMessage,
    newMessage as EmittableNewMessage,
  );
}

function emitDelete(client: Client, message: unknown): void {
  client.emit(Events.MessageDelete, message as EmittableMessage);
}

function emitBulk(client: Client, messages: Collection<string, Message>, channel: unknown): void {
  client.emit(
    Events.MessageBulkDelete,
    messages as unknown as ReadonlyCollection<Snowflake, Message<true>>,
    channel as GuildTextBasedChannel,
  );
}

describe('registerMessageUpdate', () => {
  it('records edits from full messages', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, edits } = fakeService();
      registerMessageUpdate(client, service);
      emitUpdate(
        client,
        fakeMessage({ id: 'm0', content: 'before' }),
        fakeMessage({ id: 'm1', content: 'after' }),
      );
      await flush();
      expect(edits.map((e) => e.content)).toEqual(['after']);
    } finally {
      void client.destroy();
    }
  });

  it('fetches partial messages before recording', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, edits } = fakeService();
      registerMessageUpdate(client, service);
      const partial = {
        partial: true,
        fetch: (): Promise<unknown> =>
          Promise.resolve(fakeMessage({ id: 'm1', content: 'fetched' })),
      };
      emitUpdate(client, fakeMessage({ id: 'm0' }), partial);
      await flush();
      expect(edits.map((e) => e.content)).toEqual(['fetched']);
    } finally {
      void client.destroy();
    }
  });

  it('skips partial messages that cannot be fetched', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, edits } = fakeService();
      registerMessageUpdate(client, service);
      const partial = {
        partial: true,
        fetch: (): Promise<unknown> => Promise.reject(new Error('gone')),
      };
      emitUpdate(client, fakeMessage({ id: 'm0' }), partial);
      await flush();
      expect(edits).toEqual([]);
    } finally {
      void client.destroy();
    }
  });

  it('skips bot messages', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, edits } = fakeService();
      registerMessageUpdate(client, service);
      emitUpdate(
        client,
        fakeMessage({ id: 'm0' }),
        fakeMessage({
          id: 'm1',
          author: { id: 'b1', username: 'bot', discriminator: '0', bot: true },
        }),
      );
      await flush();
      expect(edits).toEqual([]);
    } finally {
      void client.destroy();
    }
  });

  it('applies thread resolution before recording edits', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, edits } = fakeService();
      registerMessageUpdate(client, service, {
        resolve: (_channelId: string) =>
          Promise.resolve({
            channelId: 'c1',
            threadId: 't1',
            channel: { id: 't1', kind: 11, name: 'thr', parentId: 'c1' },
          }),
      });
      emitUpdate(client, fakeMessage({ id: 'm0' }), fakeMessage({ id: 'm1', channelId: 't1' }));
      await flush();
      expect(edits.map((e) => [e.channelId, e.threadId])).toEqual([['c1', 't1']]);
    } finally {
      void client.destroy();
    }
  });
});

describe('registerMessageDelete', () => {
  it('records single deletes, even for partial messages', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, deletes } = fakeService();
      registerMessageDelete(client, service);
      emitDelete(client, { id: 'd1', channelId: 'c1' });
      await flush();
      expect(deletes).toEqual([{ messageId: 'd1', channelId: 'c1' }]);
    } finally {
      void client.destroy();
    }
  });

  it('attributes single deletes via the audit log', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, deletes, attributed } = fakeService();
      registerMessageDelete(client, service);
      emitDelete(client, {
        id: 'd1',
        channelId: 'c1',
        author: { id: 'u1' },
        guild: auditGuild([
          {
            id: 'e1',
            action: AuditLogEvent.MessageDelete,
            targetId: 'u1',
            executorId: 'mod1',
            extra: { channel: { id: 'c1' } },
            createdTimestamp: Date.now(),
          },
        ]),
      });
      await flush();
      expect(deletes).toEqual([{ messageId: 'd1', channelId: 'c1' }]);
      expect(attributed).toEqual([
        { messageId: 'd1', attribution: { executorId: 'mod1', auditEntryId: 'e1' } },
      ]);
    } finally {
      void client.destroy();
    }
  });

  it('skips attribution without guild context', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, deletes, attributed } = fakeService();
      registerMessageDelete(client, service);
      emitDelete(client, { id: 'd1', channelId: 'c1' });
      await flush();
      expect(deletes).toEqual([{ messageId: 'd1', channelId: 'c1' }]);
      expect(attributed).toEqual([]);
    } finally {
      void client.destroy();
    }
  });

  it('skips attribution when the audit log is unreachable', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, attributed } = fakeService();
      registerMessageDelete(client, service);
      emitDelete(client, {
        id: 'd1',
        channelId: 'c1',
        author: { id: 'u1' },
        guild: {
          fetchAuditLogs: () => Promise.reject(new Error('Missing Access')),
        },
      });
      await flush();
      expect(attributed).toEqual([]);
    } finally {
      void client.destroy();
    }
  });

  it('retries attribution once after a miss', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, attributed } = fakeService();
      registerMessageDelete(client, service, { retryDelayMs: 10 });
      const match = {
        id: 'e1',
        action: AuditLogEvent.MessageDelete,
        targetId: 'u1',
        executorId: 'mod1',
        extra: { channel: { id: 'c1' } },
        createdTimestamp: Date.now(),
      };
      let calls = 0;
      const guild = {
        fetchAuditLogs: (_opts: unknown): Promise<unknown> => {
          calls += 1;
          const entries = calls === 1 ? [] : [match];
          return Promise.resolve({
            entries: new Collection(entries.map((e, i) => [String(i), e])),
          });
        },
      };
      emitDelete(client, { id: 'd1', channelId: 'c1', author: { id: 'u1' }, guild });
      await flush();
      expect(attributed).toEqual([]);
      await sleep(60);
      expect(attributed).toEqual([
        { messageId: 'd1', attribution: { executorId: 'mod1', auditEntryId: 'e1' } },
      ]);
      expect(calls).toBe(2);
    } finally {
      void client.destroy();
    }
  });

  it('records bulk deletes with all ids', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, bulks } = fakeService();
      registerMessageDeleteBulk(client, service);
      const messages = new Collection([
        ['b1', fakeMessage({ id: 'b1' })],
        ['b2', fakeMessage({ id: 'b2' })],
      ]);
      emitBulk(client, messages, { id: 'c1' });
      await flush();
      expect(bulks).toEqual([{ messageIds: ['b1', 'b2'], channelId: 'c1' }]);
    } finally {
      void client.destroy();
    }
  });
});
