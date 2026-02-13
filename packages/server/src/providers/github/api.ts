import { fetchPaginated } from './utils.ts';

// --- GitHub API response shapes (raw, not domain types) ---

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  disabled: boolean;
  archived: boolean;
  topics: string[];
  owner: { login: string };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  created_at: string;
  closed_at: string | null;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user: { login: string } | null;
}

export interface GitHubCompare {
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: Array<{
    sha: string;
    commit: { message: string; author: { name: string; date: string } | null };
  }>;
}

export interface GitHubUser {
  login: string;
}

// --- API functions ---

/** Fetch the authenticated user's login. */
export async function getUser(authHeader: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: authHeader, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as GitHubUser;
}

export async function getOrgs(authHeader: string): Promise<string[]> {
  const response = await fetch('https://api.github.com/user/orgs', {
    headers: { Authorization: authHeader, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch orgs: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Array<{ login: string }>;
  return data.map((o) => o.login);
}

export async function getRepos(org: string, authHeader: string): Promise<GitHubRepo[]> {
  const url = `https://api.github.com/orgs/${org}/repos?type=all`;
  return fetchPaginated<GitHubRepo>(url, authHeader);
}

export async function getPullRequests(
  owner: string,
  repo: string,
  params: string,
  authHeader: string,
): Promise<GitHubPullRequest[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?${params}`;
  return fetchPaginated<GitHubPullRequest>(url, authHeader);
}

/** Compare two branches. Returns ahead_by/behind_by counts + commits. */
export async function compareBranches(
  owner: string,
  repo: string,
  base: string,
  head: string,
  authHeader: string,
): Promise<GitHubCompare | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
  const response = await fetch(url, {
    headers: { Authorization: authHeader, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });

  if (!response.ok) return null;
  return (await response.json()) as GitHubCompare;
}

/** Validate credentials by fetching the authenticated user. */
export async function validateAuth(authHeader: string): Promise<boolean> {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: authHeader, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  return response.ok;
}
