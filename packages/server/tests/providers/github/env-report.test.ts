import type { ServerBranch } from '@fmdt/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GitHubRepo } from '../../../src/providers/github/api.ts';
import { getEnvironmentReport } from '../../../src/providers/github/env-report.ts';

const serverBranches: ServerBranch[] = [
  { name: 'Dev', branch: 'dev', order: 0 },
  { name: 'Production', branch: 'main', order: 1 },
];

const repos: GitHubRepo[] = [
  {
    id: 1,
    name: 'api',
    full_name: 'org/api',
    default_branch: 'main',
    disabled: false,
    archived: false,
    topics: [],
    owner: { login: 'org' },
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getEnvironmentReport', () => {
  it('returns environment details for each server branch', async () => {
    const mockFetch = vi
      .fn()
      // Dev merged PRs
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            number: 10,
            title: 'Feature A',
            state: 'closed',
            merged_at: '2024-03-15T10:00:00Z',
            created_at: '2024-03-14T10:00:00Z',
            closed_at: '2024-03-15T10:00:00Z',
            head: { ref: 'TICKET-1-feature', sha: 'a' },
            base: { ref: 'dev', sha: 'b' },
            user: { login: 'dev-user' },
          },
        ],
        headers: new Headers({}),
      })
      // Dev open PRs
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers({}),
      })
      // Dev compare (commits ahead)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ahead_by: 1,
          behind_by: 0,
          total_commits: 1,
          commits: [{ sha: 'c1', commit: { message: 'fix', author: { name: 'dev', date: '2024-03-15' } } }],
        }),
      })
      // Production merged PRs
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers({}),
      })
      // Production open PRs
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers({}),
      })
      // Production compare
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ahead_by: 0, behind_by: 0, total_commits: 0, commits: [] }),
      });

    vi.stubGlobal('fetch', mockFetch);

    const report = await getEnvironmentReport(
      { owner: 'org', authHeader: 'Bearer test' },
      'test-project',
      repos,
      serverBranches,
    );

    expect(report.project).toBe('test-project');
    expect(report.environments).toHaveLength(2);

    const dev = report.environments[0];
    expect(dev?.name).toBe('Dev');
    expect(dev?.repositories[0]?.mergedPRs).toHaveLength(1);
    expect(dev?.repositories[0]?.mergedPRs[0]?.workItemIds).toEqual(['TICKET-1']);

    const prod = report.environments[1];
    expect(prod?.name).toBe('Production');
    expect(prod?.repositories[0]?.mergedPRs).toHaveLength(0);
  });

  it('filters environments when filterEnvs provided', async () => {
    const mockFetch = vi
      .fn()
      // Only Production calls (no Dev since filtered out)
      .mockResolvedValueOnce({ ok: true, json: async () => [], headers: new Headers({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => [], headers: new Headers({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ahead_by: 0, behind_by: 0, total_commits: 0, commits: [] }),
      });

    vi.stubGlobal('fetch', mockFetch);

    const report = await getEnvironmentReport(
      { owner: 'org', authHeader: 'Bearer test' },
      'test-project',
      repos,
      serverBranches,
      ['Production'],
    );

    expect(report.environments).toHaveLength(1);
    expect(report.environments[0]?.name).toBe('Production');
  });
});
