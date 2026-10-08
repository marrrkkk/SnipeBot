import { ButtonStyle, MessageFlags } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { toSnapshot } from '../../src/discord/mappers.js';
import type { MessageSnapshot } from '../../src/domain/messageSnapshot.js';
import {
  backAction,
  clampPage,
  closeAction,
  createBrowserState,
  detailAction,
  pageAction,
  pageSlice,
  parseBrowserAction,
  rangeText,
  totalPages,
} from '../../src/ui/browser.js';
import {
  detailNavAction,
  jumpBulkAction,
  jumpToAction,
  listPageAction,
  renderBrowserPage,
  renderBulkGroupPage,
  renderBulkGroupsPage,
  renderClosed,
  renderDenied,
  renderEmpty,
  renderError,
  renderExpired,
  renderGone,
  renderSnipeDetail,
  SNIPE_ACCENT,
} from '../../src/ui/renderers/snipeBrowserV2.js';
import {
  jumpSelectRow,
  renderDetailPage,
  renderEphemeralState,
  renderListPage,
  renderSectionPage,
  renderStatePage,
} from '../../src/ui/renderers/browserShell.js';
import {
  excerptText,
  isRecoverableSnapshot,
  toBrowserViewModel,
  toMessageViewModel,
  toRevisionViewModel,
  toSearchHitViewModel,
  type BulkGroupViewModel,
} from '../../src/ui/viewModels.js';
import type { SearchHit } from '../../src/repositories/drizzleMessageRepository.js';
import { fakeMessage } from './helpers/fakes.js';
import {
  isEphemeral,
  replyButtonIds,
  replySelectIds,
  replyV2Text,
} from './helpers/interactions.js';

const V2 = MessageFlags.IsComponentsV2;

function snap(id: string, content: string): MessageSnapshot {
  return toSnapshot(fakeMessage({ id, content }));
}

function tree(reply: unknown): { type: number; components: { type: number }[] } {
  const components = (reply as { components?: { toJSON: () => unknown }[] }).components;
  const json = components?.[0]?.toJSON() as { type: number; components: { type: number }[] };
  return json;
}

function allText(reply: unknown): string {
  const json = tree(reply);
  return JSON.stringify(json);
}

/** Raw component JSON of the first container, for type assertions. */
function containerJson(reply: unknown): { type: number; components: { type: number }[] } {
  return tree(reply);
}

describe('view models', () => {
  it('maps snapshots without discord.js leakage', () => {
    const vm = toMessageViewModel(snap('m1', 'hello'), {
      channelName: '#general',
      avatarUrl: 'https://cdn/avatar.png',
    });
    expect(vm.id).toBe('m1');
    expect(vm.author.name).toBe('alice');
    expect(vm.channelName).toBe('#general');
    expect(vm.content).toBe('hello');
    expect(vm.status).toBe('deleted');
    expect(vm.revisionCount).toBeNull();
    expect(vm.avatarUrl).toBe('https://cdn/avatar.png');
    expect(vm.attachments).toEqual([]);
    // No builder instances cross the boundary: plain data only.
    expect(JSON.stringify(vm)).toContain('alice');
  });

  it('keeps attachment CDN fields for galleries', () => {
    const withFile = toSnapshot(
      fakeMessage({
        id: 'm1',
        content: '',
        attachments: [
          {
            id: 'a1',
            name: 'pic.png',
            contentType: 'image/png',
            size: 42,
            url: 'https://cdn/x/pic.png',
            proxyURL: 'https://media/y/pic.png',
            height: 10,
            width: 10,
            duration: null,
            waveform: null,
          },
        ],
      }),
    );
    const vm = toMessageViewModel(withFile);
    expect(vm.attachments[0]).toMatchObject({
      filename: 'pic.png',
      contentType: 'image/png',
      url: 'https://cdn/x/pic.png',
      proxyUrl: 'https://media/y/pic.png',
    });
  });

  it('flags recoverable substance (text, attachments, embeds, poll, forwards)', () => {
    expect(isRecoverableSnapshot(snap('m1', 'x'))).toBe(true);
    expect(isRecoverableSnapshot(snap('m2', '   '))).toBe(false);
  });

  it('builds browser view models with range text', () => {
    const items = [toMessageViewModel(snap('m1', 'a')), toMessageViewModel(snap('m2', 'b'))];
    const vm = toBrowserViewModel(
      items,
      12,
      { channelId: 'c1', channelName: '#g', page: 1, pageSize: 5 },
      3,
      '1–5 of 12',
    );
    expect(vm.totalResults).toBe(12);
    expect(vm.rangeText).toBe('1–5 of 12');
  });

  it('excerpts text with placeholder and ellipsis', () => {
    expect(excerptText('   ')).toBe('*no text content*');
    expect(excerptText('x'.repeat(400), 300).endsWith('…')).toBe(true);
    expect(excerptText('short')).toBe('short');
  });

  it('maps revisions and search hits', () => {
    const revision = toRevisionViewModel('v2', new Date(), new Date(), 2, 3);
    expect(revision.position).toBe(2);
    expect(revision.total).toBe(3);
    const hit: SearchHit = {
      messageId: 'm1',
      channelId: 'c1',
      authorId: 'u1',
      content: 'docker guide',
      revNo: 1,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      editedAt: null,
      deletedAt: new Date(),
      rank: -1,
    };
    const vm = toSearchHitViewModel(hit, 'alice', '<#c1>');
    expect(vm.deleted).toBe(true);
    expect(vm.edited).toBe(false);
    expect(vm.excerpt).toBe('docker guide');
  });
});

describe('browser state', () => {
  it('paginates without a storage limit (archive ≠ query ≠ page)', () => {
    expect(totalPages(500000, 5)).toBe(100000);
    expect(totalPages(0, 5)).toBe(1);
    expect(clampPage(99, 3)).toBe(3);
    expect(clampPage(0, 3)).toBe(1);
    expect(rangeText(1, 5, 137)).toBe('1–5 of 137');
    expect(rangeText(1, 5, 0)).toBe('0 of 0');
    expect(pageSlice([1, 2, 3, 4, 5, 6], 2, 5)).toEqual([6]);
    const state = createBrowserState('c1', 137, 1, 5);
    expect(state.pageSize).toBe(5);
    expect(createBrowserState('c1', 10, 1, 500).pageSize).toBe(10);
  });

  it('round-trips short customIds within the 100-char budget', () => {
    for (const id of [
      pageAction(3),
      detailAction('1234567890123456789', 2),
      backAction(1),
      closeAction(),
      jumpToAction(2),
      jumpBulkAction(1),
      detailNavAction(4),
      listPageAction(3),
    ]) {
      expect(id.length).toBeLessThanOrEqual(100);
    }
    expect(parseBrowserAction(['pg', '2'])).toEqual({ kind: 'page', page: 2 });
    expect(parseBrowserAction(['dt', 'm1', '2'])).toEqual({
      kind: 'detail',
      messageId: 'm1',
      page: 2,
    });
    expect(parseBrowserAction(['bk', '1'])).toEqual({ kind: 'back', page: 1 });
    expect(parseBrowserAction(['cl'])).toEqual({ kind: 'close' });
    expect(parseBrowserAction(['pg', '0'])).toBeNull();
    expect(parseBrowserAction(['nope'])).toBeNull();
  });
});

describe('browser shell', () => {
  it('renders list pages with nav + one jump select (no detail buttons)', () => {
    const reply = renderListPage({
      title: 'Test',
      range: '1–2 of 2',
      rows: ['row one', 'row two'],
      page: 1,
      totalPages: 2,
      prevId: 't:pg:0',
      nextId: 't:pg:2',
      jump: {
        customId: 't:jp:1',
        placeholder: 'Jump…',
        options: [
          { label: '#1 a', value: 'a' },
          { label: '#2 b', value: 'b' },
        ],
      },
      closeId: 't:cl',
    });
    expect((reply as { flags: number }).flags).toBe(V2);
    expect(replyV2Text(reply)).toContain('row one');
    const json = allText(reply);
    expect(json).toContain('"custom_id":"t:jp:1"');
    expect(json).toContain('"type":3');
    // Exactly 3 buttons: Previous, Next, Close.
    expect(replyButtonIds(reply)).toEqual(['t:pg:0 (disabled)', 't:pg:2', 't:cl']);
    expect(replySelectIds(reply)).toEqual(['t:jp:1']);
  });

  it('omits the select when there is nothing to pick', () => {
    expect(jumpSelectRow({ customId: 't:jp:1', placeholder: 'Jump…', options: [] })).toBeNull();
  });

  it('renders section cards with thumbnail, gallery, accent and one row', () => {
    const reply = renderSectionPage({
      accent: SNIPE_ACCENT,
      title: 'alice',
      meta: '#general · now',
      avatarUrl: 'https://cdn/avatar.png',
      body: 'hello',
      galleryUrls: ['https://cdn/pic.png'],
      facts: 'Attachments: 1',
      buttons: [{ id: 't:cl', label: 'Close', style: ButtonStyle.Danger }],
    });
    const json = allText(reply);
    expect(json).toContain('"type":9'); // Section
    expect(json).toContain('"type":11'); // Thumbnail
    expect(json).toContain('https://cdn/avatar.png');
    expect(json).toContain('"type":12'); // MediaGallery
    expect(json).toContain(`"accent_color":${String(SNIPE_ACCENT)}`);
    expect(replyButtonIds(reply)).toEqual(['t:cl']);
  });

  it('renders section cards without thumbnail or gallery', () => {
    const reply = renderSectionPage({
      title: 'alice',
      meta: 'meta',
      body: 'body text',
      facts: 'facts',
      buttons: [{ id: 't:bk:1', label: '◀ Back', style: ButtonStyle.Secondary }],
    });
    const json = allText(reply);
    expect(json).not.toContain('"type":9');
    expect(json).not.toContain('"type":12');
    expect(replyV2Text(reply)).toContain('body text');
  });

  it('renders generic detail pages with a single button row', () => {
    const reply = renderDetailPage({
      heading: 'H',
      meta: 'meta',
      body: 'body text',
      facts: 'facts',
      extras: ['extra'],
      buttons: [
        { id: 't:bk:1', label: '◀ Back', style: ButtonStyle.Secondary },
        { id: 't:cl', label: 'Close', style: ButtonStyle.Danger },
      ],
    });
    expect(replyV2Text(reply)).toContain('body text');
    expect(replyV2Text(reply)).toContain('extra');
    expect(replyButtonIds(reply)).toEqual(['t:bk:1', 't:cl']);
  });

  it('renders public and ephemeral state cards', () => {
    expect(replyV2Text(renderStatePage('T', 'b'))).toContain('b');
    expect(isEphemeral(renderEphemeralState('T', 'b'))).toBe(true);
  });
});

describe('V2 snipe renderer', () => {
  function browserReply(page = 1): unknown {
    const items = [
      toMessageViewModel(snap('m1', 'first')),
      toMessageViewModel(snap('m2', 'second')),
    ];
    return renderBrowserPage({
      title: '🗑 Deleted Messages',
      totalResults: 12,
      page,
      pageSize: 5,
      totalPages: 3,
      rangeText: rangeText(page, 5, 12),
      items,
    });
  }

  it('emits IsComponentsV2 containers, never embeds', () => {
    const reply = browserReply() as { flags: number; embeds?: unknown };
    expect(reply.flags).toBe(V2);
    expect(reply.embeds).toBeUndefined();
    const root = containerJson(reply);
    expect(root.type).toBe(17); // Container
    const kinds = root.components.map((c) => c.type);
    expect(kinds).toContain(10); // TextDisplay
    expect(kinds).toContain(1); // ActionRow
    expect(replySelectIds(reply)).toEqual(['snb:jp:1']); // jump select
    expect(allText(reply)).toContain('first');
  });

  it('lists navigate with Previous/Next/Close plus a jump select', () => {
    const ids = replyButtonIds(browserReply(1));
    expect(ids).toEqual(['snb:pg:0 (disabled)', 'snb:pg:2', 'snb:cl']);
    expect(allText(browserReply(1))).toContain('"custom_id":"snb:jp:1"');
  });

  it('renders detail cards with Older/Newer/List/Close in one row', () => {
    const reply = renderSnipeDetail(
      toMessageViewModel(snap('m1', 'body'), {
        revisionCount: 2,
        avatarUrl: 'https://cdn/avatar.png',
      }),
      2,
      5,
    );
    expect((reply as { flags: number }).flags).toBe(V2);
    expect(allText(reply)).toContain('#2 of 5');
    expect(allText(reply)).toContain('Edit history: 2 revisions');
    expect(allText(reply)).toContain('https://cdn/avatar.png');
    expect(replyButtonIds(reply)).toEqual(['snb:np:3', 'snb:np:1', 'snb:pg:1', 'snb:cl']);
  });

  it('disables Older at the oldest and Newer at the newest', () => {
    expect(replyButtonIds(renderSnipeDetail(toMessageViewModel(snap('m1', 'x')), 1, 3))).toEqual([
      'snb:np:2',
      'snb:np:0 (disabled)',
      'snb:pg:1',
      'snb:cl',
    ]);
    expect(replyButtonIds(renderSnipeDetail(toMessageViewModel(snap('m1', 'x')), 3, 3))).toEqual([
      'snb:np:4 (disabled)',
      'snb:np:2',
      'snb:pg:1',
      'snb:cl',
    ]);
  });

  it('renders galleries for image attachments only', () => {
    const withImage = toSnapshot(
      fakeMessage({
        id: 'm1',
        content: 'look',
        attachments: [
          {
            id: 'a1',
            name: 'pic.png',
            contentType: 'image/png',
            size: 10,
            url: 'https://cdn/x/pic.png',
            proxyURL: 'https://media/y/pic.png',
            height: 1,
            width: 1,
            duration: null,
            waveform: null,
          },
          {
            id: 'a2',
            name: 'notes.txt',
            contentType: 'text/plain',
            size: 10,
            url: 'https://cdn/x/notes.txt',
            proxyURL: 'https://media/y/notes.txt',
            height: null,
            width: null,
            duration: null,
            waveform: null,
          },
        ],
      }),
    );
    const reply = renderSnipeDetail(toMessageViewModel(withImage), 1, 1);
    const json = allText(reply);
    expect(json).toContain('"type":12');
    expect(json).toContain('https://media/y/pic.png');
    expect(json).not.toContain('notes.txt-picture');
    expect(replyV2Text(reply)).toContain('pic.png');
    expect(replyV2Text(reply)).toContain('notes.txt');
  });

  it('covers empty/denied/expired/closed/error/gone states', () => {
    expect(allText(renderEmpty())).toContain('Nothing to snipe');
    expect(isEphemeral(renderDenied('nope'))).toBe(true);
    expect(allText(renderDenied('nope'))).toContain('nope');
    expect(allText(renderExpired())).toContain('expired');
    expect(allText(renderClosed())).toContain('closed');
    expect(isEphemeral(renderError())).toBe(true);
    expect(isEphemeral(renderGone())).toBe(true);
  });
});

describe('bulk renderers', () => {
  function group(position: number, totalGroups: number, members: string[]): BulkGroupViewModel {
    return {
      position,
      totalGroups,
      observedAt: new Date('2026-05-01T00:00:00.000Z'),
      members: members.map((content, i) => toMessageViewModel(snap(`g${String(i)}`, content))),
      totalMembers: members.length,
    };
  }

  it('renders the groups list with a jump select', () => {
    const reply = renderBulkGroupsPage([group(1, 2, ['aaa']), group(2, 2, ['bbb'])], 1, 5, 2, 1);
    expect((reply as { flags: number }).flags).toBe(V2);
    expect(allText(reply)).toContain('Bulk Deletions');
    expect(allText(reply)).toContain('aaa');
    expect(allText(reply)).toContain('"custom_id":"snb:jb:1"');
    expect(replyButtonIds(reply)).toEqual(['snb:bg:0 (disabled)', 'snb:bg:2 (disabled)', 'snb:cl']);
    expect(replySelectIds(reply)).toEqual(['snb:jb:1']);
  });

  it('renders group detail with group navigation', () => {
    const reply = renderBulkGroupPage(group(2, 3, ['member one', 'member two']), 1);
    expect(allText(reply)).toContain('member one');
    expect(allText(reply)).toContain('group 2 of 3');
    expect(replyButtonIds(reply)).toEqual(['snb:bd:1:1', 'snb:bd:3:1', 'snb:bg:1', 'snb:cl']);
  });

  it('disables group nav at the ends', () => {
    const reply = renderBulkGroupPage(group(1, 1, ['solo']), 1);
    expect(replyButtonIds(reply)).toEqual([
      'snb:bd:0:1 (disabled)',
      'snb:bd:2:1 (disabled)',
      'snb:bg:1',
      'snb:cl',
    ]);
  });
});
