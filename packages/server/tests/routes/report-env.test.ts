import type { AuthStore } from '@fmdt/core';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/server.ts';

function mockAuthStore(overrides?: Partial<AuthStore>): AuthStore {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('POST /report/environment', () => {
  it('returns 400 on invalid body', async () => {
    const authStore = mockAuthStore();
    const app = createApp({ authStore })();

    const res = await app.request('/report/environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 when no config exists', async () => {
    const authStore = mockAuthStore();
    const app = createApp({ authStore })();

    const res = await app.request('/report/environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'nonexistent' }),
    });

    // Reason: executeEnvironmentReport throws when no config; caught by Hono error handler
    expect(res.status).toBe(500);
  });

  it('accepts valid env report request with optional environments filter', async () => {
    const authStore = mockAuthStore();
    const app = createApp({ authStore })();

    const res = await app.request('/report/environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'test', environments: ['Dev', 'QA'] }),
    });

    // Returns 500 because no config, but validates the body successfully
    expect(res.status).toBe(500);
  });
});
