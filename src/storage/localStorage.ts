import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { MediaStorage, StoredObjectMeta } from './types.js';

/** Local-filesystem MediaStorage. Keys are relative paths under baseDir. */
export class LocalMediaStorage implements MediaStorage {
  constructor(private readonly baseDir: string) {}

  private resolve(key: string): string {
    // Segment check (not substring): a file named `a..png` is legitimate,
    // but no segment may climb out of baseDir.
    if (key.split('/').some((segment) => segment === '..' || segment === '')) {
      throw new Error('Invalid storage key');
    }
    return join(this.baseDir, key);
  }

  async put(key: string, data: Uint8Array, contentType?: string): Promise<StoredObjectMeta> {
    const full = this.resolve(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
    return { path: full, sizeBytes: data.byteLength, contentType: contentType ?? null };
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const buf = await readFile(this.resolve(key));
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async listEntries(): Promise<{ key: string; mtimeMs: number }[]> {
    const out: { key: string; mtimeMs: number }[] = [];
    const walk = async (dir: string, prefix: string): Promise<void> => {
      const entries = await readdir(join(this.baseDir, dir), { withFileTypes: true });
      for (const entry of entries) {
        const key = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
        if (entry.isDirectory()) {
          await walk(join(dir, entry.name), key);
        } else if (entry.isFile()) {
          const info = await stat(join(this.baseDir, key));
          out.push({ key, mtimeMs: info.mtimeMs });
        }
      }
    };
    try {
      await walk('', '');
    } catch {
      return []; // Absent base dir means no files.
    }
    return out;
  }
}
