import { beforeEach, describe, expect, it } from 'vitest';
import {
  increment,
  resetMetrics,
  setGauge,
  snapshotMetrics,
} from '../../src/observability/metrics.js';

beforeEach(() => {
  resetMetrics();
});

describe('metrics registry', () => {
  it('counts and snapshots with uptime', () => {
    increment('messages.ingested');
    increment('messages.ingested', 2);
    setGauge('media.pending', 7);

    const snap = snapshotMetrics();

    expect(snap.counters).toEqual({ 'messages.ingested': 3 });
    expect(snap.gauges).toEqual({ 'media.pending': 7 });
    expect(typeof snap.startedAt).toBe('string');
    expect(snap.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('resets to empty', () => {
    increment('x.y');
    resetMetrics();
    expect(snapshotMetrics().counters).toEqual({});
  });
});
