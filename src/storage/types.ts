export type StoredObjectMeta = {
  path: string;
  sizeBytes: number;
  contentType: string | null;
};

/**
 * Storage abstraction so the domain never touches fs/S3 directly.
 * Phase 7 implements local fs; S3/R2/MinIO later behind this interface.
 */
export type MediaStorage = {
  put(key: string, data: Uint8Array, contentType?: string): Promise<StoredObjectMeta>;
  get(key: string): Promise<Uint8Array | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  /** Optional recursive listing for maintenance (orphan sweep). */
  listEntries?: () => Promise<{ key: string; mtimeMs: number }[]>;
};
