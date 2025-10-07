import { Box, Text } from 'ink';
import type React from 'react';
import { colors, semanticColors } from '../utils/colors.js';
import { formatDateShort } from '../utils/formatters.js';

type BranchRowProps = {
  name: string;
  merged: boolean;
  date: string | null;
  mergedBy: string | null;
  marginBottom?: number;
};

export function BranchRow({ name, merged, date, mergedBy, marginBottom = 0 }: BranchRowProps): React.JSX.Element {
  return (
    <Box marginBottom={marginBottom}>
      <Box width={12} flexShrink={0}>
        <Text color={colors.subtle} bold>
          {name}
        </Text>
      </Box>
      <Box width={20} flexShrink={0}>
        <Text>
          <Text color={merged ? semanticColors.success : semanticColors.error}>{merged ? '✓' : '✗'}</Text>
          <Text color={colors.subtle}> {merged ? 'Merged' : 'Not Merged'}</Text>
        </Text>
      </Box>
      <Box width={20} flexShrink={0}>
        <Text color={colors.subtle}>{date ? formatDateShort(date) : '-'}</Text>
      </Box>
      <Box width={20} flexShrink={0}>
        <Text color={colors.subtle}>{mergedBy || '-'}</Text>
      </Box>
    </Box>
  );
}
