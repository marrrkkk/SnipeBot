import type { MessageSnapshot, ReactionSnapshot } from '../domain/messageSnapshot.js';
import type { DeletionAttribution } from '../domain/messageSnapshot.js';
import type { ChannelInfo } from '../repositories/drizzleMessageRepository.js';

/**
 * Archive service boundary. Drizzle implementation in
 * `drizzleArchiveService.ts`; stub in `stubArchiveService.ts` for pre-DB use.
 */
export type ArchiveResult = { ok: true } | { ok: false; error: string };

export type DeleteKind = 'single' | 'bulk';

export type ArchiveService = {
  ingestMessage(snapshot: MessageSnapshot): Promise<ArchiveResult>;
  recordEdit(snapshot: MessageSnapshot): Promise<ArchiveResult>;
  recordDelete(messageId: string, channelId: string | null, at: Date): Promise<ArchiveResult>;
  recordDeleteBulk(
    messageIds: string[],
    channelId: string | null,
    at: Date,
  ): Promise<ArchiveResult>;
  recordReactions(
    messageId: string,
    reactions: ReactionSnapshot[],
    at: Date,
  ): Promise<ArchiveResult>;
  refreshPoll(snapshot: MessageSnapshot): Promise<ArchiveResult>;
  recordChannel(info: ChannelInfo): Promise<ArchiveResult>;
  removeChannel(id: string): Promise<ArchiveResult>;
  annotateDeletion(messageId: string, attribution: DeletionAttribution): Promise<ArchiveResult>;
};
