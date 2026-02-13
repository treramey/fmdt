import type { ServerBranch } from '@fmdt/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AzureRepository } from '../../../src/providers/azure-devops/api.ts';

vi.mock('../../../src/providers/azure-devops/api.ts', () => ({
  getPullRequests: vi.fn(),
}));

import { getPullRequests } from '../../../src/providers/azure-devops/api.ts';
import { getEnvironmentReport } from '../../../src/providers/azure-devops/env-report.ts';

const mockGetPRs = vi.mocked(getPullRequests);

const serverBranches: ServerBranch[] = [
  { name: 'Dev', branch: 'dev', order: 0 },
  { name: 'QA', branch: 'qa', order: 1 },
];

const repos: AzureRepository[] = [
  {
    id: 'r1',
    name: 'RepoA',
    url: '',
    defaultBranch: 'refs/heads/main',
    size: 0,
    isDisabled: false,
    project: { id: 'p1', name: 'Proj', state: 'wellFormed', visibility: 'private', lastUpdateTime: '' },
  },
];

const deps = { baseUrl: 'https://dev.azure.com/org/proj/_apis/git/repositories/', authHeader: 'Basic abc' };

afterEach(() => {
  vi.clearAllMocks();
});

describe('getEnvironmentReport', () => {
  it('returns environment details with merged and open PRs', async () => {
    // First call: merged PRs for dev
    mockGetPRs.mockResolvedValueOnce([
      {
        pullRequestId: 1,
        sourceRefName: 'refs/heads/PROJ-100-fix',
        targetRefName: 'refs/heads/dev',
        status: 'completed',
        creationDate: '2024-01-01',
        closedDate: '2024-01-02',
        title: 'Fix login',
        description: '',
        createdBy: { displayName: 'Alice', uniqueName: 'alice', id: '1', imageUrl: '' },
        lastMergeSourceCommit: { commitId: 'a1', url: '' },
        lastMergeTargetCommit: { commitId: 'b1', url: '' },
        repository: { id: 'r1', name: 'RepoA', url: '' },
      },
    ]);
    // Second call: open PRs for dev
    mockGetPRs.mockResolvedValueOnce([]);
    // Third call: merged PRs for qa
    mockGetPRs.mockResolvedValueOnce([]);
    // Fourth call: open PRs for qa
    mockGetPRs.mockResolvedValueOnce([]);

    const result = await getEnvironmentReport(deps, 'Proj', repos, serverBranches);

    expect(result.project).toBe('Proj');
    expect(result.environments).toHaveLength(2);

    const dev = result.environments[0];
    expect(dev?.name).toBe('Dev');
    expect(dev?.repositories[0]?.mergedPRs).toHaveLength(1);
    expect(dev?.repositories[0]?.mergedPRs[0]?.workItemIds).toEqual(['PROJ-100']);
  });

  it('filters environments when filterEnvs provided', async () => {
    // Only QA requested — 2 calls (merged + open) per repo per env
    mockGetPRs.mockResolvedValue([]);

    const result = await getEnvironmentReport(deps, 'Proj', repos, serverBranches, ['QA']);

    expect(result.environments).toHaveLength(1);
    expect(result.environments[0]?.name).toBe('QA');
  });

  it('rolls up work items from merged and open PRs', async () => {
    // merged PR with work item
    mockGetPRs.mockResolvedValueOnce([
      {
        pullRequestId: 2,
        sourceRefName: 'refs/heads/TEAM-50-feature',
        targetRefName: 'refs/heads/dev',
        status: 'completed',
        creationDate: '2024-01-01',
        closedDate: '2024-01-02',
        title: 'Feature',
        description: '',
        createdBy: { displayName: 'Bob', uniqueName: 'bob', id: '2', imageUrl: '' },
        lastMergeSourceCommit: { commitId: 'x', url: '' },
        lastMergeTargetCommit: { commitId: 'y', url: '' },
        repository: { id: 'r1', name: 'RepoA', url: '' },
      },
    ]);
    // open PR with same work item
    mockGetPRs.mockResolvedValueOnce([
      {
        pullRequestId: 3,
        sourceRefName: 'refs/heads/TEAM-50-hotfix',
        targetRefName: 'refs/heads/dev',
        status: 'active',
        creationDate: '2024-01-03',
        closedDate: '',
        title: 'Hotfix',
        description: '',
        createdBy: { displayName: 'Carol', uniqueName: 'carol', id: '3', imageUrl: '' },
        lastMergeSourceCommit: { commitId: 'z', url: '' },
        lastMergeTargetCommit: { commitId: 'w', url: '' },
        repository: { id: 'r1', name: 'RepoA', url: '' },
      },
    ]);
    // QA calls
    mockGetPRs.mockResolvedValueOnce([]);
    mockGetPRs.mockResolvedValueOnce([]);

    const result = await getEnvironmentReport(deps, 'Proj', repos, serverBranches);

    const devWorkItems = result.environments[0]?.repositories[0]?.workItems;
    expect(devWorkItems).toHaveLength(1);
    expect(devWorkItems?.[0]?.id).toBe('TEAM-50');
    expect(devWorkItems?.[0]?.branches).toContain('TEAM-50-feature');
    expect(devWorkItems?.[0]?.branches).toContain('TEAM-50-hotfix');
  });
});
