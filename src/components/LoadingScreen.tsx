import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import type React from 'react';
import { colors } from '../utils/colors.js';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps): React.JSX.Element {
  return (
    <Box flexDirection="column" padding={2}>
      <Box>
        <Spinner />
        <Text color={colors.text}> {message}</Text>
      </Box>
    </Box>
  );
}
