import { Collection, type Message } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { fetchHistoryPage } from '../../src/discord/history.js';
import { fakeMessage } from './helpers/fakes.js';

function channelWith(pages: Record<string, unknown>): {
  id: string;
  messages: {
    fetch: (opts: { limit: number; before?: string }) => Promise<Collection<string, Message>>;
  };
  calls: { limit: number; before?: string }[];
} {
  const calls: { limit: number; before?: string }[] = [];
  return {
    id: 'c1',
    messages: {
      fetch: (opts: { limit: number; before?: string }) => {
        calls.push({ ...opts });
        const key = opts.before ?? 'start';
        const items = (pages[key] ?? []) as unknown[];
        const collection = new Collection(
          items.map((m) => [(m as { id: string }).id, m] as [string, unknown]),
        );
        return Promise.resolve(collection as unknown as Collection<string, Message>);
      },
    },
    calls,
  };
}

describe('fetchHistoryPage', () => {
  it('walks pages to exhaustion', async () => {
    const m3 = fakeMessage({ id: '300', content: 'c' });
    const m2 = fakeMessage({ id: '200', content: 'b' });
    const m1 = fakeMessage({ id: '100', content: 'a' });
    const channel = channelWith({ start: [m3, m2], '200': [m1], '100': [] });

    expect(await fetchHistoryPage(channel, undefined)).toHaveLength(2);
    expect(await fetchHistoryPage(channel, '200')).toHaveLength(1);
    expect(await fetchHistoryPage(channel, '100')).toHaveLength(0);
    expect(channel.calls[0]).toMatchObject({ limit: 100 });
  });

  it('propagates fetch failures', async () => {
    const broken = {
      id: 'c9',
      messages: {
        fetch: (): Promise<never> => Promise.reject(new Error('Missing Access')),
      },
    };
    await expect(fetchHistoryPage(broken, undefined)).rejects.toThrow(/Missing Access/);
  });
});
