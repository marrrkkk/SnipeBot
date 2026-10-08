/**
 * Zero-dependency in-process metrics. Fixed names only — never user
 * content, never per-user labels. Counters reset on restart (documented
 * ephemeral); the database stays the durable record.
 */
const startedAt = new Date().toISOString();
const startedMs = Date.now();
const counters = new Map<string, number>();
const gauges = new Map<string, number>();

export function increment(name: string, by = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function setGauge(name: string, value: number): void {
  gauges.set(name, value);
}

export type MetricsSnapshot = {
  startedAt: string;
  uptimeMs: number;
  counters: Record<string, number>;
  gauges: Record<string, number>;
};

export function snapshotMetrics(): MetricsSnapshot {
  return {
    startedAt,
    uptimeMs: Date.now() - startedMs,
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
  };
}

/** Test/support hook: clear all counters and gauges. */
export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
}
