import { describe, expect, it } from 'vitest';
import { createGitHubProvider, createGitHubProviderFromAuth } from '../../../src/providers/github/index.ts';

describe('createGitHubProvider', () => {
  it('creates provider with correct type', () => {
    const provider = createGitHubProvider({
      org: 'my-org',
      pat: 'ghp_test',
      repoFilter: { type: 'all' },
      serverBranches: [],
    });
    expect(provider.type).toBe('github');
  });

  it('listProjects returns org as single project', async () => {
    const provider = createGitHubProvider({
      org: 'my-org',
      pat: 'ghp_test',
      repoFilter: { type: 'all' },
      serverBranches: [],
    });
    const projects = await provider.listProjects('my-org');
    expect(projects).toEqual([{ id: 'my-org', name: 'my-org', provider: 'github' }]);
  });
});

describe('createGitHubProviderFromAuth', () => {
  it('creates provider from PAT auth info', () => {
    const provider = createGitHubProviderFromAuth('my-org', { type: 'pat', token: 'ghp_test' }, { type: 'all' }, []);
    expect(provider.type).toBe('github');
  });

  it('throws for non-PAT auth', () => {
    expect(() =>
      createGitHubProviderFromAuth(
        'my-org',
        { type: 'oauth', accessToken: 'x', refreshToken: 'y', expiresAt: 0 },
        { type: 'all' },
        [],
      ),
    ).toThrow('PAT authentication');
  });
});
