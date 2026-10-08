import { Events, type Client } from 'discord.js';
import { increment } from '../observability/metrics.js';
import { logger } from '../utils/logger.js';

/** Gateway lifecycle visibility: quiet enough to ignore, loud enough to diagnose. */
export function registerConnectionEvents(client: Client): void {
  client.on(Events.ShardDisconnect, () => {
    increment('gateway.disconnects');
    logger.warn('Gateway shard disconnected');
  });
  client.on(Events.ShardReconnecting, () => {
    increment('gateway.reconnects');
    logger.info('Gateway shard reconnecting');
  });
  client.on(Events.ShardResume, () => {
    increment('gateway.resumes');
    logger.info('Gateway shard resumed');
  });
}
