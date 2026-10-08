import { Collection } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { SnapshotError, toSnapshot } from '../../src/discord/mappers.js';
import { fakeMessage } from './helpers/fakes.js';

describe('toSnapshot', () => {
  it('maps a text message with attachments, embeds and a reply reference', () => {
    const attachments = new Collection([
      [
        'a1',
        {
          id: 'a1',
          name: 'pic.png',
          contentType: 'image/png',
          size: 1234,
          url: 'https://cdn/x/pic.png',
          proxyURL: 'https://media/y/pic.png',
          height: 100,
          width: 200,
          duration: null,
          waveform: null,
        },
      ],
    ]);
    const msg = fakeMessage({
      attachments,
      embeds: [{ toJSON: () => ({ title: 'E', description: 'D' }) }],
      reactions: {
        cache: new Collection([['👍', { emoji: { id: null, name: '👍' }, count: 3 }]]),
      },
      stickers: new Collection([['s1', { id: 's1' }]]),
      reference: { messageId: 'm0', channelId: 'c1', guildId: 'g1', type: 0 },
    });

    const snap = toSnapshot(msg);
    expect(snap.id).toBe('m1');
    expect(snap.guildId).toBe('g1');
    expect(snap.channelId).toBe('c1');
    expect(snap.threadId).toBeNull();
    expect(snap.author).toEqual({
      id: 'u1',
      username: 'alice',
      discriminator: '0',
      bot: false,
      webhookId: null,
    });
    expect(snap.content).toBe('hello world');
    expect(snap.attachments).toEqual([
      expect.objectContaining({ id: 'a1', filename: 'pic.png', sizeBytes: 1234 }),
    ]);
    expect(snap.embeds).toEqual([{ raw: { title: 'E', description: 'D' } }]);
    expect(snap.reactions).toEqual([{ emojiId: null, emojiName: '👍', count: 3 }]);
    expect(snap.stickerIds).toEqual(['s1']);
    expect(snap.reference).toEqual({
      messageId: 'm0',
      channelId: 'c1',
      guildId: 'g1',
      refType: 0,
    });
    expect(snap.snapshotOfForwarded).toBeNull();
  });

  it('maps a forwarded message snapshot and caps nesting depth at 1', () => {
    const nested = {
      id: 'm0',
      type: 0,
      content: 'original',
      createdTimestamp: 1700000000000,
      editedTimestamp: null,
      flags: { bitfield: 0 },
      author: { id: 'u9', username: 'bob', discriminator: '0', bot: false },
      attachments: new Collection(),
      embeds: [],
      stickers: new Collection([['s9', { id: 's9' }]]),
      components: [],
      // A nested snapshot inside a snapshot must be ignored (Discord caps at 1).
      messageSnapshots: [{ id: 'evil', content: 'nested' }],
    };
    const msg = fakeMessage({
      reference: { messageId: 'm0', channelId: 'c9', guildId: 'g1', type: 1 },
      messageSnapshots: new Collection([['m0', nested]]),
    });

    const snap = toSnapshot(msg);
    expect(snap.reference?.refType).toBe(1);
    expect(snap.snapshotOfForwarded?.content).toBe('original');
    expect(snap.snapshotOfForwarded?.author.username).toBe('bob');
    expect(snap.snapshotOfForwarded?.stickerIds).toEqual(['s9']);
    expect(snap.snapshotOfForwarded?.snapshotOfForwarded).toBeNull();
  });

  it('uses a sentinel author when the forwarded snapshot excludes it', () => {
    const nested = {
      id: 'm0',
      type: 0,
      content: 'original',
      createdTimestamp: 1700000000000,
      editedTimestamp: null,
      flags: { bitfield: 0 },
      attachments: new Collection(),
      embeds: [],
      components: [],
    };
    const msg = fakeMessage({ messageSnapshots: new Collection([['m0', nested]]) });

    const snap = toSnapshot(msg);
    expect(snap.snapshotOfForwarded?.author.id).toBe('unknown');
  });

  it('maps poll and voice-message fields', () => {
    const msg = fakeMessage({
      content: '',
      flags: { bitfield: 1 << 13 },
      poll: {
        toJSON: () => ({ question: { text: 'Q?' }, answers: [{ id: 1, text: 'yes' }] }),
      },
      attachments: new Collection([
        [
          'v1',
          {
            id: 'v1',
            name: 'voice-message.ogg',
            contentType: 'audio/ogg',
            size: 999,
            url: 'https://cdn/x/v.ogg',
            proxyURL: 'https://media/y/v.ogg',
            height: null,
            width: null,
            duration: 12.5,
            waveform: 'aGVsbG8=',
          },
        ],
      ]),
    });

    const snap = toSnapshot(msg);
    expect(snap.poll?.raw).toEqual({
      question: { text: 'Q?' },
      answers: [{ id: 1, text: 'yes' }],
    });
    expect(snap.attachments[0]).toMatchObject({ durationSecs: 12.5, waveform: 'aGVsbG8=' });
    expect(snap.flags).toBe(1 << 13);
  });

  it('preserves Components-V2 payloads and resolves thread channels', () => {
    const msg = fakeMessage({
      channelId: 't1',
      channel: { id: 't1', parentId: 'c1', isThread: () => true },
      flags: { bitfield: 1 << 15 },
      content: '',
      embeds: [],
      components: [{ toJSON: () => ({ type: 10, content: '# hi' }) }],
    });

    const snap = toSnapshot(msg);
    expect(snap.threadId).toBe('t1');
    expect(snap.channelId).toBe('c1');
    expect(snap.componentsRaw).toEqual([{ type: 10, content: '# hi' }]);
  });

  it('throws SnapshotError on partial-like input without identity', () => {
    expect(() => toSnapshot(fakeMessage({ author: null }))).toThrow(SnapshotError);
    expect(() => toSnapshot(fakeMessage({ id: undefined }))).toThrow(SnapshotError);
  });

  it('applies a thread resolution override', () => {
    const msg = fakeMessage({ channelId: 't1', channel: null });
    const snap = toSnapshot(msg, {
      channelId: 'c1',
      threadId: 't1',
      channel: { id: 't1', kind: 11, name: 'thr', parentId: 'c1' },
    });
    expect(snap.channelId).toBe('c1');
    expect(snap.threadId).toBe('t1');
    expect(snap.channel).toEqual({ id: 't1', kind: 11, name: 'thr', parentId: 'c1' });
  });

  it('builds channel snapshots from cached channels', () => {
    const msg = fakeMessage({
      channelId: 'c1',
      channel: { id: 'c1', parentId: null, isThread: () => false, type: 0, name: 'general' },
    });
    const snap = toSnapshot(msg);
    expect(snap.threadId).toBeNull();
    expect(snap.channel).toEqual({ id: 'c1', kind: 0, name: 'general', parentId: null });
  });

  it('leaves channel null when uncached and unresolved', () => {
    expect(toSnapshot(fakeMessage({ channelId: 'c1', channel: null })).channel).toBeNull();
  });
});
