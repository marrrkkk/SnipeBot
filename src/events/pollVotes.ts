import type { PollAnswer, PartialPollAnswer } from 'discord.js';
import { Events, type Client } from 'discord.js';
import { SnapshotError, toSnapshot } from '../discord/mappers.js';
import { resolveFullMessage } from '../discord/messages.js';
import type { ArchiveService } from '../services/archiveService.js';
import { createCoalescer, type CoalesceFn } from '../utils/coalesce.js';
import { logger } from '../utils/logger.js';

async function handleVote(
  answer: PollAnswer | PartialPollAnswer,
  service: ArchiveService,
  event: string,
): Promise<void> {
  try {
    const full = await resolveFullMessage(answer.poll.message, 'vote');
    if (full === null) return;
    const snapshot = toSnapshot(full);
    if (snapshot.poll === null) {
      logger.debug('Skipping vote on poll-less message', { id: snapshot.id });
      return;
    }
    const result = await service.refreshPoll(snapshot);
    if (!result.ok) {
      logger.error({ error: result.error, id: snapshot.id }, 'Archive poll failed');
    }
  } catch (err) {
    if (err instanceof SnapshotError) {
      logger.warn('Skipping unsnapshottable vote', { reason: err.message });
      return;
    }
    logger.error({ err: String(err) }, `${event} handling failed`);
  }
}

/**
 * Keep poll results live. Votes never append revisions — counts are
 * current-state data refreshed in place. Thin by design.
 * Refreshes coalesce per message (default 5s trailing window).
 */
const defaultCoalescer = createCoalescer(5000);

function voteKey(answer: PollAnswer | PartialPollAnswer): string | null {
  const message = answer.poll.message as unknown as { id?: unknown };
  return typeof message.id === 'string' ? message.id : null;
}

function schedule(
  answer: PollAnswer | PartialPollAnswer,
  service: ArchiveService,
  event: string,
  coalesce: CoalesceFn,
): void {
  const key = voteKey(answer);
  if (key === null) {
    void handleVote(answer, service, event);
    return;
  }
  coalesce(key, () => handleVote(answer, service, event));
}

export function registerMessagePollVoteAdd(
  client: Client,
  service: ArchiveService,
  coalesce: CoalesceFn = defaultCoalescer,
): void {
  client.on(Events.MessagePollVoteAdd, (answer) => {
    schedule(answer, service, 'messagePollVoteAdd', coalesce);
  });
}

export function registerMessagePollVoteRemove(
  client: Client,
  service: ArchiveService,
  coalesce: CoalesceFn = defaultCoalescer,
): void {
  client.on(Events.MessagePollVoteRemove, (answer) => {
    schedule(answer, service, 'messagePollVoteRemove', coalesce);
  });
}
