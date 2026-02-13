import { fetchPaginated } from './utils.ts';

// --- Azure DevOps API response shapes (raw, not domain types) ---

export interface AzureProject {
  id: string;
  name: string;
  description: string;
  url: string;
  state: string;
  revision: number;
  visibility: string;
  lastUpdateTime: string;
}

export interface AzureRepository {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
  size: number;
  isDisabled: boolean;
  project: { id: string; name: string; state: string; visibility: string; lastUpdateTime: string };
}

export interface AzurePullRequest {
  pullRequestId: number;
  sourceRefName: string;
  targetRefName: string;
  status: string;
  creationDate: string;
  closedDate: string;
  title: string;
  description: string;
  createdBy: { displayName: string; uniqueName: string; id: string; imageUrl: string };
  lastMergeSourceCommit: { commitId: string; url: string };
  lastMergeTargetCommit: { commitId: string; url: string };
  repository: { id: string; name: string; url: string };
}

interface GitDiffResponse {
  changeCounts: Record<string, number>;
  changes: unknown[];
}

export interface AzureProfile {
  publicAlias: string;
  displayName: string;
}

export interface AzureAccount {
  accountId: string;
  accountName: string;
  accountUri: string;
}

// --- API functions ---

/** Fetch the authenticated user's profile (VSSPS). Requires "all organizations" PAT scope. */
export async function getProfile(authHeader: string): Promise<AzureProfile> {
  const url = 'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=6.0';
  const response = await fetch(url, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as AzureProfile;
}

/** Fetch organizations the user belongs to (VSSPS accounts API). */
export async function getOrganizations(memberId: string, authHeader: string): Promise<string[]> {
  const url = `https://app.vssps.visualstudio.com/_apis/accounts?memberId=${memberId}&api-version=6.0`;
  const response = await fetch(url, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch organizations: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { value: AzureAccount[]; count: number };
  return data.value.map((a) => a.accountName);
}

export async function getProjects(org: string, authHeader: string): Promise<AzureProject[]> {
  const url = `https://dev.azure.com/${org}/_apis/projects?api-version=7.1`;
  const response = await fetch(url, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      'Invalid PAT token. Please check your Personal Access Token has the required scopes: Code (Read), Project and Team (Read)',
    );
  }
  if (response.status === 404) {
    throw new Error(
      'Organization not found. Please check the organization name is correct. It should match the URL: https://dev.azure.com/YOUR-ORG-NAME',
    );
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { value: AzureProject[]; count: number };
  return data.value;
}

export async function getRepositories(org: string, project: string, authHeader: string): Promise<AzureRepository[]> {
  const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/`;
  const response = await fetch(url, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { value: AzureRepository[]; count: number };
  return data.value.filter((repo) => !repo.isDisabled);
}

export async function getPullRequests(
  baseUrl: string,
  repositoryId: string,
  searchCriteria: string,
  authHeader: string,
): Promise<AzurePullRequest[]> {
  const url = `${baseUrl}${repositoryId}/pullrequests?${searchCriteria}`;
  return fetchPaginated<AzurePullRequest>(url, authHeader);
}

/** Check if sourceBranch is fully merged into targetBranch via git diff API. */
export async function checkBranchFullyMerged(
  baseUrl: string,
  repositoryId: string,
  sourceBranch: string,
  targetBranch: string,
  authHeader: string,
): Promise<boolean> {
  const url = `${baseUrl}${repositoryId}/diffs/commits?baseVersion=${targetBranch}&baseVersionType=branch&targetVersion=${sourceBranch}&targetVersionType=branch&api-version=6.0`;

  const response = await fetch(url, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });

  if (!response.ok) return false;

  const data = (await response.json()) as GitDiffResponse;
  return !data.changeCounts || Object.keys(data.changeCounts).length === 0;
}
