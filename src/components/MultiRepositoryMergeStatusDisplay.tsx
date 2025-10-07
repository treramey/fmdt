import { Box, Text, useInput } from 'ink';
import type React from 'react';
import type { MultiRepositoryResult } from '../types/index.js';
import { colors } from '../utils/colors.js';
import { Footer } from './Footer.js';
import { MergeStatusDisplay } from './MergeStatusDisplay.js';

type MultiRepositoryMergeStatusDisplayProps = MultiRepositoryResult & {
  readonly onNewSearch?: () => void;
};

export function MultiRepositoryMergeStatusDisplay({
  statuses,
  operationSummary,
  onNewSearch,
}: MultiRepositoryMergeStatusDisplayProps): React.JSX.Element {
  useInput((_input, key) => {
    if (key.return && onNewSearch) {
      onNewSearch();
    }
    // Note: Ctrl+C handled automatically by Ink
  });
  if (statuses.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={colors.gold}>Branch not found in any of {operationSummary.total} repositories</Text>
        <Footer />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={colors.foam}>
        Found branch in {statuses.length} of {operationSummary.total} repositories
      </Text>
      {operationSummary.failed > 0 && (
        <Text color={colors.gold}>Warning: {operationSummary.failed} repositories failed to scan</Text>
      )}

      {statuses.map((status, index) => (
        <Box key={status.repository} marginBottom={index < statuses.length - 1 ? 1 : 0}>
          <MergeStatusDisplay status={status} />
        </Box>
      ))}

      <Footer showSearch />
    </Box>
  );
}
