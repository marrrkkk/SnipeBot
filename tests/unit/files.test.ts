import { describe, expect, it } from 'vitest';
import { restrictFileCreation } from '../../src/security/files.js';

describe('restrictive umask', () => {
  it('applies 077 and returns the previous mask', () => {
    const previous = process.umask(0o022);
    try {
      expect(restrictFileCreation()).toBe(0o022);
      expect(process.umask(previous)).toBe(0o077);
    } finally {
      process.umask(previous);
    }
  });
});
