import { Box, Text } from 'ink';
import type React from 'react';
import packageJson from '../../package.json';
import { asciiArt, colors } from '../utils/colors.js';

type HeaderProps = {
  currentProject?: string;
};

export function Header({ currentProject }: HeaderProps = {}): React.JSX.Element {
  return (
    <Box marginBottom={1} flexDirection="column">
      <Box>
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
      {currentProject && (
        <Box marginTop={1}>
          <Text color={colors.muted}>
            Project: <Text color={colors.iris}>{currentProject}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}
