import { render } from 'ink-testing-library';
import { describe, expect, test, vi } from 'vitest';
import { MultiRepositoryMergeStatusDisplay } from '../src/components/MultiRepositoryMergeStatusDisplay.js';
import type { BranchMergeStatus, MultiRepositoryResult } from '../src/types/index.js';

describe('MultiRepositoryMergeStatusDisplay', () => {
  const createMockStatus = (branch: string, repository: string): BranchMergeStatus => ({
    branch,
    repository,
    mergedTo: {
      dev: { merged: true, date: '2025-01-15T10:30:00Z', mergedBy: 'John Doe' },
      qa: { merged: false, date: null, mergedBy: null },
      staging: { merged: false, date: null, mergedBy: null },
      master: { merged: false, date: null, mergedBy: null },
    },
  });

  test('should render multiple repository tables', () => {
    const result: MultiRepositoryResult = {
      statuses: [createMockStatus('feature-123', 'Repo1'), createMockStatus('feature-123', 'Repo2')],
      operationSummary: {
        total: 2,
        successful: 2,
        failed: 0,
        failedRepos: [],
      },
    };

    const { lastFrame } = render(<MultiRepositoryMergeStatusDisplay {...result} />);

    const output = lastFrame();
    expect(output).toContain('Found branch in 2 of 2 repositories');
    expect(output).toContain('Repo1');
    expect(output).toContain('Repo2');
  });

  test('should show appropriate message when branch not found', () => {
    const result: MultiRepositoryResult = {
      statuses: [],
      operationSummary: {
        total: 5,
        successful: 0,
        failed: 0,
        failedRepos: [],
      },
    };

    const { lastFrame } = render(<MultiRepositoryMergeStatusDisplay {...result} />);

    const output = lastFrame();
    expect(output).toContain('Branch not found in any of 5 repositories');
  });

  test('should show warning when some repositories failed', () => {
    const result: MultiRepositoryResult = {
      statuses: [createMockStatus('feature-123', 'Repo1')],
      operationSummary: {
        total: 3,
        successful: 1,
        failed: 2,
        failedRepos: ['Repo2', 'Repo3'],
      },
    };

    const { lastFrame } = render(<MultiRepositoryMergeStatusDisplay {...result} />);

    const output = lastFrame();
    expect(output).toContain('Warning: 2 repositories failed to scan');
    expect(output).toContain('Found branch in 1 of 3 repositories');
  });

  test('should render single repository correctly', () => {
    const result: MultiRepositoryResult = {
      statuses: [createMockStatus('feature-123', 'OnlyRepo')],
      operationSummary: {
        total: 1,
        successful: 1,
        failed: 0,
        failedRepos: [],
      },
    };

    const { lastFrame } = render(<MultiRepositoryMergeStatusDisplay {...result} />);

    const output = lastFrame();
    expect(output).toContain('Found branch in 1 of 1 repositories');
    expect(output).toContain('OnlyRepo');
  });

  test('should show correct counts with partial failures', () => {
    const result: MultiRepositoryResult = {
      statuses: [createMockStatus('feature-123', 'Repo1'), createMockStatus('feature-123', 'Repo2')],
      operationSummary: {
        total: 5,
        successful: 2,
        failed: 3,
        failedRepos: ['Repo3', 'Repo4', 'Repo5'],
      },
    };

    const { lastFrame } = render(<MultiRepositoryMergeStatusDisplay {...result} />);

    const output = lastFrame();
    expect(output).toContain('Found branch in 2 of 5 repositories');
    expect(output).toContain('Warning: 3 repositories failed to scan');
  });

  describe('Keyboard handling', () => {
    test('should call onNewSearch when Enter is pressed', () => {
      const onNewSearch = vi.fn();
      const result: MultiRepositoryResult = {
        statuses: [createMockStatus('feature-123', 'Repo1')],
        operationSummary: {
          total: 1,
          successful: 1,
          failed: 0,
          failedRepos: [],
        },
      };

      const { stdin } = render(<MultiRepositoryMergeStatusDisplay {...result} onNewSearch={onNewSearch} />);

      // Simulate Enter keypress
      stdin.write('\r');

      expect(onNewSearch).toHaveBeenCalledTimes(1);
    });

    test('should not crash when onNewSearch is not provided', () => {
      const result: MultiRepositoryResult = {
        statuses: [createMockStatus('feature-123', 'Repo1')],
        operationSummary: {
          total: 1,
          successful: 1,
          failed: 0,
          failedRepos: [],
        },
      };

      const { stdin } = render(<MultiRepositoryMergeStatusDisplay {...result} />);

      // Should not crash when callback is not provided
      expect(() => stdin.write('\r')).not.toThrow();
    });

    test('should display keyboard shortcuts in footer', () => {
      const result: MultiRepositoryResult = {
        statuses: [createMockStatus('feature-123', 'Repo1')],
        operationSummary: {
          total: 1,
          successful: 1,
          failed: 0,
          failedRepos: [],
        },
      };

      const { lastFrame } = render(<MultiRepositoryMergeStatusDisplay {...result} />);

      const output = lastFrame();
      expect(output).toContain('Ctrl+C to exit');
      expect(output).toContain('Enter to search');
    });

    test('should display keyboard shortcuts when branch not found', () => {
      const result: MultiRepositoryResult = {
        statuses: [],
        operationSummary: {
          total: 5,
          successful: 0,
          failed: 0,
          failedRepos: [],
        },
      };

      const { lastFrame } = render(<MultiRepositoryMergeStatusDisplay {...result} />);

      const output = lastFrame();
      expect(output).toContain('Ctrl+C to exit');
      expect(output).toContain('Enter for new search');
    });
  });
});
