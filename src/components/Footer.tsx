import { Box, Text } from 'ink';
import type React from 'react';
import { colors } from '../utils/colors.js';

interface SearchFooterProps {
  showNavigation?: boolean;
  showExit?: boolean;
  showSearch?: boolean;
}

export const Footer: React.FC<SearchFooterProps> = ({
  showNavigation = false,
  showExit = true,
  showSearch = false,
}) => {
  const getInstructions = (): string => {
    if (showNavigation && showSearch) {
      return 'Enter: To search, Arrow keys (↑↓): To navigate history';
    }

    if (showSearch) {
      return 'Enter: To search, Press Ctrl-C to exit';
    }

    if (showExit) {
      return 'Press Ctrl-C to exit';
    }

    return '';
  };

  return (
    <Box marginTop={1}>
      <Text color={colors.muted}>{getInstructions()}</Text>
    </Box>
  );
};
