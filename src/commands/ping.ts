import { SlashCommandBuilder } from 'discord.js';
import type { CommandModule } from './types.js';

/** Minimal health-check command. Proves the command pipeline works. */
export const pingCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Health check: replies with Pong!'),
  execute: async (interaction) => {
    await interaction.reply({ content: 'Pong!', ephemeral: true });
  },
};
