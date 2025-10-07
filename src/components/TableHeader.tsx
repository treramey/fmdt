import { Box, Text } from 'ink';
import type React from 'react';
import { colors } from '../utils/colors.js';

export function TableHeader(): React.JSX.Element {
  return (
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
  );
}
