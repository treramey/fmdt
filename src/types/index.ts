import { z } from 'zod/v4';

// CLI Options
export const CliOptionsSchema = z.object({
  branch: z.string().optional(),
  repository: z.string().optional(),
  configure: z.boolean().optional(), // NEW: trigger setup flow
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

// Azure DevOps Project type (from API)
export type Project = {
  id: string;
  name: string;
  description: string;
  url: string;
  state: string;
  revision: number;
  visibility: string;
  lastUpdateTime: string;
};

// Projects API response
export type GetProjectsResponse = {
  value: Project[];
  count: number;
};

// Configuration file schema (stored on disk)
export const ConfigFileSchema = z.object({
  azureDevOpsOrg: z.string().min(1),
  azureDevOpsProject: z.string().min(1),
  version: z.string().default('1.0.0'), // For future migrations
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

// Runtime configuration (includes PAT from keyring)
export type RuntimeConfig = {
  azureDevOpsPat: string;
  azureDevOpsOrg: string;
  azureDevOpsProject: string;
};

// Configuration setup state
export type SetupState =
  | { type: 'inputPat' }
  | { type: 'validatingPat'; pat: string; org: string }
  | { type: 'inputOrg'; pat: string }
  | { type: 'selectProject'; pat: string; org: string; projects: Project[] }
  | { type: 'savingConfig'; pat: string; org: string; project: string }
  | { type: 'setupComplete' }
  | { type: 'setupError'; error: string; canRetry: boolean };
