import type { ChatInputCommandInteraction } from 'discord.js';

/** Structural fakes for chat-input interactions (constructors are private). */
export function fakeChatInput(overrides: Record<string, unknown> = {}): {
  interaction: ChatInputCommandInteraction;
  replies: unknown[];
} {
  const replies: unknown[] = [];
  const base = {
    commandName: 'command',
    channelId: 'c1',
    guildId: 'g1',
    memberPermissions: { has: () => true },
    client: { users: { cache: new Map<string, { username: string }>() } },
    options: {
      getInteger: (_name: string): number | null => null,
      getBoolean: (_name: string): boolean | null => null,
    },
    reply: (args: unknown): Promise<void> => {
      replies.push(args);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { interaction: base as unknown as ChatInputCommandInteraction, replies };
}

/** First embed payload of a reply, decoded for assertions. */
export function replyEmbed(
  reply: unknown,
): { title?: string; description?: string; fields?: { name: string; value: string }[] } | null {
  const embeds = (reply as { embeds?: { toJSON: () => unknown }[] }).embeds;
  const json = embeds?.[0]?.toJSON() as
    { title?: unknown; description?: unknown; fields?: unknown } | undefined;
  if (json === undefined) return null;
  const out: {
    title?: string;
    description?: string;
    fields?: { name: string; value: string }[];
  } = {};
  if (typeof json.title === 'string') out.title = json.title;
  if (typeof json.description === 'string') out.description = json.description;
  if (Array.isArray(json.fields)) {
    out.fields = json.fields.map((field) => {
      const record = field as { name?: unknown; value?: unknown };
      return {
        name: typeof record.name === 'string' ? record.name : '',
        value: typeof record.value === 'string' ? record.value : '',
      };
    });
  }
  return out;
}

export function isEphemeral(reply: unknown): boolean {
  return (reply as { ephemeral?: unknown }).ephemeral === true;
}

/** Message flags of a reply payload, if any. */
export function replyFlags(reply: unknown): number | undefined {
  const flags = (reply as { flags?: unknown }).flags;
  return typeof flags === 'number' ? flags : undefined;
}

type ComponentJson = {
  type?: unknown;
  content?: unknown;
  components?: ComponentJson[];
};

/** Concatenated TextDisplay contents of a V2 container reply. */
export function replyV2Text(reply: unknown): string {
  const components = (reply as { components?: { toJSON: () => unknown }[] }).components;
  const out: string[] = [];
  const walk = (node: ComponentJson): void => {
    if (typeof node.content === 'string') out.push(node.content);
    for (const child of node.components ?? []) walk(child);
  };
  for (const component of components ?? []) walk(component.toJSON() as ComponentJson);
  return out.join('\n');
}

/** Raw customIds of every button in a V2 reply, in order. */
export function replyButtonIds(reply: unknown): string[] {
  return replyCustomIds(reply, 2);
}

/** Raw customIds of every select menu in a V2 reply, in order. */
export function replySelectIds(reply: unknown): string[] {
  return replyCustomIds(reply, 3);
}

function replyCustomIds(reply: unknown, type: number): string[] {
  const components = (reply as { components?: { toJSON: () => unknown }[] }).components;
  const out: string[] = [];
  const walk = (node: ComponentJson): void => {
    const record = node as ComponentJson & { custom_id?: unknown; disabled?: unknown };
    if (node.type === type && typeof record.custom_id === 'string') {
      out.push(`${record.custom_id}${record.disabled === true ? ' (disabled)' : ''}`);
    }
    for (const child of node.components ?? []) walk(child);
  };
  for (const component of components ?? []) walk(component.toJSON() as ComponentJson);
  return out;
}
