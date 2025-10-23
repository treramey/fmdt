import type {
  BatchOperationResult,
  BranchMergeStatus,
  GetBranchRefsResponse,
  GetProjectsResponse,
  GetPullRequestsResponse,
  GetRepositoriesResponse,
  GitDiffResponse,
  MultiRepositoryResult,
  ParsedPullRequest,
  Project,
  PullRequest,
  PullRequestDetails,
  Repository,
  RepositoryBranches,
  RuntimeConfig,
} from '../types/index.js';
import { isFulfilledResult, isRejectedResult } from '../types/index.js';
import { createAuthHeader } from '../utils/config.js';

const PAGE_SIZE = 101;

export class AzureDevOpsService {
  private readonly authHeader: string;
  private readonly baseUrl: string;
  private readonly org: string;

  constructor(config: RuntimeConfig) {
    // CRITICAL: Config must be provided (loaded asynchronously before creating service)
    this.authHeader = createAuthHeader(config.azureDevOpsPat);
    this.org = config.azureDevOpsOrg;
    this.baseUrl = `https://dev.azure.com/${config.azureDevOpsOrg}/${config.azureDevOpsProject}/_apis/git/repositories/`;
  }

  async getProjects(): Promise<Project[]> {
    const url = `https://dev.azure.com/${this.org}/_apis/projects?api-version=7.1`;

    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });

    // CRITICAL: Distinguish between different error types
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Invalid PAT token. Please check your Personal Access Token has ' +
          'the required scopes: Code (Read), Project and Team (Read)',
      );
    }

    if (response.status === 404) {
      throw new Error(
        'Organization not found. Please check the organization name is correct. ' +
          'It should match the URL: https://dev.azure.com/YOUR-ORG-NAME',
      );
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GetProjectsResponse;
    return data.value;
  }

  async getRepositories(): Promise<Repository[]> {
    const response = await fetch(this.baseUrl, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GetRepositoriesResponse;
    return data.value.filter((repo) => !repo.isDisabled);
  }

  async getPullRequests(repositoryId: string, searchCriteria: string): Promise<PullRequest[]> {
    const pullRequests: PullRequest[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${this.baseUrl}${repositoryId}/pullrequests?${searchCriteria}&$skip=${page * PAGE_SIZE}&$top=${PAGE_SIZE}`;

      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pull requests: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as GetPullRequestsResponse;
      pullRequests.push(...data.value);

      hasMore = data.value.length === PAGE_SIZE;
      page++;
    }

    return pullRequests;
  }

  async getPullRequestsForSourceBranch(repositoryId: string, branch: string): Promise<ParsedPullRequest | null> {
    const pullRequests = await this.getPullRequests(
      repositoryId,
      `searchCriteria.sourceRefName=refs/heads/${branch}&searchCriteria.status=completed`,
    );

    if (pullRequests.length === 0) {
      return null;
    }

    const firstPullRequest = pullRequests[0];
    if (!firstPullRequest) {
      return null;
    }

    const pullRequestDetails: PullRequestDetails[] = pullRequests.map((pr) => ({
      creator: pr.createdBy.displayName,
      closedDate: pr.closedDate,
      targetBranch: pr.targetRefName.trim().substring(11), // Remove 'refs/heads/'
    }));

    return {
      projectName: firstPullRequest.repository.name,
      branchName: branch,
      sourceRefName: firstPullRequest.sourceRefName,
      pullRequestsDetails: pullRequestDetails,
      commitDetails: {
        commitId: firstPullRequest.lastMergeSourceCommit.commitId,
        sourceLastCommitDate: '',
      },
    };
  }

  async getBranchMergeStatus(repositoryId: string, branch: string, repositoryName: string): Promise<BranchMergeStatus> {
    const parsedPR = await this.getPullRequestsForSourceBranch(repositoryId, branch);

    const status: BranchMergeStatus = {
      branch,
      repository: repositoryName,
      mergedTo: {
        dev: { merged: false, date: null, mergedBy: null },
        qa: { merged: false, date: null, mergedBy: null },
        staging: { merged: false, date: null, mergedBy: null },
        master: { merged: false, date: null, mergedBy: null },
      },
    };

    if (!parsedPR || !parsedPR.pullRequestsDetails) {
      return status;
    }

    const sortedPRs = [...parsedPR.pullRequestsDetails].sort((a, b) => {
      return new Date(b.closedDate).getTime() - new Date(a.closedDate).getTime();
    });

    for (const pr of sortedPRs) {
      const targetBranch = pr.targetBranch.toLowerCase();

      if (targetBranch === 'dev' && !status.mergedTo.dev.merged) {
        status.mergedTo.dev = {
          merged: true,
          date: pr.closedDate,
          mergedBy: pr.creator,
        };
      } else if (targetBranch === 'qa' && !status.mergedTo.qa.merged) {
        status.mergedTo.qa = {
          merged: true,
          date: pr.closedDate,
          mergedBy: pr.creator,
        };
      } else if (targetBranch === 'staging' && !status.mergedTo.staging.merged) {
        status.mergedTo.staging = {
          merged: true,
          date: pr.closedDate,
          mergedBy: pr.creator,
        };
      } else if ((targetBranch === 'master' || targetBranch === 'main') && !status.mergedTo.master.merged) {
        status.mergedTo.master = {
          merged: true,
          date: pr.closedDate,
          mergedBy: pr.creator,
        };
      }
    }

    await this.validateMergesWithDiff(repositoryId, branch, status);

    return status;
  }

  private async checkBranchFullyMerged(
    repositoryId: string,
    sourceBranch: string,
    targetBranch: string,
  ): Promise<boolean> {
    const url = `${this.baseUrl}${repositoryId}/diffs/commits?baseVersion=${targetBranch}&baseVersionType=branch&targetVersion=${sourceBranch}&targetVersionType=branch&api-version=6.0`;

    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as GitDiffResponse;
    const changeCounts = data.changeCounts;

    return !changeCounts || Object.keys(changeCounts).length === 0;
  }

  private async validateMergesWithDiff(repositoryId: string, branch: string, status: BranchMergeStatus): Promise<void> {
    const branches = ['dev', 'qa', 'staging', 'master'] as const;

    for (const targetBranch of branches) {
      if (status.mergedTo[targetBranch].merged) {
        const isFullyMerged = await this.checkBranchFullyMerged(repositoryId, branch, targetBranch);

        if (!isFullyMerged) {
          status.mergedTo[targetBranch] = { merged: false, date: null, mergedBy: null };
        }
      }
    }
  }

  async getBatchBranchMergeStatus(branch: string): Promise<MultiRepositoryResult> {
    // STEP 1: Fetch all repositories
    const repositories = await this.getRepositories();

    // STEP 2: Create array of promises for parallel execution
    const promises = repositories.map((repo) => this.getBranchMergeStatus(repo.id, branch, repo.name));

    // STEP 3: Execute all promises in parallel, wait for all to settle
    const results = await Promise.allSettled(promises);

    // STEP 4: Separate successful and failed results using type guards
    const successful = results.filter(isFulfilledResult).map((result) => result.value);

    // Track failed repos by mapping over all results and filtering
    const failed: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result && isRejectedResult(result)) {
        failed.push(repositories[i]?.name ?? 'Unknown');
      }
    }

    // STEP 5: Filter out repos where branch doesn't exist
    // A branch exists if it has been merged to ANY environment
    const branchExists = successful.filter((status) => {
      const environments = Object.values(status.mergedTo);
      return environments.some((env) => env.merged);
    });

    // STEP 6: Build operation summary
    const operationSummary: BatchOperationResult = {
      total: repositories.length,
      successful: branchExists.length,
      failed: failed.length,
      failedRepos: failed,
    };

    return {
      statuses: branchExists,
      operationSummary,
    };
  }

  async getAllBranches(): Promise<RepositoryBranches[]> {
    // STEP 1: Fetch all repositories
    const repositories = await this.getRepositories();

    // STEP 2: Create promises for parallel branch fetching
    const promises = repositories.map(async (repo) => {
      const url = `${this.baseUrl}${repo.id}/refs?filter=heads/&api-version=7.1`;

      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.status}`);
      }

      const data = (await response.json()) as GetBranchRefsResponse;

      // CRITICAL: Strip "refs/heads/" prefix
      const branches = data.value.map((ref) => ref.name.replace('refs/heads/', ''));

      return {
        repositoryId: repo.id,
        repositoryName: repo.name,
        branches,
        fetchedAt: Date.now(),
      };
    });

    // STEP 3: Execute in parallel with allSettled
    const results = await Promise.allSettled(promises);

    // STEP 4: Filter successful results
    const successful = results.filter(isFulfilledResult).map((result) => result.value);

    return successful; // Return what we got, even if some failed
  }
}
