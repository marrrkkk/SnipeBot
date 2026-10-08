import { Client, Events, type Message, type OmitPartialGroupDMChannel } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { toSnapshot } from '../../src/discord/mappers.js';
import type { MessageSnapshot } from '../../src/domain/messageSnapshot.js';
import { registerMessageCreate } from '../../src/events/messageCreate.js';
import type { ArchiveService } from '../../src/services/archiveService.js';
import { createStubArchiveService } from '../../src/services/stubArchiveService.js';
import { fakeMessage } from './helpers/fakes.js';

function emitMessage(client: Client, message: Message): void {
  client.emit(Events.MessageCreate, message as unknown as OmitPartialGroupDMChannel<Message>);
}

function fakeService(): {
  service: ArchiveService;
  calls: MessageSnapshot[];
  failNextWith: (err: Error) => void;
} {
  const calls: MessageSnapshot[] = [];
  let nextFailure: Error | null = null;
  const service: ArchiveService = {
    ingestMessage: (snap) => {
      if (nextFailure !== null) {
        const err = nextFailure;
        nextFailure = null;
        return Promise.reject(err);
      }
      calls.push(snap);
      return Promise.resolve({ ok: true });
    },
    recordEdit: () => Promise.resolve({ ok: true }),
    recordDelete: () => Promise.resolve({ ok: true }),
    recordDeleteBulk: () => Promise.resolve({ ok: true }),
    recordReactions: () => Promise.resolve({ ok: true }),
    refreshPoll: () => Promise.resolve({ ok: true }),
    annotateDeletion: () => Promise.resolve({ ok: true }),
    recordChannel: () => Promise.resolve({ ok: true }),
    removeChannel: () => Promise.resolve({ ok: true }),
  };
  return {
    service,
    calls,
    failNextWith: (err: Error): void => {
      nextFailure = err;
    },
  };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe('registerMessageCreate', () => {
  it('ingests normal messages as snapshots', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageCreate(client, service);
      emitMessage(client, fakeMessage({ id: 'm1' }));
      await flush();
      expect(calls.map((c) => c.id)).toEqual(['m1']);
    } finally {
      void client.destroy();
    }
  });

  it('skips bot messages', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageCreate(client, service);
      emitMessage(
        client,
        fakeMessage({ author: { id: 'b1', username: 'bot', discriminator: '0', bot: true } }),
      );
      await flush();
      expect(calls).toEqual([]);
    } finally {
      void client.destroy();
    }
  });

  it('isolates service failures and keeps processing', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls, failNextWith } = fakeService();
      registerMessageCreate(client, service);
      failNextWith(new Error('db down'));
      emitMessage(client, fakeMessage({ id: 'm-bad' }));
      await flush();
      emitMessage(client, fakeMessage({ id: 'm-good' }));
      await flush();
      // The failed message is dropped; the next one still archives.
      // (A rejection escaping here would surface as an unhandled error.)
      expect(calls.map((c) => c.id)).toEqual(['m-good']);
    } finally {
      void client.destroy();
    }
  });

  it('drops partial messages without calling the service', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageCreate(client, service);
      emitMessage(client, fakeMessage({ author: null }));
      await flush();
      emitMessage(client, fakeMessage({ id: 'm-after' }));
      await flush();
      expect(calls.map((c) => c.id)).toEqual(['m-after']);
    } finally {
      void client.destroy();
    }
  });

  it('stub service resolves ok (placeholder until Phase 3)', async () => {
    const service = createStubArchiveService();
    const snap = toSnapshot(fakeMessage({ id: 's1' }));
    await expect(service.ingestMessage(snap)).resolves.toEqual({ ok: true });
  });

  it('applies thread resolution before ingest', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageCreate(client, service, {
        resolve: (_channelId: string) =>
          Promise.resolve({
            channelId: 'c1',
            threadId: 't1',
            channel: { id: 't1', kind: 11, name: 'thr', parentId: 'c1' },
          }),
      });
      emitMessage(client, fakeMessage({ id: 'm1', channelId: 't1', channel: null }));
      await flush();
      expect(calls.map((c) => [c.channelId, c.threadId])).toEqual([['c1', 't1']]);
      expect(calls[0]?.channel?.name).toBe('thr');
    } finally {
      void client.destroy();
    }
  });
});
