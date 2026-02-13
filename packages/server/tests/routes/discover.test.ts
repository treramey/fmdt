import type { AuthStore } from '@fmdt/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/server.ts';

function mockAuthStore(overrides?: Partial<AuthStore>): AuthStore {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('POST /discover/projects', () => {
  it('returns 400 on invalid body', async () => {
    const authStore = mockAuthStore();
    const app = createApp({ authStore })();

    const res = await app.request('/discover/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'invalid' }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when no credentials stored', async () => {
    const authStore = mockAuthStore();
    const app = createApp({ authStore })();

    const res = await app.request('/discover/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'azure-devops', org: 'my-org' }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe('AUTH_REQUIRED');
  });

  it('returns github org as project for github provider', async () => {
    const authStore = mockAuthStore({
      get: vi.fn().mockResolvedValue({ type: 'pat', token: 'ghp_test' }),
    });
    const app = createApp({ authStore })();

    const res = await app.request('/discover/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'github', org: 'my-org' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([{ id: 'my-org', name: 'my-org', provider: 'github' }]);
  });
});

describe('POST /discover/orgs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 on invalid body', async () => {
    const authStore = mockAuthStore();
    const app = createApp({ authStore })();

    const res = await app.request('/discover/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'invalid' }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when no credentials stored', async () => {
    const authStore = mockAuthStore();
    const app = createApp({ authStore })();

    const res = await app.request('/discover/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'github' }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe('AUTH_REQUIRED');
  });

  it('returns github user + orgs for github provider', async () => {
    const authStore = mockAuthStore({
      get: vi.fn().mockResolvedValue({ type: 'pat', token: 'ghp_test' }),
    });

    const mockFetch = vi
      .fn()
      // getUser call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'testuser' }),
      })
      // getOrgs call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ login: 'org-a' }, { login: 'org-b' }],
      });
    vi.stubGlobal('fetch', mockFetch);

    const app = createApp({ authStore })();

    const res = await app.request('/discover/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'github' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(['testuser', 'org-a', 'org-b']);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer ghp_test' }) }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/user/orgs',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer ghp_test' }) }),
    );
  });

  it('returns azure orgs for azure-devops provider', async () => {
    const authStore = mockAuthStore({
      get: vi.fn().mockResolvedValue({ type: 'pat', token: 'my-pat' }),
    });

    const mockFetch = vi
      .fn()
      // getProfile call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ publicAlias: 'abc-123', displayName: 'Test' }),
      })
      // getOrganizations call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ accountId: '1', accountName: 'my-org', accountUri: 'https://dev.azure.com/my-org' }],
          count: 1,
        }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const app = createApp({ authStore })();

    const res = await app.request('/discover/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'azure-devops' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(['my-org']);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=6.0',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringContaining('Basic') }),
      }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('app.vssps.visualstudio.com/_apis/accounts?memberId=abc-123'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringContaining('Basic') }),
      }),
    );
  });

  it('returns empty array when azure profile fetch is unauthorized (org-scoped PAT)', async () => {
    const authStore = mockAuthStore({
      get: vi.fn().mockResolvedValue({ type: 'pat', token: 'org-scoped-pat' }),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' }));

    const app = createApp({ authStore })();

    const res = await app.request('/discover/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'azure-devops' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('returns 401 when github user fetch is unauthorized', async () => {
    const authStore = mockAuthStore({
      get: vi.fn().mockResolvedValue({ type: 'pat', token: 'bad-ghp' }),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' }));

    const app = createApp({ authStore })();

    const res = await app.request('/discover/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'github' }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe('AUTH_FAILED');
  });
});
