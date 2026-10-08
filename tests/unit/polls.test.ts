import { Client, Events, type PollAnswer } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { createCoalescer } from '../../src/utils/coalesce.js';
import {
  registerMessagePollVoteAdd,
  registerMessagePollVoteRemove,
} from '../../src/events/pollVotes.js';
import type { ArchiveService } from '../../src/services/archiveService.js';
import type { MessageSnapshot } from '../../src/domain/messageSnapshot.js';
import { fakeMessage } from './helpers/fakes.js';

function fakeService(): {
  service: ArchiveService;
  polls: MessageSnapshot[];
} {
  const polls: MessageSnapshot[] = [];
  const service: ArchiveService = {
    ingestMessage: () => Promise.resolve({ ok: true }),
    recordEdit: () => Promise.resolve({ ok: true }),
    recordDelete: () => Promise.resolve({ ok: true }),
    recordDeleteBulk: () => Promise.resolve({ ok: true }),
    recordReactions: () => Promise.resolve({ ok: true }),
    refreshPoll: (snap) => {
      polls.push(snap);
      return Promise.resolve({ ok: true });
    },
    annotateDeletion: () => Promise.resolve({ ok: true }),
    recordChannel: () => Promise.resolve({ ok: true }),
    removeChannel: () => Promise.resolve({ ok: true }),
  };
  return { service, polls };
}

function answerWith(message: unknown): PollAnswer {
  return { poll: { message } } as unknown as PollAnswer;
}

function fullMessage(): ReturnType<typeof fakeMessage> {
  return fakeMessage({
    id: 'm1',
    content: 'pick one',
    poll: { toJSON: () => ({ question: { text: 'Q?' }, answers: [] }) },
  });
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe('poll vote handlers', () => {
  it('refreshes on vote add', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, polls } = fakeService();
      registerMessagePollVoteAdd(client, service, createCoalescer(0));
      client.emit(Events.MessagePollVoteAdd, answerWith(fullMessage()), 'u1');
      await flush();
      expect(polls.map((s) => s.id)).toEqual(['m1']);
      expect(polls[0]?.poll?.raw).toEqual({ question: { text: 'Q?' }, answers: [] });
    } finally {
      void client.destroy();
    }
  });

  it('refreshes on vote remove', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, polls } = fakeService();
      registerMessagePollVoteRemove(client, service, createCoalescer(0));
      client.emit(Events.MessagePollVoteRemove, answerWith(fullMessage()), 'u1');
      await flush();
      expect(polls.map((s) => s.id)).toEqual(['m1']);
    } finally {
      void client.destroy();
    }
  });

  it('fetches partial messages before refreshing', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, polls } = fakeService();
      registerMessagePollVoteAdd(client, service, createCoalescer(0));
      const partial = {
        partial: true,
        fetch: (): Promise<unknown> => Promise.resolve(fullMessage()),
      };
      client.emit(Events.MessagePollVoteAdd, answerWith(partial), 'u1');
      await flush();
      expect(polls.map((s) => s.id)).toEqual(['m1']);
    } finally {
      void client.destroy();
    }
  });

  it('skips partial messages that cannot be fetched', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, polls } = fakeService();
      registerMessagePollVoteAdd(client, service, createCoalescer(0));
      const partial = {
        partial: true,
        fetch: (): Promise<unknown> => Promise.reject(new Error('gone')),
      };
      client.emit(Events.MessagePollVoteAdd, answerWith(partial), 'u1');
      await flush();
      expect(polls).toEqual([]);
    } finally {
      void client.destroy();
    }
  });

  it('skips fetched messages without a poll', async () => {
    const client = new Client({ intents: [] });
    try {
      const { service, polls } = fakeService();
      registerMessagePollVoteAdd(client, service, createCoalescer(0));
      client.emit(
        Events.MessagePollVoteAdd,
        answerWith(fakeMessage({ id: 'm2', content: 'no poll here' })),
        'u1',
      );
      await flush();
      expect(polls).toEqual([]);
    } finally {
      void client.destroy();
    }
  });
});
