import type { Client } from 'discord.js';
import type { ChannelSnapshot } from '../domain/messageSnapshot.js';

export type ThreadResolution = {
  /** Parent (or self) channel id for messages.channelId. */
  channelId: string;
  threadId: string | null;
  channel: ChannelSnapshot | null;
};

export type ThreadResolver = {
  resolve(channelId: string): Promise<ThreadResolution | null>;
};

type CacheEntry = { at: number; value: ThreadResolution | null };

const NEGATIVE_TTL_MS = 60_000;

function describeChannel(channelId: string, channel: unknown): ThreadResolution {
  if (typeof channel !== 'object' || channel === null) {
    return { channelId, threadId: null, channel: null };
  }
  const record = channel as {
    isThread?: () => boolean;
    parentId?: unknown;
    type?: unknown;
    name?: unknown;
    id?: unknown;
  };
  const id = typeof record.id === 'string' ? record.id : channelId;
  const kind = typeof record.type === 'number' ? record.type : null;
  const name = typeof record.name === 'string' ? record.name : null;
  if (typeof record.isThread === 'function' && record.isThread()) {
    const parent = typeof record.parentId === 'string' ? record.parentId : channelId;
    return {
      channelId: parent,
      threadId: channelId,
      channel: { id, kind, name, parentId: parent },
    };
  }
  const parent = typeof record.parentId === 'string' ? record.parentId : null;
  return { channelId, threadId: null, channel: { id, kind, name, parentId: parent } };
}

/**
 * Cache-first thread attribution. Cached channels cost a Map lookup;
 * unknown channels cost one REST fetch per process lifetime (failures
 * retry after 60s). Handlers resolve before mapping; the mapper keeps its
 * own fallback when no resolver runs.
 */
export function createThreadResolver(client: Client): ThreadResolver {
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<ThreadResolution | null>>();

  async function fetchDescribe(channelId: string): Promise<ThreadResolution | null> {
    try {
      const fetched: unknown = await client.channels.fetch(channelId);
      if (fetched === null || fetched === undefined) {
        cache.set(channelId, { at: Date.now(), value: null });
        return null;
      }
      const resolution = describeChannel(channelId, fetched);
      cache.set(channelId, { at: Date.now(), value: resolution });
      return resolution;
    } catch {
      cache.set(channelId, { at: Date.now(), value: null });
      return null;
    }
  }

  return {
    resolve(channelId: string): Promise<ThreadResolution | null> {
      const cached = client.channels.cache.get(channelId);
      if (cached !== undefined) return Promise.resolve(describeChannel(channelId, cached));
      const hit = cache.get(channelId);
      if (hit !== undefined && (hit.value !== null || Date.now() - hit.at < NEGATIVE_TTL_MS)) {
        return Promise.resolve(hit.value);
      }
      const running = inflight.get(channelId);
      if (running !== undefined) return running;
      const task = fetchDescribe(channelId).finally(() => {
        inflight.delete(channelId);
      });
      inflight.set(channelId, task);
      return task;
    },
  };
}
