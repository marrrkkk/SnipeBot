import type { ArchiveResult, ArchiveService } from './archiveService.js';

/**
 * No-op service so the event pipeline runs end to end before the durable
 * archive exists. Replaced by the real implementation in Phase 3.
 */
export function createStubArchiveService(): ArchiveService {
  const ok = (): Promise<ArchiveResult> => Promise.resolve({ ok: true });
  return {
    ingestMessage: ok,
    recordEdit: ok,
    recordDelete: ok,
    recordDeleteBulk: ok,
    recordReactions: ok,
    refreshPoll: ok,
    recordChannel: ok,
    removeChannel: ok,
    annotateDeletion: ok,
  };
}
