import { z } from 'zod/v4';

export const CliOptionsSchema = z.object({
  branch: z.string().optional(),
  repository: z.string().optional(),
  configure: z.boolean().optional(),
  switchProject: z.boolean().optional(),
  help: z.boolean().optional(),
  version: z.boolean().optional(),
});

export type CliOptions = z.infer<typeof CliOptionsSchema>;

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

export function isFulfilledResult<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

export function isRejectedResult<T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

export type BatchOperationResult = {
  total: number;
  successful: number;
  failed: number;
  failedRepos: string[];
};

export type MultiRepositoryResult = {
  statuses: BranchMergeStatus[];
  operationSummary: BatchOperationResult;
};

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

export type GetProjectsResponse = {
  value: Project[];
  count: number;
};

export const ConfigFileSchema = z.object({
  azureDevOpsOrg: z.string().min(1),
  azureDevOpsProject: z.string().min(1),
  version: z.string().default('1.0.0'),
  autoUpdate: z.boolean().optional().default(true),
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

export type RuntimeConfig = {
  azureDevOpsPat: string;
  azureDevOpsOrg: string;
  azureDevOpsProject: string;
  autoUpdate?: boolean;
};

export type SetupState =
  | { type: 'inputPat' }
  | { type: 'validatingPat'; pat: string; org: string }
  | { type: 'inputOrg'; pat: string }
  | { type: 'selectProject'; pat: string; org: string; projects: Project[] }
  | { type: 'savingConfig'; pat: string; org: string; project: string }
  | { type: 'setupComplete' }
  | { type: 'setupError'; error: string; canRetry: boolean };

export type UpdateInfo = {
  readonly currentVersion: string;
  readonly latestVersion: string;
};

export type UpdateCache = {
  readonly lastCheck: number; // Unix timestamp in milliseconds
  readonly latestVersion: string;
};

export type FlatItem = { type: 'group'; groupIndex: number } | { type: 'file'; groupIndex: number; fileIndex: number };

export type PackageManager = 'npm' | 'bun' | 'pnpm' | 'yarn' | 'unknown';

export type AutoUpdateResult = {
  readonly attempted: boolean;
  readonly success: boolean;
  readonly method?: PackageManager;
  readonly version?: string;
  readonly error?: string;
};

export type RepositoryBranches = {
  repositoryId: string;
  repositoryName: string;
  branches: string[];
  fetchedAt: number;
};

export const BranchCacheSchema = z.object({
  lastUpdated: z.number(),
  repositories: z.array(
    z.object({
      repositoryId: z.string(),
      repositoryName: z.string(),
      branches: z.array(z.string()),
      fetchedAt: z.number(),
    }),
  ),
  allBranches: z.array(z.string()),
  version: z.string().default('1.0.0'),
});


export type BranchSuggestion = {
  branchName: string;
  repositories: string[];
  matchScore: number;

export type BranchRef = {
  name: string; 
  objectId: string;
  creator?: {
    displayName: string;
    uniqueName: string;
  };
};

/**
 * API response for branch listing
 */
export type GetBranchRefsResponse = {
  value: BranchRef[];
  count: number;
};

export type BranchCache = z.infer<typeof BranchCacheSchema>;
