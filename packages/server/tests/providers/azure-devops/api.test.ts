import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkBranchFullyMerged,
  getOrganizations,
  getProfile,
  getProjects,
  getRepositories,
} from '../../../src/providers/azure-devops/api.ts';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getProjects', () => {
  it('returns projects on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ value: [{ id: '1', name: 'MyProject' }], count: 1 }),
    });

    const result = await getProjects('my-org', 'Basic abc');
    expect(result).toEqual([{ id: '1', name: 'MyProject' }]);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://dev.azure.com/my-org/_apis/projects?api-version=7.1',
      expect.objectContaining({ headers: { Authorization: 'Basic abc', Accept: 'application/json' } }),
    );
  });

  it('throws on 401 with PAT hint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });
    await expect(getProjects('org', 'Basic bad')).rejects.toThrow('Invalid PAT token');
  });

  it('throws on 404 with org hint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(getProjects('bad-org', 'Basic x')).rejects.toThrow('Organization not found');
  });
});

describe('getRepositories', () => {
  it('filters disabled repos', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: [
          { id: '1', name: 'active', isDisabled: false },
          { id: '2', name: 'disabled', isDisabled: true },
        ],
        count: 2,
      }),
    });

    const result = await getRepositories('org', 'proj', 'Basic x');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('active');
  });
});

describe('checkBranchFullyMerged', () => {
  const base = 'https://dev.azure.com/org/proj/_apis/git/repositories/';

  it('returns true when no changes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changeCounts: {}, changes: [] }),
    });
    const result = await checkBranchFullyMerged(base, 'repo1', 'feature', 'main', 'Basic x');
    expect(result).toBe(true);
  });

  it('returns false when changes exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changeCounts: { Edit: 3 }, changes: [{}, {}, {}] }),
    });
    const result = await checkBranchFullyMerged(base, 'repo1', 'feature', 'main', 'Basic x');
    expect(result).toBe(false);
  });

  it('returns false on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await checkBranchFullyMerged(base, 'repo1', 'feature', 'main', 'Basic x');
    expect(result).toBe(false);
  });
});

describe('getProfile', () => {
  it('returns profile on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ publicAlias: 'abc-123', displayName: 'Test User' }),
    });

    const result = await getProfile('Basic abc');
    expect(result).toEqual({ publicAlias: 'abc-123', displayName: 'Test User' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=6.0',
      expect.objectContaining({ headers: { Authorization: 'Basic abc', Accept: 'application/json' } }),
    );
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });
    await expect(getProfile('Basic bad')).rejects.toThrow('Failed to fetch profile');
  });
});

describe('getOrganizations', () => {
  it('returns org names on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: [
          { accountId: '1', accountName: 'org-one', accountUri: 'https://dev.azure.com/org-one' },
          { accountId: '2', accountName: 'org-two', accountUri: 'https://dev.azure.com/org-two' },
        ],
        count: 2,
      }),
    });

    const result = await getOrganizations('abc-123', 'Basic abc');
    expect(result).toEqual(['org-one', 'org-two']);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.vssps.visualstudio.com/_apis/accounts?memberId=abc-123&api-version=6.0',
      expect.objectContaining({ headers: { Authorization: 'Basic abc', Accept: 'application/json' } }),
    );
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });
    await expect(getOrganizations('abc', 'Basic bad')).rejects.toThrow('Failed to fetch organizations');
  });

  it('returns empty array when no orgs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [], count: 0 }),
    });

    const result = await getOrganizations('abc', 'Basic abc');
    expect(result).toEqual([]);
  });
});
