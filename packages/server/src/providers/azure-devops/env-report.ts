import type {
  EnvironmentDetail,
  EnvironmentReport,
  MergedPR,
  OpenPR,
  RepoEnvironmentDetail,
  ServerBranch,
  WorkItemStatus,
} from '@fmdt/core';
import type { AzureRepository } from './api.ts';
import { getPullRequests } from './api.ts';
import { extractWorkItemIds } from './utils.ts';

interface EnvReportDeps {
  baseUrl: string;
  authHeader: string;
}

export async function getEnvironmentReport(
  deps: EnvReportDeps,
  projectName: string,
  repos: AzureRepository[],
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
  repo: AzureRepository,
  serverBranch: ServerBranch,
): Promise<RepoEnvironmentDetail> {
  // Fetch merged PRs targeting this server branch
  const mergedPRs = await getMergedPRs(deps, repo.id, serverBranch.branch);

  // Fetch open PRs targeting this server branch
  const openPRs = await getOpenPRs(deps, repo.id, serverBranch.branch);

  // Extract work items from branch names
  const workItems = rollUpWorkItems(mergedPRs, openPRs, serverBranch.name);

  return {
    repository: repo.name,
    mergedPRs,
    commitsAhead: [], // Reason: commit-ahead computation requires separate API call; deferred
    openPRs,
    workItems,
  };
}

async function getMergedPRs(deps: EnvReportDeps, repoId: string, targetBranch: string): Promise<MergedPR[]> {
  const prs = await getPullRequests(
    deps.baseUrl,
    repoId,
    `searchCriteria.targetRefName=refs/heads/${targetBranch}&searchCriteria.status=completed`,
    deps.authHeader,
  );

  return prs.map((pr) => ({
    id: pr.pullRequestId,
    title: pr.title,
    sourceBranch: pr.sourceRefName.substring(11), // strip refs/heads/
    mergedDate: pr.closedDate,
    mergedBy: pr.createdBy.displayName,
    workItemIds: extractWorkItemIds(pr.sourceRefName.substring(11)),
  }));
}

async function getOpenPRs(deps: EnvReportDeps, repoId: string, targetBranch: string): Promise<OpenPR[]> {
  const prs = await getPullRequests(
    deps.baseUrl,
    repoId,
    `searchCriteria.targetRefName=refs/heads/${targetBranch}&searchCriteria.status=active`,
    deps.authHeader,
  );

  return prs.map((pr) => ({
    id: pr.pullRequestId,
    title: pr.title,
    sourceBranch: pr.sourceRefName.substring(11),
    author: pr.createdBy.displayName,
    createdDate: pr.creationDate,
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
