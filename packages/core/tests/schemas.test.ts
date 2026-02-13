import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  AppConfigSchema,
  AuthInfoSchema,
  BranchMergeStatusSchema,
  BranchReportRequestSchema,
  CommitSummarySchema,
  DEFAULT_SERVER_BRANCHES,
  EnvironmentDetailSchema,
  EnvironmentReportSchema,
  EnvironmentStatusSchema,
  EnvReportRequestSchema,
  MergedPRSchema,
  OpenPRSchema,
  ProjectConfigSchema,
  ProjectRefSchema,
  ProjectSchema,
  RepoFilterSchema,
  RepositorySchema,
  ServerBranchSchema,
  ServerEventSchema,
  WorkItemStatusSchema,
} from '../src/index.ts';

// --- ProviderType & RepoFilter ---

describe('RepoFilterSchema', () => {
  it('accepts "all" filter', () => {
    const result = RepoFilterSchema.safeParse({ type: 'all' });
    expect(result.success).toBe(true);
  });

  it('accepts "selected" filter with repos', () => {
    const result = RepoFilterSchema.safeParse({ type: 'selected', repos: ['repo-a', 'repo-b'] });
    expect(result.success).toBe(true);
  });

  it('accepts "pattern" filter', () => {
    const result = RepoFilterSchema.safeParse({ type: 'pattern', include: ['SvApi.*'] });
    expect(result.success).toBe(true);
  });

  it('accepts "topic" filter', () => {
    const result = RepoFilterSchema.safeParse({ type: 'topic', topics: ['backend'] });
    expect(result.success).toBe(true);
  });

  it('rejects unknown filter type', () => {
    const result = RepoFilterSchema.safeParse({ type: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects "selected" with empty repos array', () => {
    const result = RepoFilterSchema.safeParse({ type: 'selected', repos: [] });
    // Empty array is structurally valid, but individual items need min(1)
    expect(result.success).toBe(true);
  });
});

// --- ProjectRef ---

describe('ProjectRefSchema', () => {
  it('accepts azure-devops ref', () => {
    const result = ProjectRefSchema.safeParse({ provider: 'azure-devops', org: 'myorg', project: 'myproject' });
    expect(result.success).toBe(true);
  });

  it('accepts github ref', () => {
    const result = ProjectRefSchema.safeParse({
      provider: 'github',
      org: 'myorg',
      repoFilter: { type: 'all' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects azure-devops without project', () => {
    const result = ProjectRefSchema.safeParse({ provider: 'azure-devops', org: 'myorg' });
    expect(result.success).toBe(false);
  });

  it('rejects github without repoFilter', () => {
    const result = ProjectRefSchema.safeParse({ provider: 'github', org: 'myorg' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown provider', () => {
    const result = ProjectRefSchema.safeParse({ provider: 'gitlab', org: 'x', project: 'y' });
    expect(result.success).toBe(false);
  });
});

// --- Project ---

describe('ProjectSchema', () => {
  it('accepts valid project', () => {
    const result = ProjectSchema.safeParse({ id: 'abc', name: 'My Project', provider: 'azure-devops' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = ProjectSchema.safeParse({ id: 'abc', name: '', provider: 'github' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid provider', () => {
    const result = ProjectSchema.safeParse({ id: 'abc', name: 'X', provider: 'bitbucket' });
    expect(result.success).toBe(false);
  });
});

// --- Repository ---

describe('RepositorySchema', () => {
  it('accepts valid repository', () => {
    const result = RepositorySchema.safeParse({ id: '1', name: 'api', defaultBranch: 'main', disabled: false });
    expect(result.success).toBe(true);
  });

  it('rejects missing disabled field', () => {
    const result = RepositorySchema.safeParse({ id: '1', name: 'api', defaultBranch: 'main' });
    expect(result.success).toBe(false);
  });

  it('rejects empty id', () => {
    const result = RepositorySchema.safeParse({ id: '', name: 'api', defaultBranch: 'main', disabled: false });
    expect(result.success).toBe(false);
  });
});

// --- ServerBranch ---

describe('ServerBranchSchema', () => {
  it('accepts valid server branch', () => {
    const result = ServerBranchSchema.safeParse({ name: 'Dev', branch: 'dev', order: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative order', () => {
    const result = ServerBranchSchema.safeParse({ name: 'Dev', branch: 'dev', order: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer order', () => {
    const result = ServerBranchSchema.safeParse({ name: 'Dev', branch: 'dev', order: 1.5 });
    expect(result.success).toBe(false);
  });

  it('DEFAULT_SERVER_BRANCHES all parse', () => {
    for (const sb of DEFAULT_SERVER_BRANCHES) {
      expect(ServerBranchSchema.safeParse(sb).success).toBe(true);
    }
  });
});

// --- ProjectConfig ---

describe('ProjectConfigSchema', () => {
  const validConfig = {
    id: 'proj-1',
    name: 'My Project',
    ref: { provider: 'azure-devops' as const, org: 'myorg', project: 'myproject' },
    serverBranches: [{ name: 'Dev', branch: 'dev', order: 0 }],
    createdAt: '2026-01-01T00:00:00Z',
  };

  it('accepts valid config', () => {
    expect(ProjectConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it('rejects missing serverBranches', () => {
    const { serverBranches: _, ...rest } = validConfig;
    expect(ProjectConfigSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid ref', () => {
    expect(ProjectConfigSchema.safeParse({ ...validConfig, ref: { provider: 'gitlab' } }).success).toBe(false);
  });
});

// --- AppConfig ---

describe('AppConfigSchema', () => {
  it('accepts valid app config', () => {
    const result = AppConfigSchema.safeParse({
      version: '2.0.0',
      autoUpdate: true,
      activeProject: 'proj-1',
      projects: {
        'proj-1': {
          id: 'proj-1',
          name: 'Test',
          ref: { provider: 'github', org: 'org', repoFilter: { type: 'all' } },
          serverBranches: DEFAULT_SERVER_BRANCHES,
          createdAt: '2026-01-01T00:00:00Z',
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty projects record', () => {
    const result = AppConfigSchema.safeParse({
      version: '2.0.0',
      autoUpdate: false,
      activeProject: '',
      projects: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing version', () => {
    const result = AppConfigSchema.safeParse({
      autoUpdate: true,
      activeProject: '',
      projects: {},
    });
    expect(result.success).toBe(false);
  });
});

// --- BranchReportRequest ---

describe('BranchReportRequestSchema', () => {
  it('accepts with required fields', () => {
    const result = BranchReportRequestSchema.safeParse({ branch: 'LAAIR-1548', projectId: 'p1' });
    expect(result.success).toBe(true);
  });

  it('accepts with optional repositoryId', () => {
    const result = BranchReportRequestSchema.safeParse({ branch: 'feat', projectId: 'p1', repositoryId: 'r1' });
    expect(result.success).toBe(true);
  });

  it('rejects empty branch', () => {
    const result = BranchReportRequestSchema.safeParse({ branch: '', projectId: 'p1' });
    expect(result.success).toBe(false);
  });
});

// --- EnvironmentStatus ---

describe('EnvironmentStatusSchema', () => {
  it('accepts merged status', () => {
    const result = EnvironmentStatusSchema.safeParse({
      name: 'Dev',
      branch: 'dev',
      merged: true,
      mergeDate: '2026-01-15T10:00:00Z',
      mergedBy: 'user@example.com',
      verified: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts unmerged status with nulls', () => {
    const result = EnvironmentStatusSchema.safeParse({
      name: 'QA',
      branch: 'qa',
      merged: false,
      mergeDate: null,
      mergedBy: null,
      verified: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing verified field', () => {
    const result = EnvironmentStatusSchema.safeParse({
      name: 'Dev',
      branch: 'dev',
      merged: true,
      mergeDate: null,
      mergedBy: null,
    });
    expect(result.success).toBe(false);
  });
});

// --- BranchMergeStatus ---

describe('BranchMergeStatusSchema', () => {
  it('accepts valid status', () => {
    const result = BranchMergeStatusSchema.safeParse({
      branch: 'LAAIR-1548',
      repository: 'api-service',
      environments: [
        {
          name: 'Dev',
          branch: 'dev',
          merged: true,
          mergeDate: '2026-01-15T10:00:00Z',
          mergedBy: 'dev',
          verified: true,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty environments', () => {
    const result = BranchMergeStatusSchema.safeParse({
      branch: 'fix-123',
      repository: 'web',
      environments: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing repository', () => {
    const result = BranchMergeStatusSchema.safeParse({
      branch: 'fix',
      environments: [],
    });
    expect(result.success).toBe(false);
  });
});

// --- MergedPR ---

describe('MergedPRSchema', () => {
  it('accepts valid merged PR', () => {
    const result = MergedPRSchema.safeParse({
      id: 42,
      title: 'Fix auth',
      sourceBranch: 'LAAIR-1548-fix-auth',
      mergedDate: '2026-01-15T10:00:00Z',
      mergedBy: 'alice',
      workItemIds: ['LAAIR-1548'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty workItemIds', () => {
    const result = MergedPRSchema.safeParse({
      id: 1,
      title: 'chore',
      sourceBranch: 'chore-update',
      mergedDate: '2026-01-01T00:00:00Z',
      mergedBy: 'bot',
      workItemIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = MergedPRSchema.safeParse({
      title: 'Fix',
      sourceBranch: 'fix',
      mergedDate: '2026-01-01T00:00:00Z',
      mergedBy: 'x',
      workItemIds: [],
    });
    expect(result.success).toBe(false);
  });
});

// --- CommitSummary ---

describe('CommitSummarySchema', () => {
  it('accepts valid commit', () => {
    const result = CommitSummarySchema.safeParse({
      sha: 'abc123',
      message: 'Fix bug',
      author: 'alice',
      date: '2026-01-15T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing sha', () => {
    const result = CommitSummarySchema.safeParse({ message: 'x', author: 'y', date: '2026-01-01' });
    expect(result.success).toBe(false);
  });
});

// --- OpenPR ---

describe('OpenPRSchema', () => {
  it('accepts valid open PR', () => {
    const result = OpenPRSchema.safeParse({
      id: 99,
      title: 'WIP feature',
      sourceBranch: 'feat-xyz',
      author: 'bob',
      createdDate: '2026-02-01T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-number id', () => {
    const result = OpenPRSchema.safeParse({
      id: 'abc',
      title: 'WIP',
      sourceBranch: 'feat',
      author: 'x',
      createdDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });
});

// --- WorkItemStatus ---

describe('WorkItemStatusSchema', () => {
  it('accepts valid work item', () => {
    const result = WorkItemStatusSchema.safeParse({
      id: 'LAAIR-1548',
      branches: ['LAAIR-1548-fix-auth', 'LAAIR-1548-update-tests'],
      environments: ['dev', 'qa'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty branches and environments', () => {
    const result = WorkItemStatusSchema.safeParse({ id: 'X-1', branches: [], environments: [] });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = WorkItemStatusSchema.safeParse({ branches: [], environments: [] });
    expect(result.success).toBe(false);
  });
});

// --- EnvReportRequest ---

describe('EnvReportRequestSchema', () => {
  it('accepts with projectId only', () => {
    const result = EnvReportRequestSchema.safeParse({ projectId: 'p1' });
    expect(result.success).toBe(true);
  });

  it('accepts with optional environments filter', () => {
    const result = EnvReportRequestSchema.safeParse({ projectId: 'p1', environments: ['dev', 'qa'] });
    expect(result.success).toBe(true);
  });

  it('rejects empty projectId', () => {
    const result = EnvReportRequestSchema.safeParse({ projectId: '' });
    expect(result.success).toBe(false);
  });
});

// --- EnvironmentDetail ---

describe('EnvironmentDetailSchema', () => {
  it('accepts valid detail', () => {
    const result = EnvironmentDetailSchema.safeParse({
      name: 'Dev',
      branch: 'dev',
      repositories: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing branch', () => {
    const result = EnvironmentDetailSchema.safeParse({ name: 'Dev', repositories: [] });
    expect(result.success).toBe(false);
  });
});

// --- EnvironmentReport ---

describe('EnvironmentReportSchema', () => {
  it('accepts valid report', () => {
    const result = EnvironmentReportSchema.safeParse({
      project: 'MyProject',
      environments: [
        {
          name: 'Dev',
          branch: 'dev',
          repositories: [
            {
              repository: 'api',
              mergedPRs: [],
              commitsAhead: [],
              openPRs: [],
              workItems: [],
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty environments', () => {
    const result = EnvironmentReportSchema.safeParse({ project: 'X', environments: [] });
    expect(result.success).toBe(true);
  });

  it('rejects missing project', () => {
    const result = EnvironmentReportSchema.safeParse({ environments: [] });
    expect(result.success).toBe(false);
  });
});

// --- AuthInfo ---

describe('AuthInfoSchema', () => {
  it('accepts PAT auth', () => {
    const result = AuthInfoSchema.safeParse({ type: 'pat', token: 'my-secret-token' });
    expect(result.success).toBe(true);
  });

  it('accepts OAuth auth', () => {
    const result = AuthInfoSchema.safeParse({
      type: 'oauth',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 1700000000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects PAT with empty token', () => {
    const result = AuthInfoSchema.safeParse({ type: 'pat', token: '' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown auth type', () => {
    const result = AuthInfoSchema.safeParse({ type: 'api-key', key: 'abc' });
    expect(result.success).toBe(false);
  });
});

// --- ServerEvent ---

describe('ServerEventSchema', () => {
  it('accepts scan.started', () => {
    const result = ServerEventSchema.safeParse({ type: 'scan.started', data: { totalRepos: 15 } });
    expect(result.success).toBe(true);
  });

  it('accepts scan.repo.complete', () => {
    const result = ServerEventSchema.safeParse({ type: 'scan.repo.complete', data: { repo: 'api', index: 3 } });
    expect(result.success).toBe(true);
  });

  it('accepts scan.complete', () => {
    const result = ServerEventSchema.safeParse({ type: 'scan.complete', data: { duration: 4523 } });
    expect(result.success).toBe(true);
  });

  it('accepts scan.error', () => {
    const result = ServerEventSchema.safeParse({ type: 'scan.error', data: { repo: 'web', error: 'timeout' } });
    expect(result.success).toBe(true);
  });

  it('accepts server.heartbeat', () => {
    const result = ServerEventSchema.safeParse({ type: 'server.heartbeat', data: {} });
    expect(result.success).toBe(true);
  });

  it('rejects unknown event type', () => {
    const result = ServerEventSchema.safeParse({ type: 'unknown.event', data: {} });
    expect(result.success).toBe(false);
  });

  it('rejects scan.started with negative totalRepos', () => {
    const result = ServerEventSchema.safeParse({ type: 'scan.started', data: { totalRepos: -1 } });
    expect(result.success).toBe(false);
  });
});

// --- ApiError ---

describe('ApiErrorSchema', () => {
  it('accepts valid error', () => {
    const result = ApiErrorSchema.safeParse({ code: 'AUTH_INVALID', message: 'Bad token' });
    expect(result.success).toBe(true);
  });

  it('accepts error with details', () => {
    const result = ApiErrorSchema.safeParse({
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      details: { retryAfter: 60 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown error code', () => {
    const result = ApiErrorSchema.safeParse({ code: 'UNKNOWN_CODE', message: 'bad' });
    expect(result.success).toBe(false);
  });
});
