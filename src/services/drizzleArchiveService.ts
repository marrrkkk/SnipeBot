import type { Db } from '../database/connection.js';
import { DrizzleMessageRepository } from '../repositories/drizzleMessageRepository.js';
import type { MessageSnapshot } from '../domain/messageSnapshot.js';
import { increment } from '../observability/metrics.js';
import type { ArchiveResult, ArchiveService } from './archiveService.js';
import { logger } from '../utils/logger.js';

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export type DrizzleArchiveOptions = {
  /** Archive DM snapshots too (default false — privacy by design). */
  archiveDMs?: boolean;
};

/** Durable archive service. Every op is failure-isolated per call. */
export function createDrizzleArchiveService(
  db: Db,
  options?: DrizzleArchiveOptions,
): ArchiveService {
  const repo = new DrizzleMessageRepository(db);
  const archiveDMs = options?.archiveDMs ?? false;
  const wrap = (fn: () => Promise<void>): Promise<ArchiveResult> => {
    let result: Promise<void>;
    try {
      result = fn();
    } catch (err) {
      return Promise.resolve({ ok: false, error: toMessage(err) });
    }
    return result.then(
      (): ArchiveResult => ({ ok: true }),
      (err: unknown): ArchiveResult => ({ ok: false, error: toMessage(err) }),
    );
  };
  const saveIfAllowed = (snapshot: MessageSnapshot): Promise<void> => {
    if (snapshot.guildId === null && !archiveDMs) {
      logger.debug('Skipping DM snapshot (archiving disabled)', { id: snapshot.id });
      return Promise.resolve();
    }
    return repo.getPolicy(snapshot.guildId ?? '').then((policy) => {
      if (policy !== null && !policy.archivingEnabled) {
        logger.debug('Skipping guild-opted-out snapshot', {
          id: snapshot.id,
          guildId: snapshot.guildId,
        });
        return;
      }
      return repo.saveSnapshot(snapshot);
    });
  };
  return {
    ingestMessage: (snapshot) => {
      increment('messages.ingested');
      return wrap(() => saveIfAllowed(snapshot));
    },
    recordEdit: (snapshot) => {
      increment('messages.edited');
      return wrap(() => saveIfAllowed(snapshot));
    },
    recordDelete: (messageId, channelId, at) => {
      increment('messages.deleted');
      return wrap(() => repo.recordDeletion(messageId, channelId, at, 'single'));
    },
    recordDeleteBulk: (messageIds, channelId, at) => {
      increment('messages.deleted', messageIds.length);
      return wrap(() =>
        repo.recordDeletions(
          messageIds.map((messageId) => ({ messageId, channelId, at, kind: 'bulk' })),
        ),
      );
    },
    recordReactions: (messageId, reactions, at) => {
      increment('reactions.refreshed');
      return wrap(() => repo.replaceReactions(messageId, reactions, at));
    },
    refreshPoll: (snapshot) => {
      increment('polls.refreshed');
      return wrap(async () => {
        if (snapshot.poll === null) return;
        if ((await repo.countRevisions(snapshot.id)) === 0) {
          await saveIfAllowed(snapshot);
        } else {
          await repo.refreshPoll(snapshot.id, snapshot.poll.raw);
        }
      });
    },
    recordChannel: (info) => wrap(() => repo.upsertChannel(info)),
    removeChannel: (id) => wrap(() => repo.deleteChannel(id)),
    annotateDeletion: (messageId, attribution) =>
      wrap(() => repo.annotateDeletionEvents(messageId, attribution)),
  };
}
