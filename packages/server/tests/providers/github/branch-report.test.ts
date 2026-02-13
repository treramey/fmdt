import type { ServerBranch } from '@fmdt/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBranchMergeStatus } from '../../../src/providers/github/branch-report.ts';

const serverBranches: ServerBranch[] = [
  { name: 'Dev', branch: 'dev', order: 0 },
  { name: 'QA', branch: 'qa', order: 1 },
  { name: 'Production', branch: 'main', order: 2 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getBranchMergeStatus', () => {
  it('detects merged PRs and validates with compare', async () => {
    const mockFetch = vi
      .fn()
      // getPullRequests call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            number: 1,
            title: 'Merge to dev',
            state: 'closed',
            merged_at: '2024-03-15T10:00:00Z',
            created_at: '2024-03-14T10:00:00Z',
            closed_at: '2024-03-15T10:00:00Z',
            head: { ref: 'FEAT-100-test', sha: 'abc' },
            base: { ref: 'dev', sha: 'def' },
            user: { login: 'dev-user' },
          },
        ],
        headers: new Headers({}),
      })
      // compareBranches for Dev (ahead_by=0 → verified)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ahead_by: 0, behind_by: 3, total_commits: 0, commits: [] }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const result = await getBranchMergeStatus(
      { owner: 'my-org', authHeader: 'Bearer test' },
      'my-repo',
      'FEAT-100-test',
      serverBranches,
    );

    expect(result.branch).toBe('FEAT-100-test');
    expect(result.repository).toBe('my-repo');
    expect(result.environments).toHaveLength(3);

    const dev = result.environments.find((e) => e.name === 'Dev');
    expect(dev?.merged).toBe(true);
    expect(dev?.verified).toBe(true);

    const qa = result.environments.find((e) => e.name === 'QA');
    expect(qa?.merged).toBe(false);
  });

  it('marks as not merged when compare shows ahead_by > 0', async () => {
    const mockFetch = vi
      .fn()
      // getPullRequests — merged to dev
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            number: 2,
            title: 'PR',
            state: 'closed',
            merged_at: '2024-03-15T10:00:00Z',
            created_at: '2024-03-14T10:00:00Z',
            closed_at: '2024-03-15T10:00:00Z',
            head: { ref: 'FEAT-200', sha: 'abc' },
            base: { ref: 'dev', sha: 'def' },
            user: { login: 'user' },
          },
        ],
        headers: new Headers({}),
      })
      // compareBranches for Dev — ahead_by > 0 means not fully merged
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ahead_by: 2, behind_by: 0, total_commits: 2, commits: [] }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const result = await getBranchMergeStatus(
      { owner: 'my-org', authHeader: 'Bearer test' },
      'my-repo',
      'FEAT-200',
      serverBranches,
    );

    const dev = result.environments.find((e) => e.name === 'Dev');
    expect(dev?.merged).toBe(false);
    expect(dev?.verified).toBe(false);
  });

  it('handles no merged PRs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers({}),
      }),
    );

    const result = await getBranchMergeStatus(
      { owner: 'my-org', authHeader: 'Bearer test' },
      'my-repo',
      'NO-MATCH',
      serverBranches,
    );

    expect(result.environments.every((e) => !e.merged)).toBe(true);
  });
});
