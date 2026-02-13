import type { AuthInfo, BranchMergeStatus, Project, Provider, Repository, ServerBranch } from '@fmdt/core';
import { getProjects, getRepositories } from './api.ts';
import { getBranchMergeStatus } from './branch-report.ts';
import { getEnvironmentReport } from './env-report.ts';
import { createAuthHeader } from './utils.ts';

export interface AzureDevOpsProviderConfig {
  org: string;
  project: string;
  pat: string;
  serverBranches: ServerBranch[];
}

export function createAzureDevOpsProvider(config: AzureDevOpsProviderConfig): Provider {
  const authHeader = createAuthHeader(config.pat);
  const baseUrl = `https://dev.azure.com/${config.org}/${config.project}/_apis/git/repositories/`;
  const deps = { baseUrl, authHeader };

  return {
    type: 'azure-devops',

    async listOrgs() {
      // Azure DevOps PAT is scoped to a single org
      return [config.org];
    },

    async listProjects(org) {
      const projects = await getProjects(org, authHeader);
      return projects.map(
        (p): Project => ({
          id: p.id,
          name: p.name,
          provider: 'azure-devops',
        }),
      );
    },

    async listRepositories(ref) {
      if (ref.provider !== 'azure-devops') {
        throw new Error('Expected azure-devops project ref');
      }
      const repos = await getRepositories(ref.org, ref.project, authHeader);
      return repos.map(
        (r): Repository => ({
          id: r.id,
          name: r.name,
          defaultBranch: r.defaultBranch?.replace('refs/heads/', '') ?? 'main',
          disabled: r.isDisabled,
        }),
      );
    },

    async getBranchMergeStatus(opts) {
      const repos = await getRepositories(config.org, config.project, authHeader);
      const filtered = opts.repositoryId ? repos.filter((r) => r.id === opts.repositoryId) : repos;

      const results: BranchMergeStatus[] = [];
      for (const repo of filtered) {
        const status = await getBranchMergeStatus(deps, repo.id, opts.branch, repo.name, config.serverBranches);
        results.push(status);
      }
      return results;
    },

    async getEnvironmentReport(opts) {
      const repos = await getRepositories(config.org, config.project, authHeader);
      return getEnvironmentReport(deps, config.project, repos, config.serverBranches, opts.environments);
    },

    async validateCredentials() {
      try {
        await getProjects(config.org, authHeader);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function createAzureDevOpsProviderFromAuth(
  org: string,
  project: string,
  authInfo: AuthInfo,
  serverBranches: ServerBranch[],
): Provider {
  if (authInfo.type !== 'pat') {
    throw new Error('Azure DevOps requires PAT authentication');
  }
  return createAzureDevOpsProvider({ org, project, pat: authInfo.token, serverBranches });
}
