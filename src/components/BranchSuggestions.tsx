import { Box, Text } from 'ink';
import type React from 'react';
import type { BranchSuggestion } from '../types/index.js';
import { colors } from '../utils/colors.js';

type BranchSuggestionsProps = {
  suggestions: BranchSuggestion[];
  selectedIndex: number;
  visible: boolean;
};

export function BranchSuggestions({
  suggestions,
  selectedIndex,
  visible,
}: BranchSuggestionsProps): React.JSX.Element | null {
  if (!visible) {
    return null;
  }

  if (suggestions.length === 0) {
    return (
      <Box borderStyle="single" borderColor={colors.iris} paddingX={1}>
        <Text dimColor>No suggestions</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={colors.iris} paddingX={1}>
      {suggestions.slice(0, 10).map((suggestion, index) => {
        const isSelected = index === selectedIndex;
        const repoText = suggestion.repositories.length > 0 ? ` (${suggestion.repositories.join(', ')})` : '';

        if (isSelected) {
          return (
            <Text key={suggestion.branchName} color={colors.base} backgroundColor={colors.iris}>
              {suggestion.branchName}
              {repoText}
            </Text>
          );
        }

        return (
          <Text key={suggestion.branchName} color={colors.text}>
            {suggestion.branchName}
            {repoText}
          </Text>
        );
      })}
    </Box>
  );
}
