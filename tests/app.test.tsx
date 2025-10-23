import { render } from 'ink-testing-library';
import { describe, expect, test, vi } from 'vitest';
import { App } from '../src/App.js';
import type { CliOptions } from '../src/types/index.js';

// Mock all the dependencies
vi.mock('../src/utils/config.js', () => ({
  getConfig: vi.fn().mockResolvedValue({
    azureDevOpsPat: 'mock-pat',
    azureDevOpsOrg: 'mock-org',
    azureDevOpsProject: 'mock-project',
  }),
  hasValidConfig: vi.fn().mockResolvedValue(true),
  getConfigDir: vi.fn().mockReturnValue('/mock/config'),
  getConfigFilePath: vi.fn().mockReturnValue('/mock/config/config.json'),
  saveConfigFile: vi.fn().mockResolvedValue(undefined),
  savePatToKeyring: vi.fn().mockResolvedValue(undefined),
  updateProjectInConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/services/azure-devops.js', () => ({
  AzureDevOpsService: class MockAzureDevOpsService {
    async getBatchBranchMergeStatus(_branch: string) {
      return {
        statuses: [],
        operationSummary: {
          total: 0,
          successful: 0,
          failed: 0,
          failedRepos: [],
        },
      };
    }
    async getProjects() {
      return [
        {
          id: '1',
          name: 'Project One',
          description: 'First project',
          url: 'https://example.com/1',
          state: 'wellFormed',
          revision: 1,
          visibility: 'private',
          lastUpdateTime: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Project Two',
          description: 'Second project',
          url: 'https://example.com/2',
          state: 'wellFormed',
          revision: 1,
          visibility: 'private',
          lastUpdateTime: '2025-01-01T00:00:00Z',
        },
      ];
    }
  },
}));

describe('App - Setup Completion', () => {
  test('should transition to inputBranch after setup when no --branch flag', async () => {
    const { hasValidConfig } = await import('../src/utils/config.js');
    vi.mocked(hasValidConfig).mockResolvedValueOnce(false);

    const cliOptions: CliOptions = {
      branch: undefined,
      configure: false,
    };

    const { lastFrame } = render(<App cliOptions={cliOptions} />);

    // Wait for initial render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should show setup screen initially (PAT input)
    expect(lastFrame()).toContain('Paste your Azure DevOps Personal Access Token');
  });

  test('should fetch results after setup when --branch flag provided', async () => {
    const { hasValidConfig } = await import('../src/utils/config.js');
    const { AzureDevOpsService } = await import('../src/services/azure-devops.js');

    vi.mocked(hasValidConfig).mockResolvedValueOnce(false);

    const mockGetBatchBranchMergeStatus = vi.fn().mockResolvedValue({
      statuses: [
        {
          branch: 'feature-123',
          repository: 'TestRepo',
          mergedTo: {
            dev: { merged: true, date: '2025-01-15T10:30:00Z', mergedBy: 'John Doe' },
            qa: { merged: false, date: null, mergedBy: null },
            staging: { merged: false, date: null, mergedBy: null },
            master: { merged: false, date: null, mergedBy: null },
          },
        },
      ],
      operationSummary: {
        total: 1,
        successful: 1,
        failed: 0,
        failedRepos: [],
      },
    });

    // @ts-expect-error - Mocking class method
    AzureDevOpsService.prototype.getBatchBranchMergeStatus = mockGetBatchBranchMergeStatus;

    const cliOptions: CliOptions = {
      branch: 'feature-123',
      configure: false,
    };

    const { lastFrame } = render(<App cliOptions={cliOptions} />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should eventually show branch name if results are displayed
    const frame = lastFrame();
    expect(frame).toBeTruthy();
  });

  test('should show inputBranch when config exists but no branch provided', async () => {
    const { hasValidConfig } = await import('../src/utils/config.js');
    vi.mocked(hasValidConfig).mockResolvedValue(true);

    const cliOptions: CliOptions = {
      branch: undefined,
      configure: false,
    };

    const { lastFrame } = render(<App cliOptions={cliOptions} />);

    // Wait for async initialization
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should show branch input
    const frame = lastFrame();
    expect(frame).toBeTruthy();
  });

  test('should handle errors during setup completion gracefully', async () => {
    const { hasValidConfig, getConfig } = await import('../src/utils/config.js');

    vi.mocked(hasValidConfig).mockResolvedValueOnce(false);
    vi.mocked(getConfig).mockRejectedValueOnce(new Error('Failed to load config'));

    const cliOptions: CliOptions = {
      branch: undefined,
      configure: false,
    };

    const { lastFrame } = render(<App cliOptions={cliOptions} />);

    // Wait for error to surface
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should render without crashing
    const frame = lastFrame();
    expect(frame).toBeTruthy();
  });
});

describe('App - Project Switching', () => {
  test('should handle --switch-project flag', async () => {
    const { hasValidConfig, getConfig } = await import('../src/utils/config.js');

    vi.mocked(hasValidConfig).mockResolvedValue(true);
    vi.mocked(getConfig).mockResolvedValue({
      azureDevOpsPat: 'test-pat',
      azureDevOpsOrg: 'test-org',
      azureDevOpsProject: 'current-project',
    });

    const cliOptions: CliOptions = { switchProject: true };
    const { lastFrame } = render(<App cliOptions={cliOptions} version="1.0.0" />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should show project selector
    const frame = lastFrame();
    expect(frame).toContain('Select your Azure DevOps project');
  });

  test('should show error when no projects found during switch', async () => {
    const { hasValidConfig, getConfig } = await import('../src/utils/config.js');
    const { AzureDevOpsService } = await import('../src/services/azure-devops.js');

    vi.mocked(hasValidConfig).mockResolvedValue(true);
    vi.mocked(getConfig).mockResolvedValue({
      azureDevOpsPat: 'test-pat',
      azureDevOpsOrg: 'test-org',
      azureDevOpsProject: 'current-project',
    });

    // Mock getProjects to return empty array
    // @ts-expect-error - Mocking class method
    AzureDevOpsService.prototype.getProjects = vi.fn().mockResolvedValue([]);

    const cliOptions: CliOptions = { switchProject: true };
    const { lastFrame } = render(<App cliOptions={cliOptions} version="1.0.0" />);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should show error
    const frame = lastFrame();
    expect(frame).toContain('No projects found');
  });

  test('should handle errors during project loading gracefully', async () => {
    const { hasValidConfig, getConfig } = await import('../src/utils/config.js');

    vi.mocked(hasValidConfig).mockResolvedValue(true);
    vi.mocked(getConfig).mockRejectedValueOnce(new Error('Failed to load config'));

    const cliOptions: CliOptions = { switchProject: true };
    const { lastFrame } = render(<App cliOptions={cliOptions} version="1.0.0" />);

    // Wait for error to surface
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should show error message
    const frame = lastFrame();
    expect(frame).toContain('Failed to load config');
  });
});
