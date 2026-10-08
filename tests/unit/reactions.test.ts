import { Client, Collection, Events, type MessageReaction } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { createCoalescer } from '../../src/utils/coalesce.js';
import type { ReactionSnapshot } from '../../src/domain/messageSnapshot.js';
import {
  registerMessageReactionAdd,
  registerMessageReactionRemove,
  registerMessageReactionRemoveAll,
  registerMessageReactionRemoveEmoji,
} from '../../src/events/reactions.js';
import type { ArchiveService } from '../../src/services/archiveService.js';
import { fakeMessage } from './helpers/fakes.js';

function fakeService(): {
  service: ArchiveService;
  calls: { messageId: string; reactions: ReactionSnapshot[] }[];
} {
  const calls: { messageId: string; reactions: ReactionSnapshot[] }[] = [];
  const service: ArchiveService = {
    ingestMessage: () => Promise.resolve({ ok: true }),
    recordEdit: () => Promise.resolve({ ok: true }),
    recordDelete: () => Promise.resolve({ ok: true }),
    recordDeleteBulk: () => Promise.resolve({ ok: true }),
    recordReactions: (messageId, reactions) => {
      calls.push({ messageId, reactions });
      return Promise.resolve({ ok: true });
    },
    refreshPoll: () => Promise.resolve({ ok: true }),
    annotateDeletion: () => Promise.resolve({ ok: true }),
    recordChannel: () => Promise.resolve({ ok: true }),
    removeChannel: () => Promise.resolve({ ok: true }),
  };
  return { service, calls };
}

function messageWithReactions(): ReturnType<typeof fakeMessage> {
  return fakeMessage({
    id: 'm1',
    partial: false,
    reactions: {
      cache: new Collection([['👍', { emoji: { id: null, name: '👍' }, count: 2 }]]),
    },
  });
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe('reaction handlers', () => {
  it('records the current set on add', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageReactionAdd(client, service, createCoalescer(0));
      client.emit(
        Events.MessageReactionAdd,
        { message: messageWithReactions() } as unknown as MessageReaction,
        { id: 'u2' } as never,
        { type: 0, burst: false } as never,
      );
      await flush();
      expect(calls).toEqual([
        { messageId: 'm1', reactions: [{ emojiId: null, emojiName: '👍', count: 2 }] },
      ]);
    } finally {
      void client.destroy();
    }
  });

  it('records the current set on remove, including bot reactors', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageReactionRemove(client, service, createCoalescer(0));
      client.emit(
        Events.MessageReactionRemove,
        { message: messageWithReactions() } as unknown as MessageReaction,
        { id: 'b1', bot: true } as never,
        { type: 0, burst: false } as never,
      );
      await flush();
      expect(calls).toHaveLength(1);
      expect(calls[0]?.messageId).toBe('m1');
    } finally {
      void client.destroy();
    }
  });

  it('records an empty set on remove-all', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageReactionRemoveAll(client, service, createCoalescer(0));
      client.emit(
        Events.MessageReactionRemoveAll,
        fakeMessage({ id: 'm1', reactions: { cache: new Collection() } }) as never,
        new Collection() as never,
      );
      await flush();
      expect(calls).toEqual([{ messageId: 'm1', reactions: [] }]);
    } finally {
      void client.destroy();
    }
  });

  it('refreshes from the API on emoji removal', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageReactionRemoveEmoji(client, service, createCoalescer(0));
      client.emit(Events.MessageReactionRemoveEmoji, {
        message: messageWithReactions(),
      } as unknown as MessageReaction);
      await flush();
      expect(calls).toHaveLength(1);
    } finally {
      void client.destroy();
    }
  });

  it('fetches partial messages before recording', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageReactionAdd(client, service, createCoalescer(0));
      const partial = {
        partial: true,
        fetch: (): Promise<unknown> => Promise.resolve(messageWithReactions()),
      };
      client.emit(
        Events.MessageReactionAdd,
        { message: partial } as unknown as MessageReaction,
        { id: 'u2' } as never,
        { type: 0, burst: false } as never,
      );
      await flush();
      expect(calls).toHaveLength(1);
    } finally {
      void client.destroy();
    }
  });

  it('skips partial messages that cannot be fetched', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, calls } = fakeService();
      registerMessageReactionAdd(client, service, createCoalescer(0));
      const partial = {
        partial: true,
        fetch: (): Promise<unknown> => Promise.reject(new Error('gone')),
      };
      client.emit(
        Events.MessageReactionAdd,
        { message: partial } as unknown as MessageReaction,
        { id: 'u2' } as never,
        { type: 0, burst: false } as never,
      );
      await flush();
      expect(calls).toEqual([]);
    } finally {
      void client.destroy();
    }
  });
});
