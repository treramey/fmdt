import { z } from 'zod/v4';

// CLI Options
export const CliOptionsSchema = z.object({
  branch: z.string().optional(),
  repository: z.string().optional(),
  help: z.boolean().optional(),
  version: z.boolean().optional(),
});

export type CliOptions = z.infer<typeof CliOptionsSchema>;

// Azure DevOps API Types
export type Repository = {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
  size: number;
  isDisabled: boolean;
  project: {
    id: string;
    name: string;
    state: string;
    visibility: string;
    lastUpdateTime: string;
  };
};

export type PullRequest = {
  pullRequestId: number;
  sourceRefName: string;
  targetRefName: string;
  status: string;
  creationDate: string;
  closedDate: string;
  title: string;
  description: string;
  createdBy: {
    displayName: string;
    uniqueName: string;
    id: string;
    imageUrl: string;
  };
  lastMergeSourceCommit: {
    commitId: string;
    url: string;
  };
  lastMergeTargetCommit: {
    commitId: string;
    url: string;
  };
  repository: {
    id: string;
    name: string;
    url: string;
  };
};

export type PullRequestDetails = {
  creator: string;
  closedDate: string;
  targetBranch: string;
};

export type ParsedPullRequest = {
  projectName: string;
  branchName: string;
  sourceRefName: string;
  pullRequestsDetails: PullRequestDetails[];
  commitDetails: {
    commitId: string;
    sourceLastCommitDate: string;
  } | null;
};

// API Response Types
export type GetRepositoriesResponse = {
  value: Repository[];
  count: number;
};

export type GetPullRequestsResponse = {
  value: PullRequest[];
  count: number;
};

export type GitDiffResponse = {
  changeCounts: Record<string, number>;
  changes: unknown[];
};

// Branch Merge Status
export type BranchMergeStatus = {
  branch: string;
  repository: string;
  mergedTo: {
    dev: {
      merged: boolean;
      date: string | null;
      mergedBy: string | null;
    };
    qa: {
      merged: boolean;
      date: string | null;
      mergedBy: string | null;
    };
    staging: {
      merged: boolean;
      date: string | null;
      mergedBy: string | null;
    };
    master: {
      merged: boolean;
      date: string | null;
      mergedBy: string | null;
    };
  };
};

// Environment Configuration
export type EnvironmentConfig = {
  azureDevOpsPat: string;
  azureDevOpsOrg: string;
  azureDevOpsProject: string;
};

// Type guards for Promise.allSettled results
export function isFulfilledResult<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

export function isRejectedResult<T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

// Batch operation result tracking
export type BatchOperationResult = {
  total: number;
  successful: number;
  failed: number;
  failedRepos: string[];
};

// Multi-repository merge status display props
export type MultiRepositoryResult = {
  statuses: BranchMergeStatus[];
  operationSummary: BatchOperationResult;
};
