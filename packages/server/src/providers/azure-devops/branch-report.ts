import type { BranchMergeStatus, EnvironmentStatus, ServerBranch } from '@fmdt/core';
import type { AzurePullRequest } from './api.ts';
import { checkBranchFullyMerged, getPullRequests } from './api.ts';

interface BranchReportDeps {
  baseUrl: string;
  authHeader: string;
}

/** Get merge status for a single branch in a single repo, across all server branches. */
export async function getBranchMergeStatus(
  deps: BranchReportDeps,
  repositoryId: string,
  branch: string,
  repositoryName: string,
  serverBranches: ServerBranch[],
): Promise<BranchMergeStatus> {
  const prs = await getPullRequests(
    deps.baseUrl,
    repositoryId,
    `searchCriteria.sourceRefName=refs/heads/${branch}&searchCriteria.status=completed`,
    deps.authHeader,
  );

  const environments = buildEnvironments(serverBranches, prs);
  await validateWithDiff(deps, repositoryId, branch, environments);

  return { branch, repository: repositoryName, environments };
}

function buildEnvironments(serverBranches: ServerBranch[], prs: AzurePullRequest[]): EnvironmentStatus[] {
  const sorted = [...prs].sort((a, b) => new Date(b.closedDate).getTime() - new Date(a.closedDate).getTime());

  return serverBranches
    .toSorted((a, b) => a.order - b.order)
    .map((sb) => {
      const match = sorted.find((pr) => {
        const target = pr.targetRefName.trim().substring(11).toLowerCase(); // strip "refs/heads/"
        return target === sb.branch.toLowerCase();
      });

      return {
        name: sb.name,
        branch: sb.branch,
        merged: match !== undefined,
        mergeDate: match?.closedDate ?? null,
        mergedBy: match?.createdBy.displayName ?? null,
        verified: false,
      };
    });
}

async function validateWithDiff(
  deps: BranchReportDeps,
  repositoryId: string,
  branch: string,
  environments: EnvironmentStatus[],
): Promise<void> {
  for (const env of environments) {
    if (!env.merged) continue;
    const fullyMerged = await checkBranchFullyMerged(deps.baseUrl, repositoryId, branch, env.branch, deps.authHeader);
    if (fullyMerged) {
      env.verified = true;
    } else {
      env.merged = false;
      env.mergeDate = null;
      env.mergedBy = null;
      env.verified = false;
    }
  }
}
