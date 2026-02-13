import type { BranchMergeStatus, EnvironmentStatus, ServerBranch } from '@fmdt/core';
import { compareBranches, getPullRequests } from './api.ts';

interface BranchReportDeps {
  owner: string;
  authHeader: string;
}

/** Get merge status for a single branch in a single repo, across all server branches. */
export async function getBranchMergeStatus(
  deps: BranchReportDeps,
  repoName: string,
  branch: string,
  serverBranches: ServerBranch[],
): Promise<BranchMergeStatus> {
  // Reason: Fetch closed+merged PRs from this branch to each server branch
  const prs = await getPullRequests(deps.owner, repoName, `state=closed&head=${deps.owner}:${branch}`, deps.authHeader);

  // Only include actually merged PRs
  const mergedPRs = prs.filter((pr) => pr.merged_at !== null);

  const environments = buildEnvironments(serverBranches, mergedPRs);
  await validateWithCompare(deps, repoName, branch, environments);

  return { branch, repository: repoName, environments };
}

function buildEnvironments(
  serverBranches: ServerBranch[],
  mergedPRs: Array<{ base: { ref: string }; merged_at: string | null; user: { login: string } | null }>,
): EnvironmentStatus[] {
  const sorted = [...mergedPRs].sort(
    (a, b) => new Date(b.merged_at ?? 0).getTime() - new Date(a.merged_at ?? 0).getTime(),
  );

  return serverBranches
    .toSorted((a, b) => a.order - b.order)
    .map((sb) => {
      const match = sorted.find((pr) => pr.base.ref.toLowerCase() === sb.branch.toLowerCase());

      return {
        name: sb.name,
        branch: sb.branch,
        merged: match !== undefined,
        mergeDate: match?.merged_at ?? null,
        mergedBy: match?.user?.login ?? null,
        verified: false,
      };
    });
}

async function validateWithCompare(
  deps: BranchReportDeps,
  repoName: string,
  branch: string,
  environments: EnvironmentStatus[],
): Promise<void> {
  for (const env of environments) {
    if (!env.merged) continue;
    const compare = await compareBranches(deps.owner, repoName, env.branch, branch, deps.authHeader);
    if (compare && compare.ahead_by === 0) {
      env.verified = true;
    } else {
      // Reason: compare shows head is ahead of base, so branch isn't fully merged
      env.merged = false;
      env.mergeDate = null;
      env.mergedBy = null;
      env.verified = false;
    }
  }
}
