import { StatusMessage } from '@inkjs/ui';
import { Box, Text } from 'ink';
import type React from 'react';

type ErrorDisplayProps = {
  error: string;
};

export function ErrorDisplay({ error }: ErrorDisplayProps): React.JSX.Element {
  return (
    <Box flexDirection="column" padding={1}>
      <StatusMessage variant="error">Error: {error}</StatusMessage>
      <Box marginTop={1}>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
}
