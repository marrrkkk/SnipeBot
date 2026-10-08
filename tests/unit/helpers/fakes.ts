import { Collection, type Message } from 'discord.js';

// Message's constructor is private, so fixtures are structural fakes cast
// through unknown. Real Collection instances are used wherever production
// code iterates, keeping iteration semantics honest.
export function fakeMessage(overrides: Record<string, unknown> = {}): Message {
  const base = {
    id: 'm1',
    guildId: 'g1',
    channelId: 'c1',
    channel: null,
    author: { id: 'u1', username: 'alice', discriminator: '0', bot: false },
    webhookId: null,
    content: 'hello world',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    editedAt: null,
    type: 0,
    tts: false,
    pinned: false,
    flags: { bitfield: 0 },
    attachments: new Collection(),
    embeds: [],
    reactions: { cache: new Collection() },
    stickers: new Collection(),
    components: [],
    poll: null,
    reference: null,
    messageSnapshots: new Collection(),
    ...overrides,
  };
  return base as unknown as Message;
}
