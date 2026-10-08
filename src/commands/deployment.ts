import { Routes } from 'discord.js';
import { commands, messageContextCommands } from './index.js';

export type DeployTarget =
  { kind: 'guild'; guildId: string; route: string } | { kind: 'global'; route: string };

/** Pure guild-vs-global deploy decision. Routes.* are pure string builders. */
export function resolveDeployTarget(clientId: string, guildId: string | undefined): DeployTarget {
  if (guildId !== undefined) {
    return {
      kind: 'guild',
      guildId,
      route: Routes.applicationGuildCommands(clientId, guildId),
    };
  }
  return { kind: 'global', route: Routes.applicationCommands(clientId) };
}

/** REST body for command registration (slash + message context). */
export function buildCommandBody(): unknown[] {
  return [
    ...commands.map((c) => c.data.toJSON()),
    ...messageContextCommands.map((c) => c.data.toJSON()),
  ];
}
