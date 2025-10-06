import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import type React from 'react';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps): React.JSX.Element {
  return (
    <Box flexDirection="column" padding={2}>
      <Box>
        <Spinner />
        <Text> {message}</Text>
      </Box>
    </Box>
  );
}
