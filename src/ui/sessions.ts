import { randomBytes } from 'node:crypto';

/**
 * Bounded server-side store for search browser sessions.
 * Full search queries do not fit the 100-char `customId` budget, so
 * buttons carry a short session id + page cursor while the authority
 * (query params, channel binding, expiry) lives here. discord.js-free.
 */

export type StoredSearchQuery = {
  text?: string;
  authorId?: string;
  /** ISO string (JSON-safe); converted back to Date at use. */
  afterIso?: string;
  hasAttachment?: boolean;
  hasPoll?: boolean;
  deleted?: boolean | null;
};

export type SearchSession = {
  id: string;
  channelId: string;
  query: StoredSearchQuery;
  createdAt: number;
};

export type SessionStoreOptions = {
  now?: () => number;
  ttlMs?: number;
  max?: number;
  newId?: () => string;
};

const DEFAULT_TTL_MS = 15 * 60 * 1000; // Discord interaction token lifetime
const DEFAULT_MAX = 500;

export function createSearchSessionStore(opts: SessionStoreOptions = {}): {
  create(channelId: string, query: StoredSearchQuery): SearchSession;
  get(id: string, channelId: string): SearchSession | null;
  size(): number;
} {
  const now = opts.now ?? Date.now;
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const max = opts.max ?? DEFAULT_MAX;
  const newId = opts.newId ?? (() => randomBytes(4).toString('hex'));
  const sessions = new Map<string, SearchSession>();

  function prune(): void {
    const at = now();
    for (const [id, session] of sessions) {
      if (at - session.createdAt > ttlMs) sessions.delete(id);
    }
    while (sessions.size > max) {
      const oldest = sessions.keys().next();
      if (oldest.done === true) break;
      sessions.delete(oldest.value);
    }
  }

  return {
    create(channelId: string, query: StoredSearchQuery): SearchSession {
      prune();
      const session: SearchSession = { id: newId(), channelId, query, createdAt: now() };
      sessions.set(session.id, session);
      return session;
    },
    get(id: string, channelId: string): SearchSession | null {
      const session = sessions.get(id) ?? null;
      if (session === null) return null;
      if (session.channelId !== channelId || now() - session.createdAt > ttlMs) {
        sessions.delete(id);
        return null;
      }
      return session;
    },
    size(): number {
      prune();
      return sessions.size;
    },
  };
}

/** Process-wide singleton used by the search command/buttons. */
export const searchSessions = createSearchSessionStore();
