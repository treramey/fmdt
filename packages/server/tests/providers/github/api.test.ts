import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOrgs, getRepos, getUser, validateAuth } from '../../../src/providers/github/api.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getOrgs', () => {
  it('fetches orgs for authenticated user', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [{ login: 'my-org' }, { login: 'other-org' }],
    });
    vi.stubGlobal('fetch', mockFetch);

    const orgs = await getOrgs('Bearer ghp_test');
    expect(orgs).toEqual(['my-org', 'other-org']);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/user/orgs',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer ghp_test' }) }),
    );
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' }));
    await expect(getOrgs('Bearer bad')).rejects.toThrow('401');
  });
});

describe('getRepos', () => {
  it('fetches repos with pagination', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: 'repo-a' }],
        headers: new Headers({ Link: '<https://api.github.com/orgs/test/repos?page=2>; rel="next"' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 2, name: 'repo-b' }],
        headers: new Headers({}),
      });
    vi.stubGlobal('fetch', mockFetch);

    const repos = await getRepos('test-org', 'Bearer ghp_test');
    expect(repos).toHaveLength(2);
    expect(repos[0]?.name).toBe('repo-a');
    expect(repos[1]?.name).toBe('repo-b');
  });
});

describe('getUser', () => {
  it('returns user login on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'testuser' }),
      }),
    );

    const result = await getUser('Bearer ghp_test');
    expect(result).toEqual({ login: 'testuser' });
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' }));
    await expect(getUser('Bearer bad')).rejects.toThrow('Failed to fetch user');
  });
});

describe('validateAuth', () => {
  it('returns true for valid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true }));
    expect(await validateAuth('Bearer ghp_valid')).toBe(true);
  });

  it('returns false for invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401 }));
    expect(await validateAuth('Bearer ghp_bad')).toBe(false);
  });
});
