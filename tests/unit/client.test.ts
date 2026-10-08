import { GatewayIntentBits } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { createClient, REQUIRED_INTENTS } from '../../src/discord/client.js';

describe('client intents', () => {
  it('requests exactly the documented minimal set', () => {
    expect([...REQUIRED_INTENTS]).toEqual([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessagePolls,
    ]);
  });

  it('creates a client carrying those intents', () => {
    const client = createClient();
    try {
      for (const intent of REQUIRED_INTENTS) {
        expect(client.options.intents.has(intent)).toBe(true);
      }
    } finally {
      void client.destroy();
    }
  });
});
