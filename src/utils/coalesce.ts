import { logger } from './logger.js';

export type CoalesceFn = (key: string, run: () => Promise<void>) => void;

/**
 * Trailing-edge coalescing for hot event paths (reaction/poll storms):
 * closely spaced runs for one key collapse into a single trailing run.
 * Entries are deleted on fire, so memory stays bounded by live activity.
 * `windowMs <= 0` runs immediately (tests, and an honest off-switch).
 */
export function createCoalescer(windowMs: number): CoalesceFn {
  const pending = new Map<string, NodeJS.Timeout>();
  const fire = (key: string, run: () => Promise<void>): void => {
    pending.delete(key);
    void run().catch((err: unknown) => {
      logger.debug('Coalesced run failed', { err: String(err) });
    });
  };
  return (key, run) => {
    if (windowMs <= 0) {
      fire(key, run);
      return;
    }
    const existing = pending.get(key);
    if (existing !== undefined) clearTimeout(existing);
    const timer = setTimeout(() => {
      fire(key, run);
    }, windowMs);
    timer.unref();
    pending.set(key, timer);
  };
}
