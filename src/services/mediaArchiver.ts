import type { UnarchivedAttachment } from '../repositories/drizzleMessageRepository.js';
import type { MediaStorage } from '../storage/types.js';
import { increment, setGauge } from '../observability/metrics.js';
import { logger } from '../utils/logger.js';

/** Minimal store surface the worker needs (structurally satisfied by the repo). */
export type MediaArchiveStore = {
  listUnarchivedAttachments(limit: number): Promise<UnarchivedAttachment[]>;
  setAttachmentLocalPath(rowId: number, key: string): Promise<void>;
};

export type MediaArchiverOptions = {
  store: MediaArchiveStore;
  storage: MediaStorage;
  fetchFn?: typeof fetch;
  maxBytes?: number;
  failureLimit?: number;
  intervalMs?: number;
  batchSize?: number;
};

export type MediaRunSummary = { checked: number; archived: number; failed: number };

export type MediaArchiver = {
  start(): void;
  stop(): void;
  runOnce(): Promise<MediaRunSummary>;
};

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/\.{2,}/g, '_');
  return cleaned.slice(0, 100) === '' ? 'file' : cleaned.slice(0, 100);
}

/**
 * Poll worker: the attachments table is the durable queue (null local_path
 * = work). Zero hot-path coupling — handlers never wait for downloads.
 */
export function createMediaArchiver(options: MediaArchiverOptions): MediaArchiver {
  const {
    store,
    storage,
    fetchFn = fetch,
    maxBytes = 100_000_000,
    failureLimit = 3,
    intervalMs = 10_000,
    batchSize = 10,
  } = options;
  const failures = new Map<number, number>();
  let timer: NodeJS.Timeout | null = null;

  async function archiveOne(row: UnarchivedAttachment): Promise<boolean> {
    if (row.url === null) {
      logger.warn('Skipping attachment without URL', {
        messageId: row.messageId,
        attachmentId: row.attachmentId,
      });
      return false;
    }
    const res = await fetchFn(row.url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      throw new Error(`HTTP ${String(res.status)} for ${row.attachmentId}`);
    }
    const declared = res.headers.get('content-length');
    if (declared !== null && Number(declared) > maxBytes) {
      logger.warn('Skipping oversize attachment', {
        messageId: row.messageId,
        attachmentId: row.attachmentId,
        bytes: Number(declared),
      });
      return false;
    }
    const data = new Uint8Array(await res.arrayBuffer());
    if (data.byteLength > maxBytes) {
      logger.warn('Skipping oversize attachment body', {
        messageId: row.messageId,
        attachmentId: row.attachmentId,
      });
      return false;
    }
    const scope = row.guildId ?? 'dm';
    const channel = row.channelId ?? 'unknown';
    const key = `${scope}/${channel}/${row.messageId}/${row.attachmentId}-${sanitizeFilename(row.filename)}`;
    await storage.put(key, data, res.headers.get('content-type') ?? undefined);
    await store.setAttachmentLocalPath(row.rowId, key);
    return true;
  }

  async function runOnce(): Promise<MediaRunSummary> {
    const rows = await store.listUnarchivedAttachments(batchSize);
    let archived = 0;
    let failed = 0;
    for (const row of rows) {
      if ((failures.get(row.rowId) ?? 0) >= failureLimit) continue;
      try {
        if (await archiveOne(row)) {
          archived += 1;
        } else {
          failed += 1;
          failures.set(row.rowId, (failures.get(row.rowId) ?? 0) + 1);
        }
      } catch (err) {
        failed += 1;
        failures.set(row.rowId, (failures.get(row.rowId) ?? 0) + 1);
        logger.error(
          { err: String(err), messageId: row.messageId, attachmentId: row.attachmentId },
          'Attachment download failed',
        );
      }
    }
    increment('media.runs');
    increment('media.archived', archived);
    increment('media.failed', failed);
    setGauge('media.lastArchived', archived);
    return { checked: rows.length, archived, failed };
  }

  return {
    start(): void {
      if (timer !== null) return;
      timer = setInterval(() => {
        void runOnce().catch((err: unknown) => {
          logger.error({ err: String(err) }, 'Media worker tick failed');
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
