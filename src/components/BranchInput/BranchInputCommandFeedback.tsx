import { Box, Text } from 'ink';
import type React from 'react';
import { colors } from '../../utils/colors.js';

type BranchInputCommandFeedbackProps = {
  readonly message: string | undefined;
};

export function BranchInputCommandFeedback({ message }: BranchInputCommandFeedbackProps): React.JSX.Element | null {
  if (!message) {
    return null;
  }

  return (
    <Box>
      <Text color={colors.gold}>{message}</Text>
    </Box>
  );
}
