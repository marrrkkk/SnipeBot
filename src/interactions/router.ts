import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Interaction,
  MessageContextMenuCommandInteraction,
} from 'discord.js';
import { commandMap, messageContextMap } from '../commands/index.js';
import { increment } from '../observability/metrics.js';
import { logger } from '../utils/logger.js';
import { routeButton } from './buttons.js';
import { routeSelectMenu } from './selects.js';

async function handleChatInput(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = commandMap.get(interaction.commandName);
  if (command === undefined) {
    increment('commands.unknown');
    logger.warn(`Unknown command: ${interaction.commandName}`);
    await interaction.reply({
      content: 'Unknown command.',
      ephemeral: true,
    });
    return;
  }
  increment(`commands.${command.data.name}`);
  await command.execute(interaction);
}

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const command = commandMap.get(interaction.commandName);
  if (command?.autocomplete === undefined) return;
  await command.autocomplete(interaction);
}

async function handleMessageContext(
  interaction: MessageContextMenuCommandInteraction,
): Promise<void> {
  const command = messageContextMap.get(interaction.commandName);
  if (command === undefined) {
    increment('commands.unknown');
    logger.warn(`Unknown command: ${interaction.commandName}`);
    await interaction.reply({
      content: 'Unknown command.',
      ephemeral: true,
    });
    return;
  }
  increment(`commands.${command.data.name}`);
  await command.execute(interaction);
}

/** Route interactions to modular handlers. Never a giant if-chain here. */
export async function routeInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      await handleChatInput(interaction);
      return;
    }
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
      return;
    }
    if (interaction.isMessageContextMenuCommand()) {
      await handleMessageContext(interaction);
      return;
    }
    if (interaction.isButton()) {
      await routeButton(interaction);
      return;
    }
    if (interaction.isStringSelectMenu()) {
      await routeSelectMenu(interaction);
      return;
    }
    // User context commands, other selects, modals: explicitly ignore (debug)
    // until routed modules exist.
    if (
      interaction.isUserContextMenuCommand() ||
      interaction.isAnySelectMenu() ||
      interaction.isModalSubmit()
    ) {
      logger.debug(`Unhandled interaction type: ${String(interaction.type)}`);
    }
  } catch (err) {
    increment('interactions.errors');
    logger.error(
      { err: String(err), command: interaction.isCommand() ? interaction.commandName : 'n/a' },
      'Interaction handling failed',
    );
    // One failed interaction must not crash the process; reply ephemerally
    // if still possible.
    try {
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'Something went wrong handling that command.',
          ephemeral: true,
        });
      }
    } catch {
      // reply itself failed; already logged above
    }
  }
}
