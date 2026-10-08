import { describe, expect, it } from 'vitest';
import { createMediaArchiver } from '../../src/services/mediaArchiver.js';
import type { MediaStorage } from '../../src/storage/types.js';

type Row = {
  rowId: number;
  messageId: string;
  attachmentId: string;
  url: string | null;
  filename: string;
  guildId: string | null;
  channelId: string | null;
};

function fakeStore(rows: (Row & { localPath: string | null })[]): {
  store: Parameters<typeof createMediaArchiver>[0]['store'];
  paths: Map<number, string>;
} {
  const paths = new Map<number, string>();
  return {
    paths,
    store: {
      listUnarchivedAttachments: (_limit: number) =>
        Promise.resolve(
          rows.filter((r) => r.localPath === null).map(({ localPath: _ignored, ...rest }) => rest),
        ),
      setAttachmentLocalPath: (rowId: number, key: string) => {
        paths.set(rowId, key);
        const row = rows.find((r) => r.rowId === rowId);
        if (row !== undefined) row.localPath = key;
        return Promise.resolve();
      },
    },
  };
}

function fakeStorage(): { storage: MediaStorage; keys: Map<string, Uint8Array> } {
  const keys = new Map<string, Uint8Array>();
  return {
    keys,
    storage: {
      put: (key: string, data: Uint8Array) => {
        keys.set(key, data);
        return Promise.resolve({ path: key, sizeBytes: data.byteLength, contentType: null });
      },
      get: (key: string) => Promise.resolve(keys.get(key) ?? null),
      exists: (key: string) => Promise.resolve(keys.has(key)),
      delete: (key: string) => {
        keys.delete(key);
        return Promise.resolve();
      },
    },
  };
}

function row(overrides: Partial<Row> = {}): Row & { localPath: string | null } {
  return {
    rowId: 1,
    messageId: 'm1',
    attachmentId: 'a1',
    url: 'https://cdn/x/pic.png',
    filename: 'pic.png',
    guildId: 'g1',
    channelId: 'c1',
    localPath: null,
    ...overrides,
  };
}

describe('media archiver', () => {
  it('downloads, stores under a scoped key, and writes the path back', async () => {
    const { store, paths } = fakeStore([row()]);
    const { storage, keys } = fakeStorage();
    let fetched = 0;
    const archiver = createMediaArchiver({
      store,
      storage,
      fetchFn: (_url: string | URL | Request): Promise<Response> => {
        fetched += 1;
        return Promise.resolve(new Response(new Uint8Array([1, 2, 3])));
      },
    });

    const summary = await archiver.runOnce();

    expect(summary).toEqual({ checked: 1, archived: 1, failed: 0 });
    expect(fetched).toBe(1);
    expect(paths.get(1)).toBe('g1/c1/m1/a1-pic.png');
    expect(keys.get('g1/c1/m1/a1-pic.png')).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('sanitizes filenames so keys cannot traverse', async () => {
    const { store } = fakeStore([row({ filename: '../../evil.png' })]);
    const { storage, keys } = fakeStorage();
    const archiver = createMediaArchiver({
      store,
      storage,
      fetchFn: (): Promise<Response> => Promise.resolve(new Response(new Uint8Array([9]))),
    });

    await archiver.runOnce();

    expect(keys.size).toBe(1);
    for (const key of keys.keys()) {
      expect(key.split('/')).not.toContain('..');
      expect(key).toContain('a1-');
    }
  });

  it('leaves 404s null and stops retrying after three attempts', async () => {
    const { store, paths } = fakeStore([row()]);
    const { storage } = fakeStorage();
    let fetched = 0;
    const archiver = createMediaArchiver({
      store,
      storage,
      fetchFn: (): Promise<Response> => {
        fetched += 1;
        return Promise.resolve(new Response('gone', { status: 404 }));
      },
    });

    for (let i = 0; i < 5; i += 1) {
      await archiver.runOnce();
    }

    expect(paths.has(1)).toBe(false);
    expect(fetched).toBe(3);
  });

  it('skips oversize bodies and null urls without crashing', async () => {
    const { store, paths } = fakeStore([
      row({ rowId: 1, url: 'https://cdn/x/big.bin' }),
      row({ rowId: 2, url: null }),
    ]);
    const { storage, keys } = fakeStorage();
    const archiver = createMediaArchiver({
      store,
      storage,
      maxBytes: 10,
      fetchFn: (): Promise<Response> =>
        Promise.resolve(
          new Response(new Uint8Array(11), {
            headers: { 'content-length': '11' },
          }),
        ),
    });

    const summary = await archiver.runOnce();

    expect(paths.size).toBe(0);
    expect(keys.size).toBe(0);
    expect(summary.failed).toBe(2);
  });
});
