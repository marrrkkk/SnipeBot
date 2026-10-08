import 'dotenv/config';
import { REST } from 'discord.js';
import { loadConfig } from '../config/env.js';
import { buildCommandBody, resolveDeployTarget } from '../commands/deployment.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.clientId === undefined) {
    throw new Error('DISCORD_CLIENT_ID is required for command deployment');
  }
  const body = buildCommandBody();
  const rest = new REST({ version: '10' }).setToken(config.discordToken);
  const target = resolveDeployTarget(config.clientId, config.guildId);

  if (target.kind === 'guild') {
    logger.info('Deploying guild commands', {
      count: body.length,
      guildId: target.guildId,
    });
  } else {
    logger.info('Deploying global commands', { count: body.length });
  }
  await rest.put(target.route as `/${string}`, { body });
  logger.info('Command deployment complete');
}

await main();
