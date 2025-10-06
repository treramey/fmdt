import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { colors } from '../utils/colors.js';

type WelcomeMessageProps = {
  onContinue: () => void;
};

export function WelcomeMessage({ onContinue }: WelcomeMessageProps): React.JSX.Element {
  useInput((_input, _key) => {
    // Any key press continues to the next step
    onContinue();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.iris}>
          Welcome to FMDT Setup
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={colors.text}>This tool helps you track branch merge status across Azure DevOps repositories.</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={colors.text}>To get started, you'll need to provide:</Text>
      </Box>

      <Box marginBottom={1} paddingLeft={2}>
        <Text color={colors.text}>1. Azure DevOps Personal Access Token (PAT)</Text>
      </Box>
      <Box marginBottom={1} paddingLeft={2}>
        <Text color={colors.text}>2. Organization name</Text>
      </Box>
      <Box marginBottom={1} paddingLeft={2}>
        <Text color={colors.text}>3. Project name</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={colors.love}>Required PAT Scopes:</Text>
      </Box>
      <Box marginBottom={1} paddingLeft={2}>
        <Text color={colors.text}>• Code (Read)</Text>
      </Box>
      <Box marginBottom={1} paddingLeft={2}>
        <Text color={colors.text}>• Project and Team (Read)</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={colors.foam}>Create PAT at: https://dev.azure.com/YOUR-ORG/_usersSettings/tokens</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={colors.muted}>Press any key to continue...</Text>
      </Box>
    </Box>
  );
}
