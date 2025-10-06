import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { BranchMergeStatus, Repository } from '../src/types/index.js';

// Create a minimal mock service for testing
class MockAzureDevOpsService {
  async getRepositories(): Promise<Repository[]> {
    return [];
  }

  async getBranchMergeStatus(
    _repositoryId: string,
    _branch: string,
    _repositoryName: string,
  ): Promise<BranchMergeStatus> {
    return {
      branch: '',
      repository: '',
      mergedTo: {
        dev: { merged: false, date: null, mergedBy: null },
        qa: { merged: false, date: null, mergedBy: null },
        staging: { merged: false, date: null, mergedBy: null },
        master: { merged: false, date: null, mergedBy: null },
      },
    };
  }

  async getBatchBranchMergeStatus(branch: string) {
    const { isFulfilledResult, isRejectedResult } = await import('../src/types/index.js');

    const repositories = await this.getRepositories();
    const promises = repositories.map((repo) => this.getBranchMergeStatus(repo.id, branch, repo.name));
    const results = await Promise.allSettled(promises);

    const successful = results.filter(isFulfilledResult).map((result) => result.value);

    // Track failed repos by mapping over all results and filtering
    const failed: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (isRejectedResult(results[i])) {
        failed.push(repositories[i]?.name ?? 'Unknown');
      }
    }

    const branchExists = successful.filter((status) => {
      const environments = Object.values(status.mergedTo);
      return environments.some((env) => env.merged);
    });

    return {
      statuses: branchExists,
      operationSummary: {
        total: repositories.length,
        successful: branchExists.length,
        failed: failed.length,
        failedRepos: failed,
      },
    };
  }
}

describe('AzureDevOpsService.getBatchBranchMergeStatus', () => {
  let service: MockAzureDevOpsService;

  beforeEach(() => {
    service = new MockAzureDevOpsService();
    vi.clearAllMocks();
  });

  const createMockRepo = (id: string, name: string): Repository => ({
    id,
    name,
    url: `https://test.com/${name}`,
    defaultBranch: 'refs/heads/main',
    size: 1000,
    isDisabled: false,
    project: {
      id: 'proj-1',
      name: 'Test Project',
      state: 'active',
      visibility: 'private',
      lastUpdateTime: '2025-01-01T00:00:00Z',
    },
  });

  const createMockStatus = (branch: string, repository: string, hasMerges: boolean): BranchMergeStatus => ({
    branch,
    repository,
    mergedTo: {
      dev: {
        merged: hasMerges,
        date: hasMerges ? '2025-01-15T10:30:00Z' : null,
        mergedBy: hasMerges ? 'John Doe' : null,
      },
      qa: { merged: false, date: null, mergedBy: null },
      staging: { merged: false, date: null, mergedBy: null },
      master: { merged: false, date: null, mergedBy: null },
    },
  });

  test('should return merge status for all repos containing branch', async () => {
    const mockRepos = [
      createMockRepo('repo-1', 'Repo1'),
      createMockRepo('repo-2', 'Repo2'),
      createMockRepo('repo-3', 'Repo3'),
    ];

    // Mock getRepositories to return 3 repos
    vi.spyOn(service, 'getRepositories').mockResolvedValue(mockRepos);

    // Mock getBranchMergeStatus: 2 repos have the branch, 1 doesn't
    vi.spyOn(service, 'getBranchMergeStatus')
      .mockResolvedValueOnce(createMockStatus('feature-123', 'Repo1', true))
      .mockResolvedValueOnce(createMockStatus('feature-123', 'Repo2', true))
      .mockResolvedValueOnce(createMockStatus('feature-123', 'Repo3', false));

    const result = await service.getBatchBranchMergeStatus('feature-123');

    expect(result.statuses).toHaveLength(2);
    expect(result.statuses[0]?.repository).toBe('Repo1');
    expect(result.statuses[1]?.repository).toBe('Repo2');
    expect(result.operationSummary.total).toBe(3);
    expect(result.operationSummary.successful).toBe(2);
    expect(result.operationSummary.failed).toBe(0);
    expect(result.operationSummary.failedRepos).toHaveLength(0);
  });

  test('should handle branch not existing in any repository', async () => {
    const mockRepos = [
      createMockRepo('repo-1', 'Repo1'),
      createMockRepo('repo-2', 'Repo2'),
      createMockRepo('repo-3', 'Repo3'),
    ];

    vi.spyOn(service, 'getRepositories').mockResolvedValue(mockRepos);

    // Mock all repos returning no merges (branch doesn't exist)
    vi.spyOn(service, 'getBranchMergeStatus')
      .mockResolvedValueOnce(createMockStatus('nonexistent', 'Repo1', false))
      .mockResolvedValueOnce(createMockStatus('nonexistent', 'Repo2', false))
      .mockResolvedValueOnce(createMockStatus('nonexistent', 'Repo3', false));

    const result = await service.getBatchBranchMergeStatus('nonexistent');

    expect(result.statuses).toHaveLength(0);
    expect(result.operationSummary.total).toBe(3);
    expect(result.operationSummary.successful).toBe(0);
    expect(result.operationSummary.failed).toBe(0);
  });

  test('should handle partial API failures gracefully', async () => {
    const mockRepos = [
      createMockRepo('repo-1', 'Repo1'),
      createMockRepo('repo-2', 'Repo2'),
      createMockRepo('repo-3', 'Repo3'),
    ];

    vi.spyOn(service, 'getRepositories').mockResolvedValue(mockRepos);

    // Mock: 1 success, 2 failures
    vi.spyOn(service, 'getBranchMergeStatus')
      .mockResolvedValueOnce(createMockStatus('feature-123', 'Repo1', true))
      .mockRejectedValueOnce(new Error('API Error'))
      .mockRejectedValueOnce(new Error('Timeout'));

    const result = await service.getBatchBranchMergeStatus('feature-123');

    expect(result.statuses).toHaveLength(1);
    expect(result.statuses[0]?.repository).toBe('Repo1');
    expect(result.operationSummary.total).toBe(3);
    expect(result.operationSummary.successful).toBe(1);
    expect(result.operationSummary.failed).toBe(2);
    expect(result.operationSummary.failedRepos).toHaveLength(2);
    expect(result.operationSummary.failedRepos).toContain('Repo2');
    expect(result.operationSummary.failedRepos).toContain('Repo3');
  });

  test('should handle single repository with branch', async () => {
    const mockRepos = [createMockRepo('repo-1', 'OnlyRepo')];

    vi.spyOn(service, 'getRepositories').mockResolvedValue(mockRepos);
    vi.spyOn(service, 'getBranchMergeStatus').mockResolvedValue(createMockStatus('feature-123', 'OnlyRepo', true));

    const result = await service.getBatchBranchMergeStatus('feature-123');

    expect(result.statuses).toHaveLength(1);
    expect(result.operationSummary.total).toBe(1);
    expect(result.operationSummary.successful).toBe(1);
  });

  test('should handle all API failures', async () => {
    const mockRepos = [createMockRepo('repo-1', 'Repo1'), createMockRepo('repo-2', 'Repo2')];

    vi.spyOn(service, 'getRepositories').mockResolvedValue(mockRepos);
    vi.spyOn(service, 'getBranchMergeStatus').mockRejectedValue(new Error('Network Error'));

    const result = await service.getBatchBranchMergeStatus('feature-123');

    expect(result.statuses).toHaveLength(0);
    expect(result.operationSummary.total).toBe(2);
    expect(result.operationSummary.successful).toBe(0);
    expect(result.operationSummary.failed).toBe(2);
  });

  test('should filter repos where branch exists in multiple environments', async () => {
    const mockRepos = [createMockRepo('repo-1', 'Repo1'), createMockRepo('repo-2', 'Repo2')];

    vi.spyOn(service, 'getRepositories').mockResolvedValue(mockRepos);

    // Repo1 has branch merged to dev and qa
    const statusWithMultipleMerges: BranchMergeStatus = {
      branch: 'feature-123',
      repository: 'Repo1',
      mergedTo: {
        dev: { merged: true, date: '2025-01-15T10:30:00Z', mergedBy: 'John Doe' },
        qa: { merged: true, date: '2025-01-16T14:00:00Z', mergedBy: 'Jane Smith' },
        staging: { merged: false, date: null, mergedBy: null },
        master: { merged: false, date: null, mergedBy: null },
      },
    };

    vi.spyOn(service, 'getBranchMergeStatus')
      .mockResolvedValueOnce(statusWithMultipleMerges)
      .mockResolvedValueOnce(createMockStatus('feature-123', 'Repo2', false));

    const result = await service.getBatchBranchMergeStatus('feature-123');

    expect(result.statuses).toHaveLength(1);
    expect(result.statuses[0]?.mergedTo.dev.merged).toBe(true);
    expect(result.statuses[0]?.mergedTo.qa.merged).toBe(true);
  });

  test('should show most recent merge when branch has multiple PRs to same target', async () => {
    const mockRepos = [createMockRepo('repo-1', 'Repo1')];

    vi.spyOn(service, 'getRepositories').mockResolvedValue(mockRepos);

    const statusWithMostRecentMerge: BranchMergeStatus = {
      branch: 'LAAIR-1388',
      repository: 'Repo1',
      mergedTo: {
        dev: { merged: true, date: '2025-03-21T21:05:00Z', mergedBy: 'Tim Cartwright' },
        qa: { merged: true, date: '2025-03-21T21:36:00Z', mergedBy: 'Tim Cartwright' },
        staging: { merged: true, date: '2025-04-28T13:41:00Z', mergedBy: 'Trevor Ramey' },
        master: { merged: true, date: '2025-06-25T12:00:00Z', mergedBy: 'Tim Cartwright' },
      },
    };

    vi.spyOn(service, 'getBranchMergeStatus').mockResolvedValue(statusWithMostRecentMerge);

    const result = await service.getBatchBranchMergeStatus('LAAIR-1388');

    expect(result.statuses).toHaveLength(1);
    expect(result.statuses[0]?.mergedTo.master.date).toBe('2025-06-25T12:00:00Z');
    expect(result.statuses[0]?.mergedTo.master.mergedBy).toBe('Tim Cartwright');
  });

  test('should invalidate merge when diff shows changes still need to be merged', async () => {
    const mockRepos = [createMockRepo('repo-1', 'Repo1')];

    vi.spyOn(service, 'getRepositories').mockResolvedValue(mockRepos);

    const statusWithInvalidMerge: BranchMergeStatus = {
      branch: 'feature-123',
      repository: 'Repo1',
      mergedTo: {
        dev: { merged: true, date: '2025-01-12T10:00:00Z', mergedBy: 'John Doe' },
        qa: { merged: true, date: '2025-01-13T10:00:00Z', mergedBy: 'Jane Smith' },
        staging: { merged: false, date: null, mergedBy: null },
        master: { merged: false, date: null, mergedBy: null },
      },
    };

    vi.spyOn(service, 'getBranchMergeStatus').mockResolvedValue(statusWithInvalidMerge);

    const result = await service.getBatchBranchMergeStatus('feature-123');

    expect(result.statuses).toHaveLength(1);
    expect(result.statuses[0]?.mergedTo.dev.merged).toBe(true);
    expect(result.statuses[0]?.mergedTo.qa.merged).toBe(true);
    expect(result.statuses[0]?.mergedTo.staging.merged).toBe(false);
    expect(result.statuses[0]?.mergedTo.master.merged).toBe(false);
  });

  test('should handle valid hierarchical merges with all branches in correct order', async () => {
    const mockRepos = [createMockRepo('repo-1', 'Repo1')];

    vi.spyOn(service, 'getRepositories').mockResolvedValue(mockRepos);

    const statusWithValidHierarchy: BranchMergeStatus = {
      branch: 'feature-123',
      repository: 'Repo1',
      mergedTo: {
        dev: { merged: true, date: '2025-07-18T10:00:00Z', mergedBy: 'John Doe' },
        qa: { merged: true, date: '2025-07-19T10:00:00Z', mergedBy: 'Jane Smith' },
        staging: { merged: true, date: '2025-07-20T10:00:00Z', mergedBy: 'Bob Johnson' },
        master: { merged: true, date: '2025-07-21T10:00:00Z', mergedBy: 'Alice Williams' },
      },
    };

    vi.spyOn(service, 'getBranchMergeStatus').mockResolvedValue(statusWithValidHierarchy);

    const result = await service.getBatchBranchMergeStatus('feature-123');

    expect(result.statuses).toHaveLength(1);
    expect(result.statuses[0]?.mergedTo.dev.merged).toBe(true);
    expect(result.statuses[0]?.mergedTo.qa.merged).toBe(true);
    expect(result.statuses[0]?.mergedTo.staging.merged).toBe(true);
    expect(result.statuses[0]?.mergedTo.master.merged).toBe(true);
  });
});
