import { Client, GatewayIntentBits, Options, Partials } from 'discord.js';

/**
 * Minimal intents for the archive use-case. See docs/discord.md for why each
 * is required.
 * - Guilds: channels, threads, roles, interactions routing
 * - GuildMessages: MESSAGE_CREATE/UPDATE/DELETE(+BULK) events
 * - MessageContent (privileged): content/attachments/embeds/components/poll
 *   fields, without which snapshots would be empty shells.
 * - GuildMessageReactions (standard): reaction add/remove events keep the
 *   point-in-time reaction set fresh (Phase 8).
 * - GuildMessagePolls (standard): poll vote events keep results live
 *   (Phase 9). All minimal intents are now enabled; nothing further planned.
 */
export const REQUIRED_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessagePolls,
] as const;

export function createClient(): Client {
  const client = new Client({
    intents: [...REQUIRED_INTENTS],
    // Receive events even when the object is not cached; handlers must
    // tolerate partials (fetch or record id-only deletion markers).
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    // Keep the operational cache small: the DB is the durable archive,
    // discord.js cache is sweepable. See docs/architecture.md.
    sweepers: {
      ...Options.DefaultSweeperSettings,
      messages: { interval: 3600, lifetime: 1800 },
    },
  });
  return client;
}
