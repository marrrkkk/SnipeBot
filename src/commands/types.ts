import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

export type ChatInputHandler = (interaction: ChatInputCommandInteraction) => Promise<void>;

export type AutocompleteHandler = (interaction: AutocompleteInteraction) => Promise<void>;

export type CommandModule = {
  /** SlashCommandBuilder JSON is used for REST deployment. */
  data: SlashCommandBuilder;
  execute: ChatInputHandler;
  autocomplete?: AutocompleteHandler;
};

export type MessageContextModule = {
  /** ContextMenuCommandBuilder JSON is used for REST deployment. */
  data: ContextMenuCommandBuilder;
  execute: (interaction: MessageContextMenuCommandInteraction) => Promise<void>;
};
