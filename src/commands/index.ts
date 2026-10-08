import type { CommandModule, MessageContextModule } from './types.js';
import { backfillCommand } from './backfill.js';
import { userMessagesCommand, viewHistoryCommand } from './contextMenu.js';
import { editsCommand } from './edits.js';
import { pingCommand } from './ping.js';
import { searchCommand } from './search.js';
import { settingsCommand } from './settings.js';
import { snipeCommand } from './snipe.js';
import { statsCommand } from './stats.js';

export const commands: CommandModule[] = [
  pingCommand,
  snipeCommand,
  editsCommand,
  searchCommand,
  settingsCommand,
  backfillCommand,
  statsCommand,
];

export const commandMap: Map<string, CommandModule> = new Map(
  commands.map((c) => [c.data.name, c]),
);

export const messageContextCommands: MessageContextModule[] = [
  viewHistoryCommand,
  userMessagesCommand,
];

export const messageContextMap: Map<string, MessageContextModule> = new Map(
  messageContextCommands.map((c) => [c.data.name, c]),
);
