import { describe, expect, test } from 'vitest';
import { createAuthHeader } from '../src/utils/config.js';

describe('createAuthHeader', () => {
  test('should create valid Basic auth header', () => {
    const pat = 'test-token-123';
    const header = createAuthHeader(pat);

    expect(header).toMatch(/^Basic /);

    // Decode and verify
    const encoded = header.replace('Basic ', '');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    expect(decoded).toBe(':test-token-123');
  });

  test('should handle special characters in PAT', () => {
    const pat = 'token-with-@#$%^&*';
    const header = createAuthHeader(pat);
    const encoded = header.replace('Basic ', '');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    expect(decoded).toBe(':token-with-@#$%^&*');
  });
});
