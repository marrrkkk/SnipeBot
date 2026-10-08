import type { Client } from 'discord.js';
import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { routeInteraction } from '../interactions/router.js';

export function registerReady(client: Client): void {
  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.tag}`);
  });
}

export function registerInteractionCreate(client: Client): void {
  client.on(Events.InteractionCreate, (interaction) => {
    void routeInteraction(interaction);
  });
}
