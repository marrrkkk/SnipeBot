import { ChannelType, Collection, type Client } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { createThreadResolver } from '../../src/discord/threads.js';

function fakeClient(
  cached: unknown[],
  fetchImpl?: (id: string) => Promise<unknown>,
  calls?: { count: number },
): Client {
  return {
    channels: {
      cache: new Collection(cached.map((c) => [(c as { id: string }).id, c])),
      fetch: (id: string): Promise<unknown> => {
        if (calls !== undefined) calls.count += 1;
        if (fetchImpl === undefined) return Promise.resolve(null);
        return fetchImpl(id);
      },
    },
  } as unknown as Client;
}

const threadChannel = {
  id: 't1',
  parentId: 'c1',
  isThread: () => true,
  type: ChannelType.PublicThread,
  name: 'thr',
};

const textChannel = {
  id: 'c1',
  parentId: null,
  isThread: () => false,
  type: ChannelType.GuildText,
  name: 'general',
};

describe('thread resolver', () => {
  it('splits cached threads without fetching', async () => {
    const calls = { count: 0 };
    const resolver = createThreadResolver(fakeClient([threadChannel], undefined, calls));

    const resolution = await resolver.resolve('t1');

    expect(resolution).toEqual({
      channelId: 'c1',
      threadId: 't1',
      channel: { id: 't1', kind: ChannelType.PublicThread, name: 'thr', parentId: 'c1' },
    });
    expect(calls.count).toBe(0);
  });

  it('passes cached text channels through with fields', async () => {
    const resolver = createThreadResolver(fakeClient([textChannel]));

    expect(await resolver.resolve('c1')).toEqual({
      channelId: 'c1',
      threadId: null,
      channel: { id: 'c1', kind: ChannelType.GuildText, name: 'general', parentId: null },
    });
  });

  it('fetches once for unknown channels and caches the result', async () => {
    const calls = { count: 0 };
    const resolver = createThreadResolver(
      fakeClient([], (id) => Promise.resolve({ ...threadChannel, id, parentId: 'c9' }), calls),
    );

    const first = await resolver.resolve('tx');
    const second = await resolver.resolve('tx');

    expect(calls.count).toBe(1);
    expect(first?.threadId).toBe('tx');
    expect(first).toEqual(second);
  });

  it('shares in-flight fetches and falls back to null on failure', async () => {
    const calls = { count: 0 };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const resolver = createThreadResolver(
      fakeClient(
        [],
        async () => {
          calls.count += 1;
          await gate;
          throw new Error('nope');
        },
        undefined,
      ),
    );

    const pending = [resolver.resolve('ty'), resolver.resolve('ty')];
    release();
    const [first, second] = await Promise.all(pending);

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(calls.count).toBe(1);
  });
});
