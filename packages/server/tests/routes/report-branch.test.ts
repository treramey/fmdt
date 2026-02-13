import type { AuthInfo, AuthStore, BranchMergeStatus } from '@fmdt/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/index.ts', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../src/providers/index.ts', () => ({
  getProvider: vi.fn(),
}));

import { Hono } from 'hono';
import { Bus } from '../../src/bus/index.ts';
import { loadConfig } from '../../src/config/index.ts';
import { getProvider } from '../../src/providers/index.ts';
import { createReportRoutes } from '../../src/routes/report.ts';

const mockLoadConfig = vi.mocked(loadConfig);
const mockGetProvider = vi.mocked(getProvider);

const mockAuthStore: AuthStore = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

function createTestApp() {
  const app = new Hono();
  app.route('/report', createReportRoutes(mockAuthStore)());
  return app;
}

beforeEach(() => {
  Bus._reset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /report/branch', () => {
  it('returns branch merge statuses', async () => {
    const statuses: BranchMergeStatus[] = [
      {
        branch: 'feature-x',
        repository: 'RepoA',
        environments: [
          { name: 'Dev', branch: 'dev', merged: true, mergeDate: '2024-01-01', mergedBy: 'Alice', verified: true },
        ],
      },
    ];

    mockLoadConfig.mockResolvedValueOnce({
      version: '2.0.0',
      autoUpdate: true,
      activeProject: 'proj1',
      projects: {
        proj1: {
          id: 'proj1',
          name: 'MyProject',
          ref: { provider: 'azure-devops', org: 'org', project: 'proj' },
          serverBranches: [{ name: 'Dev', branch: 'dev', order: 0 }],
          createdAt: '2024-01-01',
        },
      },
    });

    const authInfo: AuthInfo = { type: 'pat', token: 'abc' };
    vi.mocked(mockAuthStore.get).mockResolvedValueOnce(authInfo);

    mockGetProvider.mockReturnValueOnce({
      type: 'azure-devops',
      listOrgs: vi.fn(),
      listProjects: vi.fn(),
      listRepositories: vi.fn(),
      getBranchMergeStatus: vi.fn().mockResolvedValueOnce(statuses),
      getEnvironmentReport: vi.fn(),
      validateCredentials: vi.fn(),
    });

    const app = createTestApp();
    const res = await app.request('/report/branch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: 'feature-x', projectId: 'proj1' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].branch).toBe('feature-x');
  });

  it('returns 400 on invalid request body', async () => {
    const app = createTestApp();
    const res = await app.request('/report/branch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: '' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 when no config exists', async () => {
    mockLoadConfig.mockResolvedValueOnce(null);

    const app = createTestApp();
    const res = await app.request('/report/branch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: 'feature-x', projectId: 'proj1' }),
    });

    // Reason: executeBranchReport throws, Hono default error handler returns 500
    expect(res.status).toBe(500);
  });
});
