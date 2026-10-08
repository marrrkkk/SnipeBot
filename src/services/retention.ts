import type { RetentionPolicy } from '../repositories/drizzleMessageRepository.js';
import type { MediaStorage } from '../storage/types.js';
import { increment, setGauge } from '../observability/metrics.js';
import { logger } from '../utils/logger.js';

/** Minimal store surface the runner needs (structurally satisfied by the repo). */
export type RetentionStore = {
  listRetentionPolicies(): Promise<RetentionPolicy[]>;
  listActiveGuildIds(): Promise<(string | null)[]>;
  pruneRevisions(
    guildId: string | null,
    keep: number,
  ): Promise<{ revisions: number; files: string[] }>;
  expireMessages(
    guildId: string | null,
    olderThan: Date,
  ): Promise<{ messages: string[]; files: string[] }>;
  expireMedia(guildId: string | null, olderThan: Date): Promise<{ rows: number; files: string[] }>;
  listLocalPaths(): Promise<string[]>;
};

export type RetentionRunnerOptions = {
  store: RetentionStore;
  storage: MediaStorage;
  intervalMs?: number;
};

export type RetentionSummary = {
  guilds: number;
  revisionsPruned: number;
  messagesExpired: number;
  filesRemoved: number;
  orphansRemoved: number;
};

export type RetentionRunner = {
  start(): void;
  stop(): void;
  runOnce(): Promise<RetentionSummary>;
};

const ORPHAN_AGE_MS = 3_600_000;

/**
 * Scheduled retention sweeps. DB deletes land first and file unlinks follow
 * (a crash between them leaves orphans, which the orphan pass heals).
 */
export function createRetentionRunner(options: RetentionRunnerOptions): RetentionRunner {
  const { store, storage, intervalMs = 3_600_000 } = options;
  let timer: NodeJS.Timeout | null = null;

  async function removeFiles(keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      try {
        await storage.delete(key);
        removed += 1;
      } catch (err) {
        logger.warn('Retention file delete failed', { key, err: String(err) });
      }
    }
    return removed;
  }

  async function sweepOrphans(now: Date): Promise<number> {
    if (typeof storage.listEntries !== 'function') {
      logger.debug('Storage has no listing; skipping orphan sweep');
      return 0;
    }
    const entries = await storage.listEntries();
    const referenced = new Set(await store.listLocalPaths());
    let removed = 0;
    for (const entry of entries) {
      if (referenced.has(entry.key)) continue;
      if (now.getTime() - entry.mtimeMs < ORPHAN_AGE_MS) continue;
      try {
        await storage.delete(entry.key);
        removed += 1;
      } catch (err) {
        logger.warn('Orphan delete failed', { key: entry.key, err: String(err) });
      }
    }
    return removed;
  }

  async function runOnce(): Promise<RetentionSummary> {
    const now = new Date();
    const summary: RetentionSummary = {
      guilds: 0,
      revisionsPruned: 0,
      messagesExpired: 0,
      filesRemoved: 0,
      orphansRemoved: 0,
    };
    const daysAgo = (days: number): Date => new Date(now.getTime() - days * 86400_000);
    const policies = await store.listRetentionPolicies();
    const global = policies.find((p) => p.scope === 'global') ?? null;
    const guildIds = await store.listActiveGuildIds();
    for (const guildId of guildIds) {
      const scoped = guildId === null ? null : (policies.find((p) => p.scope === guildId) ?? null);
      // Per-field merge: a guild row overrides what it sets and inherits
      // the global baseline for the rest.
      const effective = {
        keepDays: scoped?.keepDays ?? global?.keepDays ?? null,
        keepRevisions: scoped?.keepRevisions ?? global?.keepRevisions ?? null,
        mediaKeepDays: scoped?.mediaKeepDays ?? global?.mediaKeepDays ?? null,
      };
      if (
        effective.keepDays === null &&
        effective.keepRevisions === null &&
        effective.mediaKeepDays === null
      ) {
        continue;
      }
      try {
        if (effective.keepRevisions !== null) {
          const pruned = await store.pruneRevisions(guildId, effective.keepRevisions);
          summary.revisionsPruned += pruned.revisions;
          summary.filesRemoved += await removeFiles(pruned.files);
        }
        if (effective.keepDays !== null) {
          const expired = await store.expireMessages(guildId, daysAgo(effective.keepDays));
          summary.messagesExpired += expired.messages.length;
          summary.filesRemoved += await removeFiles(expired.files);
        }
        if (effective.mediaKeepDays !== null) {
          const aged = await store.expireMedia(guildId, daysAgo(effective.mediaKeepDays));
          summary.filesRemoved += await removeFiles(aged.files);
        }
        summary.guilds += 1;
      } catch (err) {
        logger.error({ err: String(err), guildId }, 'Retention sweep failed for scope');
      }
    }
    try {
      summary.orphansRemoved += await sweepOrphans(now);
    } catch (err) {
      logger.error({ err: String(err) }, 'Orphan sweep failed');
    }
    increment('retention.runs');
    increment('retention.filesRemoved', summary.filesRemoved);
    setGauge('retention.lastFilesRemoved', summary.filesRemoved);
    return summary;
  }

  return {
    start(): void {
      if (timer !== null) return;
      timer = setInterval(() => {
        void runOnce().catch((err: unknown) => {
          logger.error({ err: String(err) }, 'Retention tick failed');
        });
      }, intervalMs);
      timer.unref();
    },
    stop(): void {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
    runOnce,
  };
}
