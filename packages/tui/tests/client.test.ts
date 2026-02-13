import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';
import type { ClientConfig } from '../src/client.ts';
import { fetchJSON, postJSON } from '../src/client.ts';

const TestSchema = z.object({ id: z.number(), name: z.string() });

function mockConfig(mockFetch: typeof fetch): ClientConfig {
  return { baseUrl: 'http://localhost:3000', fetch: mockFetch };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchJSON', () => {
  it('fetches and validates JSON response', async () => {
    const mock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: 'Test' }),
    });
    const result = await fetchJSON(mockConfig(mock as unknown as typeof fetch), '/items/1', TestSchema);

    expect(result).toEqual({ id: 1, name: 'Test' });
    expect(mock).toHaveBeenCalledWith(
      'http://localhost:3000/items/1',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('throws on non-OK response', async () => {
    const mock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not found',
    });

    await expect(fetchJSON(mockConfig(mock as unknown as typeof fetch), '/missing', TestSchema)).rejects.toThrow(
      'HTTP 404: Not found',
    );
  });

  it('throws on schema validation failure', async () => {
    const mock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'not-a-number', name: 123 }),
    });

    await expect(fetchJSON(mockConfig(mock as unknown as typeof fetch), '/bad', TestSchema)).rejects.toThrow();
  });
});

describe('postJSON', () => {
  it('sends POST with JSON body and validates response', async () => {
    const mock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 2, name: 'Created' }),
    });
    const result = await postJSON(mockConfig(mock as unknown as typeof fetch), '/items', { name: 'New' }, TestSchema);

    expect(result).toEqual({ id: 2, name: 'Created' });
    expect(mock).toHaveBeenCalledWith(
      'http://localhost:3000/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New' }),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      }),
    );
  });

  it('throws on non-OK response', async () => {
    const mock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal error',
    });

    await expect(postJSON(mockConfig(mock as unknown as typeof fetch), '/items', {}, TestSchema)).rejects.toThrow(
      'HTTP 500',
    );
  });

  it('uses globalThis.fetch when config.fetch is undefined', async () => {
    const originalFetch = globalThis.fetch;
    const mock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 3, name: 'Global' }),
    });
    globalThis.fetch = mock as unknown as typeof fetch;

    try {
      const result = await fetchJSON({ baseUrl: 'http://test' }, '/x', TestSchema);
      expect(result).toEqual({ id: 3, name: 'Global' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
