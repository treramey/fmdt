import { Alert } from '@inkjs/ui';
import { Box } from 'ink';
import type React from 'react';

type UpdateNotificationProps = {
  readonly currentVersion: string;
  readonly latestVersion: string;
};

export function UpdateNotification({ currentVersion, latestVersion }: UpdateNotificationProps): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingBottom={1}>
      <Alert variant="info">
        A new version is available ({currentVersion} → {latestVersion}). Updating automatically in the background...
      </Alert>
    </Box>
  );
}
