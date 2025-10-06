import { Box, Text, useInput } from 'ink';
import type React from 'react';
import type { MultiRepositoryResult } from '../types/index.js';
import { MergeStatusDisplay } from './MergeStatusDisplay.js';

// Rose Pine color scheme
const colors = {
  text: '#e0def4',
  muted: '#6e6a86',
  love: '#eb6f92',
  gold: '#f6c177',
  foam: '#9ccfd8',
} as const;

type MultiRepositoryMergeStatusDisplayProps = MultiRepositoryResult & {
  readonly onNewSearch?: () => void;
};

export function MultiRepositoryMergeStatusDisplay({
  statuses,
  operationSummary,
  onNewSearch,
}: MultiRepositoryMergeStatusDisplayProps): React.JSX.Element {
  // Handle keyboard shortcuts
  useInput((_input, key) => {
    // Handle Enter for new search
    if (key.return && onNewSearch) {
      onNewSearch();
    }
    // Note: Ctrl+C handled automatically by Ink
  });
  // EDGE CASE: No repos have the branch
  if (statuses.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={colors.gold}>Branch not found in any of {operationSummary.total} repositories</Text>
        <Box marginTop={1}>
          <Text color={colors.muted}>Enter: Search new branch, Ctrl+C: Exit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* SUMMARY HEADER */}
      <Box marginBottom={1}>
        <Text bold color={colors.foam}>
          Found branch in {statuses.length} of {operationSummary.total} repositories
        </Text>
      </Box>

      {/* FAILURE WARNING if any repos failed */}
      {operationSummary.failed > 0 && (
        <Box marginBottom={1}>
          <Text color={colors.gold}>Warning: {operationSummary.failed} repositories failed to scan</Text>
        </Box>
      )}

      {/* RENDER EACH REPOSITORY'S MERGE STATUS TABLE */}
      {statuses.map((status, index) => (
        <Box key={status.repository} marginBottom={index < statuses.length - 1 ? 2 : 0}>
          <MergeStatusDisplay status={status} />
        </Box>
      ))}

      {/* FOOTER */}
      <Box marginTop={1}>
        <Text color={colors.muted}>Press Ctrl+C to exit | Enter to search new branch</Text>
      </Box>
    </Box>
  );
}
