import type { StringSelectMenuInteraction } from 'discord.js';
import { handleEditsSelect } from '../commands/edits.js';
import { handleSearchSelect } from '../commands/search.js';
import { handleSnipeSelect } from '../commands/snipe.js';
import { increment } from '../observability/metrics.js';
import { logger } from '../utils/logger.js';

const routes: Record<
  string,
  (interaction: StringSelectMenuInteraction, parts: string[], value: string) => Promise<void>
> = {
  snb: (interaction, parts, value) => handleSnipeSelect(interaction, parts, value),
  edb: (interaction, parts, value) => handleEditsSelect(interaction, parts, value),
  seb: (interaction, parts, value) => handleSearchSelect(interaction, parts, value),
};

/**
 * Stable customId routing for jump selects: `<prefix>:jp:<cursor…>`,
 * option value carries the picked id. Unknown prefixes are ignored.
 */
export async function routeSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const [prefix, ...parts] = interaction.customId.split(':');
  const route = prefix === undefined ? undefined : routes[prefix];
  const value = interaction.values[0];
  if (route === undefined || value === undefined) {
    logger.debug(`Unhandled select: ${interaction.customId}`);
    return;
  }
  increment('selects.chosen');
  await route(interaction, parts, value);
}
