import { Box, Text } from 'ink';
import type React from 'react';
import type { BranchMergeStatus } from '../types/index.js';
import { colors } from '../utils/colors.js';

type StatusSummaryProps = {
  status: BranchMergeStatus;
};

export function StatusSummary({ status }: StatusSummaryProps): React.JSX.Element {
  const branches = ['dev', 'qa', 'staging', 'master'] as const;
  const mergedCount = branches.filter((branch) => status.mergedTo[branch].merged).length;
  const totalCount = branches.length;

  const getStatusColor = (): string => {
    if (status.mergedTo.master.merged) return colors.pine;
    if (status.mergedTo.staging.merged) return colors.iris;
    if (status.mergedTo.qa.merged) return colors.gold;
    if (status.mergedTo.dev.merged) return colors.rose;
    return colors.text;
  };

  const getStatusLabel = (): string => {
    if (status.mergedTo.master.merged) return 'Wubba Lubba Dub Dub! It’s Done';
    if (status.mergedTo.staging.merged) return 'Almost There, Morty!';
    if (status.mergedTo.qa.merged) return 'In Progress, Keep It Schwifty!';
    if (status.mergedTo.dev.merged) return 'OoooWeeee just in Dev?';
    return 'Not Started';
  };

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color={getStatusColor()} bold>
        Merge Status: {mergedCount}/{totalCount} branches merged ({getStatusLabel()})
      </Text>
    </Box>
  );
}
