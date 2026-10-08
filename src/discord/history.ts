import type { Collection, Message, Snowflake } from 'discord.js';

export type HistoryChannel = {
  id: string;
  messages: {
    fetch(options: { limit: number; before?: string }): Promise<Collection<Snowflake, Message>>;
  };
};

export const HISTORY_PAGE_SIZE = 100;

/** One newest-first page of channel history. Empty means exhausted. */
export async function fetchHistoryPage(
  channel: HistoryChannel,
  before?: string,
): Promise<Message[]> {
  const page =
    before === undefined
      ? await channel.messages.fetch({ limit: HISTORY_PAGE_SIZE })
      : await channel.messages.fetch({ limit: HISTORY_PAGE_SIZE, before });
  return [...page.values()];
}
