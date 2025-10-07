import { Box, Text } from 'ink';
import type React from 'react';
import type { BranchMergeStatus } from '../types/index.js';
import { colors } from '../utils/colors.js';
import { BranchRow } from './BranchRow.js';
import { StatusSummary } from './StatusSummary.js';
import { TableHeader } from './TableHeader.js';

type MergeStatusDisplayProps = {
  status: BranchMergeStatus;
};

export function MergeStatusDisplay({ status }: MergeStatusDisplayProps): React.JSX.Element {
  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color={colors.subtle} bold>
          Branch:{' '}
        </Text>
        <Text color={colors.text}>{status.branch}</Text>
      </Box>

      <Box>
        <Text color={colors.subtle} bold>
          Repository:{' '}
        </Text>
        <Text color={colors.text}>{status.repository}</Text>
      </Box>

      <StatusSummary status={status} />

      <Box flexDirection="column" borderStyle="round" borderColor={colors.overlay} paddingX={1}>
        <TableHeader />
        <Box>
          <Text color={colors.overlay}>─────────────────────────────────────────────────────────────────────────</Text>
        </Box>
        <Box flexDirection="column">
          <BranchRow
            name="Dev"
            merged={status.mergedTo.dev.merged}
            date={status.mergedTo.dev.date}
            mergedBy={status.mergedTo.dev.mergedBy}
          />
          <BranchRow
            name="QA"
            merged={status.mergedTo.qa.merged}
            date={status.mergedTo.qa.date}
            mergedBy={status.mergedTo.qa.mergedBy}
          />
          <BranchRow
            name="Staging"
            merged={status.mergedTo.staging.merged}
            date={status.mergedTo.staging.date}
            mergedBy={status.mergedTo.staging.mergedBy}
          />
          <BranchRow
            name="Master"
            merged={status.mergedTo.master.merged}
            date={status.mergedTo.master.date}
            mergedBy={status.mergedTo.master.mergedBy}
          />
        </Box>
      </Box>
    </Box>
  );
}
