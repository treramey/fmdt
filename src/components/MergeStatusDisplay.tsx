import { Box, Text } from 'ink';
import type React from 'react';
import type { BranchMergeStatus } from '../types/index.js';
import { colors, semanticColors } from '../utils/colors.js';
import { formatDateShort } from '../utils/formatters.js';
import { StatusSummary } from './StatusSummary.js';

type MergeStatusDisplayProps = {
  status: BranchMergeStatus;
};

export function MergeStatusDisplay({ status }: MergeStatusDisplayProps): React.JSX.Element {
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
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

      {/* Status Summary */}
      <StatusSummary status={status} />

      {/* Table */}
      <Box flexDirection="column" borderStyle="round" borderColor={colors.overlay} paddingX={1}>
        {/* Table Header */}
        <Box>
          <Box width={12} flexShrink={0}>
            <Text color={colors.text} bold>
              Branch
            </Text>
          </Box>
          <Box width={20} flexShrink={0}>
            <Text color={colors.text} bold>
              Status
            </Text>
          </Box>
          <Box width={20} flexShrink={0}>
            <Text color={colors.text} bold>
              Date
            </Text>
          </Box>
          <Box width={20} flexShrink={0}>
            <Text color={colors.text} bold>
              Author
            </Text>
          </Box>
        </Box>

        {/* Separator */}
        <Box>
          <Text color={colors.overlay}>─────────────────────────────────────────────────────────────────────────</Text>
        </Box>

        {/* Branch Rows */}
        <Box flexDirection="column">
          {/* Dev */}
          <Box marginBottom={1}>
            <Box width={12} flexShrink={0}>
              <Text color={colors.subtle} bold>
                Dev
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text>
                <Text color={status.mergedTo.dev.merged ? semanticColors.success : semanticColors.error}>
                  {status.mergedTo.dev.merged ? '✓' : '✗'}
                </Text>
                <Text color={colors.subtle}> {status.mergedTo.dev.merged ? 'Merged' : 'Not Merged'}</Text>
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text color={colors.subtle}>
                {status.mergedTo.dev.date ? formatDateShort(status.mergedTo.dev.date) : '-'}
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text color={colors.subtle}>{status.mergedTo.dev.mergedBy || '-'}</Text>
            </Box>
          </Box>

          {/* QA */}
          <Box marginBottom={1}>
            <Box width={12} flexShrink={0}>
              <Text color={colors.subtle} bold>
                QA
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text>
                <Text color={status.mergedTo.qa.merged ? semanticColors.success : semanticColors.error}>
                  {status.mergedTo.qa.merged ? '✓' : '✗'}
                </Text>
                <Text color={colors.subtle}> {status.mergedTo.qa.merged ? 'Merged' : 'Not Merged'}</Text>
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text color={colors.subtle}>
                {status.mergedTo.qa.date ? formatDateShort(status.mergedTo.qa.date) : '-'}
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text color={colors.subtle}>{status.mergedTo.qa.mergedBy || '-'}</Text>
            </Box>
          </Box>

          {/* Staging */}
          <Box marginBottom={1}>
            <Box width={12} flexShrink={0}>
              <Text color={colors.subtle} bold>
                Staging
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text>
                <Text color={status.mergedTo.staging.merged ? semanticColors.success : semanticColors.error}>
                  {status.mergedTo.staging.merged ? '✓' : '✗'}
                </Text>
                <Text color={colors.subtle}> {status.mergedTo.staging.merged ? 'Merged' : 'Not Merged'}</Text>
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text color={colors.subtle}>
                {status.mergedTo.staging.date ? formatDateShort(status.mergedTo.staging.date) : '-'}
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text color={colors.subtle}>{status.mergedTo.staging.mergedBy || '-'}</Text>
            </Box>
          </Box>

          {/* Master */}
          <Box>
            <Box width={12} flexShrink={0}>
              <Text color={colors.subtle} bold>
                Master
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text>
                <Text color={status.mergedTo.master.merged ? semanticColors.success : semanticColors.error}>
                  {status.mergedTo.master.merged ? '✓' : '✗'}
                </Text>
                <Text color={colors.subtle}> {status.mergedTo.master.merged ? 'Merged' : 'Not Merged'}</Text>
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text color={colors.subtle}>
                {status.mergedTo.master.date ? formatDateShort(status.mergedTo.master.date) : '-'}
              </Text>
            </Box>
            <Box width={20} flexShrink={0}>
              <Text color={colors.subtle}>{status.mergedTo.master.mergedBy || '-'}</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
