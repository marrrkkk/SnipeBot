import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LocalMediaStorage } from '../../src/storage/localStorage.js';

describe('LocalMediaStorage', () => {
  it('round-trips put/get/exists/delete', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'snipebot-'));
    try {
      const store = new LocalMediaStorage(dir);
      expect(await store.exists('a/b.bin')).toBe(false);
      await store.put('a/b.bin', new Uint8Array([1, 2, 3]), 'application/octet-stream');
      expect(await store.exists('a/b.bin')).toBe(true);
      expect(await store.get('a/b.bin')).toEqual(new Uint8Array([1, 2, 3]));
      await store.delete('a/b.bin');
      expect(await store.exists('a/b.bin')).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects path traversal', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'snipebot-'));
    try {
      const store = new LocalMediaStorage(dir);
      await expect(store.put('../evil.bin', new Uint8Array([0]))).rejects.toThrow();
      await expect(store.put('a/../../evil.bin', new Uint8Array([0]))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('allows dots inside filenames', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'snipebot-'));
    try {
      const store = new LocalMediaStorage(dir);
      await store.put('g1/c1/m1/a1-a..png', new Uint8Array([1]));
      expect(await store.exists('g1/c1/m1/a1-a..png')).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('lists entries recursively with mtimes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'snipebot-'));
    try {
      const store = new LocalMediaStorage(dir);
      expect(await store.listEntries()).toEqual([]);
      await store.put('g1/c1/m1/a1.png', new Uint8Array([1]));
      await store.put('g1/c1/m1/a2.png', new Uint8Array([2]));
      const entries = await store.listEntries();
      expect(entries.map((e) => e.key).sort()).toEqual(['g1/c1/m1/a1.png', 'g1/c1/m1/a2.png']);
      expect(entries.every((e) => e.mtimeMs > 0)).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
