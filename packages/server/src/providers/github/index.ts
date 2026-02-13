import type { AuthInfo, BranchMergeStatus, Provider, RepoFilter, Repository, ServerBranch } from '@fmdt/core';
import { getOrgs, getRepos, validateAuth } from './api.ts';
import { getBranchMergeStatus } from './branch-report.ts';
import { getEnvironmentReport } from './env-report.ts';
import { applyRepoFilter } from './repo-filter.ts';
import { createAuthHeader } from './utils.ts';

export interface GitHubProviderConfig {
  org: string;
  pat: string;
  repoFilter: RepoFilter;
  serverBranches: ServerBranch[];
}

export function createGitHubProvider(config: GitHubProviderConfig): Provider {
  const authHeader = createAuthHeader(config.pat);
  const deps = { owner: config.org, authHeader };

  return {
    type: 'github',

    async listOrgs() {
      return getOrgs(authHeader);
    },

    async listProjects(org) {
      // Reason: GitHub orgs don't have "projects" like Azure DevOps — treat org as a single project
      return [{ id: org, name: org, provider: 'github' as const }];
    },

    async listRepositories(ref) {
      if (ref.provider !== 'github') {
        throw new Error('Expected github project ref');
      }
      const allRepos = await getRepos(ref.org, authHeader);
      const filtered = applyRepoFilter(
        allRepos.filter((r) => !r.archived && !r.disabled),
        ref.repoFilter,
      );
      return filtered.map(
        (r): Repository => ({
          id: String(r.id),
          name: r.name,
          defaultBranch: r.default_branch,
          disabled: r.disabled,
        }),
      );
    },

    async getBranchMergeStatus(opts) {
      const allRepos = await getRepos(config.org, authHeader);
      const filtered = applyRepoFilter(
        allRepos.filter((r) => !r.archived && !r.disabled),
        config.repoFilter,
      );
      const repos = opts.repositoryId ? filtered.filter((r) => String(r.id) === opts.repositoryId) : filtered;

      const results: BranchMergeStatus[] = [];
      for (const repo of repos) {
        const status = await getBranchMergeStatus(deps, repo.name, opts.branch, config.serverBranches);
        results.push(status);
      }
      return results;
    },

    async getEnvironmentReport(opts) {
      const allRepos = await getRepos(config.org, authHeader);
      const filtered = applyRepoFilter(
        allRepos.filter((r) => !r.archived && !r.disabled),
        config.repoFilter,
      );
      return getEnvironmentReport(deps, config.org, filtered, config.serverBranches, opts.environments);
    },

    async validateCredentials() {
      return validateAuth(authHeader);
    },
  };
}

export function createGitHubProviderFromAuth(
  org: string,
  authInfo: AuthInfo,
  repoFilter: RepoFilter,
  serverBranches: ServerBranch[],
): Provider {
  if (authInfo.type !== 'pat') {
    throw new Error('GitHub requires PAT authentication');
  }
  return createGitHubProvider({ org, pat: authInfo.token, repoFilter, serverBranches });
}
