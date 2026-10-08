import { describe, expect, it } from 'vitest';
import { createCoalescer } from '../../src/utils/coalesce.js';

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('coalescer', () => {
  it('collapses rapid runs for one key into a trailing run', async () => {
    const coalesce = createCoalescer(20);
    let runs = 0;
    coalesce('m1', () =>
      Promise.resolve().then(() => {
        runs += 1;
      }),
    );
    coalesce('m1', () =>
      Promise.resolve().then(() => {
        runs += 1;
      }),
    );
    coalesce('m1', () =>
      Promise.resolve().then(() => {
        runs += 1;
      }),
    );
    expect(runs).toBe(0);
    await sleep(100);
    expect(runs).toBe(1);
  });

  it('runs immediately when the window is zero or negative', async () => {
    const coalesce = createCoalescer(0);
    let runs = 0;
    coalesce('m1', () => {
      runs += 1;
      return Promise.resolve();
    });
    await sleep(10);
    expect(runs).toBe(1);
  });

  it('tracks keys independently', async () => {
    const coalesce = createCoalescer(20);
    const seen: string[] = [];
    coalesce('a', () => {
      seen.push('a');
      return Promise.resolve();
    });
    coalesce('b', () => {
      seen.push('b');
      return Promise.resolve();
    });
    await sleep(100);
    expect(seen.sort()).toEqual(['a', 'b']);
  });
});
