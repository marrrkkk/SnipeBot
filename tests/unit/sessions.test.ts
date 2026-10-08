import { describe, expect, it } from 'vitest';
import { createSearchSessionStore } from '../../src/ui/sessions.js';

describe('search session store', () => {
  it('round-trips sessions bound to their channel', () => {
    const store = createSearchSessionStore({ newId: () => 'abc123' });
    const session = store.create('c1', { text: 'docker' });
    expect(session.id).toBe('abc123');
    expect(store.get('abc123', 'c1')).toEqual(session);
    expect(store.get('abc123', 'c2')).toBeNull();
    expect(store.get('nope', 'c1')).toBeNull();
  });

  it('expires sessions after the TTL', () => {
    let at = 1_000_000;
    const store = createSearchSessionStore({ now: () => at, ttlMs: 60_000, newId: () => 's1' });
    store.create('c1', { text: 'x' });
    expect(store.get('s1', 'c1')).not.toBeNull();
    at += 60_001;
    expect(store.get('s1', 'c1')).toBeNull();
    expect(store.size()).toBe(0);
  });

  it('caps the store by evicting the oldest entries', () => {
    let n = 0;
    const store = createSearchSessionStore({ max: 2, newId: () => `s${String((n += 1))}` });
    store.create('c1', {});
    store.create('c1', {});
    store.create('c1', {});
    expect(store.size()).toBe(2);
    expect(store.get('s1', 'c1')).toBeNull();
    expect(store.get('s3', 'c1')).not.toBeNull();
  });
});
