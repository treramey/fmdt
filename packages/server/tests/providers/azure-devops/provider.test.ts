import type { ServerBranch } from '@fmdt/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/providers/azure-devops/api.ts', () => ({
  getProjects: vi.fn(),
  getRepositories: vi.fn(),
  getPullRequests: vi.fn(),
  checkBranchFullyMerged: vi.fn(),
}));

import { getProjects, getRepositories } from '../../../src/providers/azure-devops/api.ts';
import { createAzureDevOpsProvider } from '../../../src/providers/azure-devops/index.ts';

const mockGetProjects = vi.mocked(getProjects);
const mockGetRepos = vi.mocked(getRepositories);

const serverBranches: ServerBranch[] = [
  { name: 'Dev', branch: 'dev', order: 0 },
  { name: 'Production', branch: 'master', order: 1 },
];

const config = { org: 'my-org', project: 'my-project', pat: 'token123', serverBranches };

afterEach(() => {
  vi.clearAllMocks();
});

describe('createAzureDevOpsProvider', () => {
  it('has type azure-devops', () => {
    const provider = createAzureDevOpsProvider(config);
    expect(provider.type).toBe('azure-devops');
  });

  it('listOrgs returns the configured org', async () => {
    const provider = createAzureDevOpsProvider(config);
    const orgs = await provider.listOrgs();
    expect(orgs).toEqual(['my-org']);
  });

  it('listProjects calls getProjects and maps result', async () => {
    mockGetProjects.mockResolvedValueOnce([
      { id: 'p1', name: 'Proj1', description: '', url: '', state: '', revision: 1, visibility: '', lastUpdateTime: '' },
    ]);

    const provider = createAzureDevOpsProvider(config);
    const projects = await provider.listProjects('my-org');

    expect(projects).toEqual([{ id: 'p1', name: 'Proj1', provider: 'azure-devops' }]);
  });

  it('listRepositories maps and strips refs/heads/', async () => {
    mockGetRepos.mockResolvedValueOnce([
      {
        id: 'r1',
        name: 'Repo1',
        url: '',
        defaultBranch: 'refs/heads/main',
        size: 100,
        isDisabled: false,
        project: { id: 'p1', name: 'Proj', state: '', visibility: '', lastUpdateTime: '' },
      },
    ]);

    const provider = createAzureDevOpsProvider(config);
    const repos = await provider.listRepositories({ provider: 'azure-devops', org: 'my-org', project: 'my-project' });

    expect(repos).toEqual([{ id: 'r1', name: 'Repo1', defaultBranch: 'main', disabled: false }]);
  });

  it('validateCredentials returns true on success', async () => {
    mockGetProjects.mockResolvedValueOnce([]);

    const provider = createAzureDevOpsProvider(config);
    expect(await provider.validateCredentials()).toBe(true);
  });

  it('validateCredentials returns false on error', async () => {
    mockGetProjects.mockRejectedValueOnce(new Error('401'));

    const provider = createAzureDevOpsProvider(config);
    expect(await provider.validateCredentials()).toBe(false);
  });

  it('listRepositories throws for non-azure-devops ref', async () => {
    const provider = createAzureDevOpsProvider(config);
    await expect(
      provider.listRepositories({ provider: 'github', org: 'o', repoFilter: { type: 'all' } }),
    ).rejects.toThrow('Expected azure-devops project ref');
  });
});
