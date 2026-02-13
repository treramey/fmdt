import type {
  CommitSummary,
  EnvironmentDetail,
  EnvironmentReport,
  MergedPR,
  OpenPR,
  RepoEnvironmentDetail,
  ServerBranch,
  WorkItemStatus,
} from '@fmdt/core';
import type { GitHubRepo } from './api.ts';
import { compareBranches, getPullRequests } from './api.ts';
import { extractWorkItemIds } from './utils.ts';

interface EnvReportDeps {
  owner: string;
  authHeader: string;
}

export async function getEnvironmentReport(
  deps: EnvReportDeps,
  projectName: string,
  repos: GitHubRepo[],
  serverBranches: ServerBranch[],
  filterEnvs?: string[],
): Promise<EnvironmentReport> {
  const branches = filterEnvs ? serverBranches.filter((sb) => filterEnvs.includes(sb.name)) : serverBranches;

  const environments: EnvironmentDetail[] = [];

  for (const sb of branches.toSorted((a, b) => a.order - b.order)) {
    const repoDetails: RepoEnvironmentDetail[] = [];

    for (const repo of repos) {
      const detail = await getRepoEnvironmentDetail(deps, repo, sb);
      repoDetails.push(detail);
    }

    environments.push({ name: sb.name, branch: sb.branch, repositories: repoDetails });
  }

  return { project: projectName, environments };
}

async function getRepoEnvironmentDetail(
  deps: EnvReportDeps,
  repo: GitHubRepo,
  serverBranch: ServerBranch,
): Promise<RepoEnvironmentDetail> {
  const mergedPRs = await getMergedPRs(deps, repo.name, serverBranch.branch);
  const openPRs = await getOpenPRs(deps, repo.name, serverBranch.branch);
  const commitsAhead = await getCommitsAhead(deps, repo, serverBranch.branch);
  const workItems = rollUpWorkItems(mergedPRs, openPRs, serverBranch.name);

  return { repository: repo.name, mergedPRs, commitsAhead, openPRs, workItems };
}

async function getMergedPRs(deps: EnvReportDeps, repoName: string, targetBranch: string): Promise<MergedPR[]> {
  const prs = await getPullRequests(deps.owner, repoName, `state=closed&base=${targetBranch}`, deps.authHeader);

  return prs
    .filter((pr) => pr.merged_at !== null)
    .map((pr) => ({
      id: pr.number,
      title: pr.title,
      sourceBranch: pr.head.ref,
      mergedDate: pr.merged_at as string,
      mergedBy: pr.user?.login ?? 'unknown',
      workItemIds: extractWorkItemIds(pr.head.ref),
    }));
}

async function getOpenPRs(deps: EnvReportDeps, repoName: string, targetBranch: string): Promise<OpenPR[]> {
  const prs = await getPullRequests(deps.owner, repoName, `state=open&base=${targetBranch}`, deps.authHeader);

  return prs.map((pr) => ({
    id: pr.number,
    title: pr.title,
    sourceBranch: pr.head.ref,
    author: pr.user?.login ?? 'unknown',
    createdDate: pr.created_at,
  }));
}

async function getCommitsAhead(deps: EnvReportDeps, repo: GitHubRepo, targetBranch: string): Promise<CommitSummary[]> {
  const compare = await compareBranches(deps.owner, repo.name, targetBranch, repo.default_branch, deps.authHeader);
  if (!compare) return [];

  return compare.commits.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name ?? 'unknown',
    date: c.commit.author?.date ?? '',
  }));
}

function rollUpWorkItems(mergedPRs: MergedPR[], openPRs: OpenPR[], envName: string): WorkItemStatus[] {
  const map = new Map<string, { branches: Set<string>; environments: Set<string> }>();

  for (const pr of mergedPRs) {
    for (const id of pr.workItemIds) {
      const entry = map.get(id) ?? { branches: new Set(), environments: new Set() };
      entry.branches.add(pr.sourceBranch);
      entry.environments.add(envName);
      map.set(id, entry);
    }
  }

  for (const pr of openPRs) {
    const ids = extractWorkItemIds(pr.sourceBranch);
    for (const id of ids) {
      const entry = map.get(id) ?? { branches: new Set(), environments: new Set() };
      entry.branches.add(pr.sourceBranch);
      map.set(id, entry);
    }
  }

  return [...map.entries()].map(([id, { branches, environments }]) => ({
    id,
    branches: [...branches],
    environments: [...environments],
  }));
}
