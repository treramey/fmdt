import { Box, Text } from 'ink';
import type React from 'react';
import packageJson from '../../package.json';
import { asciiArt, colors } from '../utils/colors.js';

export function Header(): React.JSX.Element {
  return (
    <Box marginBottom={1}>
      <Box>
        <Text color={colors.gold}>{asciiArt}</Text>
      </Box>
      <Box flexDirection="column" justifyContent="center" marginLeft={2}>
        <Text>
          <Text bold color={colors.text}>
            FMDT{' '}
          </Text>
          <Text color={colors.muted}>v{packageJson.version}</Text>
        </Text>
        <Text color={colors.muted}>Find My Damn Ticket</Text>
      </Box>
    </Box>
  );
}
