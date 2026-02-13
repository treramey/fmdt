import type { ServerBranch } from '@fmdt/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/providers/azure-devops/api.ts', () => ({
  getPullRequests: vi.fn(),
  checkBranchFullyMerged: vi.fn(),
}));

import { checkBranchFullyMerged, getPullRequests } from '../../../src/providers/azure-devops/api.ts';
import { getBranchMergeStatus } from '../../../src/providers/azure-devops/branch-report.ts';

const mockGetPRs = vi.mocked(getPullRequests);
const mockCheckMerged = vi.mocked(checkBranchFullyMerged);

const serverBranches: ServerBranch[] = [
  { name: 'Dev', branch: 'dev', order: 0 },
  { name: 'QA', branch: 'qa', order: 1 },
  { name: 'Production', branch: 'master', order: 2 },
];

const deps = { baseUrl: 'https://dev.azure.com/org/proj/_apis/git/repositories/', authHeader: 'Basic abc' };

afterEach(() => {
  vi.clearAllMocks();
});

describe('getBranchMergeStatus', () => {
  it('returns merged environments from PRs with diff validation', async () => {
    mockGetPRs.mockResolvedValueOnce([
      {
        pullRequestId: 10,
        sourceRefName: 'refs/heads/feature-x',
        targetRefName: 'refs/heads/dev',
        status: 'completed',
        creationDate: '2024-01-01',
        closedDate: '2024-01-02',
        title: 'Merge feature-x into dev',
        description: '',
        createdBy: { displayName: 'Alice', uniqueName: 'alice', id: '1', imageUrl: '' },
        lastMergeSourceCommit: { commitId: 'aaa', url: '' },
        lastMergeTargetCommit: { commitId: 'bbb', url: '' },
        repository: { id: 'r1', name: 'MyRepo', url: '' },
      },
    ]);

    // diff says fully merged for dev, not for qa/master
    mockCheckMerged.mockResolvedValueOnce(true);

    const result = await getBranchMergeStatus(deps, 'r1', 'feature-x', 'MyRepo', serverBranches);

    expect(result.branch).toBe('feature-x');
    expect(result.repository).toBe('MyRepo');
    expect(result.environments).toHaveLength(3);

    const dev = result.environments.find((e) => e.name === 'Dev');
    expect(dev?.merged).toBe(true);
    expect(dev?.verified).toBe(true);
    expect(dev?.mergedBy).toBe('Alice');
  });

  it('invalidates merge when diff shows changes', async () => {
    mockGetPRs.mockResolvedValueOnce([
      {
        pullRequestId: 11,
        sourceRefName: 'refs/heads/bugfix',
        targetRefName: 'refs/heads/qa',
        status: 'completed',
        creationDate: '2024-01-01',
        closedDate: '2024-01-03',
        title: 'Merge bugfix into qa',
        description: '',
        createdBy: { displayName: 'Bob', uniqueName: 'bob', id: '2', imageUrl: '' },
        lastMergeSourceCommit: { commitId: 'ccc', url: '' },
        lastMergeTargetCommit: { commitId: 'ddd', url: '' },
        repository: { id: 'r1', name: 'MyRepo', url: '' },
      },
    ]);

    // diff says NOT fully merged
    mockCheckMerged.mockResolvedValueOnce(false);

    const result = await getBranchMergeStatus(deps, 'r1', 'bugfix', 'MyRepo', serverBranches);

    const qa = result.environments.find((e) => e.name === 'QA');
    expect(qa?.merged).toBe(false);
    expect(qa?.verified).toBe(false);
    expect(qa?.mergedBy).toBeNull();
  });

  it('returns all environments unmerged when no PRs match', async () => {
    mockGetPRs.mockResolvedValueOnce([]);

    const result = await getBranchMergeStatus(deps, 'r1', 'new-branch', 'MyRepo', serverBranches);

    for (const env of result.environments) {
      expect(env.merged).toBe(false);
      expect(env.verified).toBe(false);
    }
  });
});
