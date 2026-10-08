import { Client, Events } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { registerConnectionEvents } from '../../src/events/connection.js';
import { resetMetrics, snapshotMetrics } from '../../src/observability/metrics.js';

describe('connection events', () => {
  it('counts disconnects, reconnects and resumes', () => {
    resetMetrics();
    const client = new Client({ intents: [] });
    try {
      registerConnectionEvents(client);
      client.emit(Events.ShardDisconnect, { code: 1000 } as never, 0);
      client.emit(Events.ShardReconnecting, 0);
      client.emit(Events.ShardResume, 0, 42);
      const counters = snapshotMetrics().counters;
      expect(counters['gateway.disconnects']).toBe(1);
      expect(counters['gateway.reconnects']).toBe(1);
      expect(counters['gateway.resumes']).toBe(1);
    } finally {
      void client.destroy();
    }
  });
});
