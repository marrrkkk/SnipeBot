import type { Client } from 'discord.js';
import type { ArchiveService } from '../services/archiveService.js';
import { createThreadResolver } from '../discord/threads.js';
import { registerConnectionEvents } from './connection.js';
import { registerInteractionCreate, registerReady } from './ready.js';
import { registerMessageCreate } from './messageCreate.js';
import { registerMessageDelete, registerMessageDeleteBulk } from './messageDelete.js';
import { registerMessageUpdate } from './messageUpdate.js';
import {
  registerMessageReactionAdd,
  registerMessageReactionRemove,
  registerMessageReactionRemoveAll,
  registerMessageReactionRemoveEmoji,
} from './reactions.js';
import { registerMessagePollVoteAdd, registerMessagePollVoteRemove } from './pollVotes.js';

import {
  registerThreadCreate,
  registerThreadDelete,
  registerThreadUpdate,
} from './threadEvents.js';

/** Wire every event handler. Handlers stay thin; logic lives in services. */
export function registerEvents(client: Client, service: ArchiveService): void {
  registerReady(client);
  registerConnectionEvents(client);
  registerInteractionCreate(client);
  const threads = createThreadResolver(client);
  registerMessageCreate(client, service, threads);
  registerMessageUpdate(client, service, threads);
  registerMessageDelete(client, service);
  registerMessageDeleteBulk(client, service);
  registerMessageReactionAdd(client, service);
  registerMessageReactionRemove(client, service);
  registerMessageReactionRemoveEmoji(client, service);
  registerMessageReactionRemoveAll(client, service);
  registerMessagePollVoteAdd(client, service);
  registerMessagePollVoteRemove(client, service);
  registerThreadCreate(client, service);
  registerThreadUpdate(client, service);
  registerThreadDelete(client, service);
  // Later: guildAuditLogEntryCreate.
}
