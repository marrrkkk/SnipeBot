import type { ButtonInteraction } from 'discord.js';
import { handleEditsButton } from '../commands/edits.js';
import { handleSearchButton } from '../commands/search.js';
import { handleSnipeButton } from '../commands/snipe.js';
import { increment } from '../observability/metrics.js';
import { logger } from '../utils/logger.js';

const routes: Record<string, (interaction: ButtonInteraction, parts: string[]) => Promise<void>> = {
  snb: (interaction, parts) => handleSnipeButton(interaction, parts),
  edb: (interaction, parts) => handleEditsButton(interaction, parts),
  seb: (interaction, parts) => handleSearchButton(interaction, parts),
};

/**
 * Stable customId routing: `<prefix>:<action>:<args…>`, validated per route.
 * Unknown prefixes are ignored (other features/bots may own components).
 */
export async function routeButton(interaction: ButtonInteraction): Promise<void> {
  const [prefix, ...parts] = interaction.customId.split(':');
  const route = prefix === undefined ? undefined : routes[prefix];
  if (route === undefined) {
    logger.debug(`Unhandled button: ${interaction.customId}`);
    return;
  }
  increment('buttons.pressed');
  await route(interaction, parts);
}
