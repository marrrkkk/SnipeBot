import { describe, expect, it } from 'vitest';

// Placeholder: real DB integration tests land in Phase 3 with the archive
// schema. This file proves the integration runner + config wiring works.
describe('bootstrap integration', () => {
  it('has a database path configured', () => {
    expect(process.env['DATABASE_PATH'] ?? './data/snipebot.db').toContain('.db');
  });
});
