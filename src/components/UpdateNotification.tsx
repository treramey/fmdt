import { Alert } from '@inkjs/ui';
import { Box, Text } from 'ink';
import type React from 'react';

type UpdateNotificationProps = {
  readonly currentVersion: string;
  readonly latestVersion: string;
};

export function UpdateNotification({ currentVersion, latestVersion }: UpdateNotificationProps): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingBottom={1}>
      <Alert variant="info">
        Update available: {currentVersion} → {latestVersion}
      </Alert>
      <Text dimColor>Run: npm install -g fmdt@latest (or bun install -g fmdt@latest)</Text>
    </Box>
  );
}
