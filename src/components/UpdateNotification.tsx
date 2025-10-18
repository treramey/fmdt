import { Alert } from '@inkjs/ui';
import { Box } from 'ink';
import type React from 'react';

/**
 * Props for the UpdateNotification component.
 */
type UpdateNotificationProps = {
  /** The currently installed version */
  readonly currentVersion: string;
  /** The latest available version from npm registry */
  readonly latestVersion: string;
};

/**
 * Displays an informational alert about available updates.
 *
 * Shows the version upgrade path and indicates that auto-update is running
 * in the background. Rendered at the top of the application when a newer
 * version is detected.
 *
 * @param props - Component props containing version information
 * @returns Alert component showing update status
 * @example
 * <UpdateNotification currentVersion="1.0.0" latestVersion="1.1.0" />
 */
export function UpdateNotification({ currentVersion, latestVersion }: UpdateNotificationProps): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingBottom={1}>
      <Alert variant="info">
        A new version is available ({currentVersion} → {latestVersion}). Updating automatically in the background...
      </Alert>
    </Box>
  );
}
