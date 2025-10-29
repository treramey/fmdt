import { Box, Text } from 'ink';
import type React from 'react';
import type { Suggestion } from '../../types/branch-input.js';
import { colors } from '../../utils/colors.js';

type BranchInputSuggestionListProps = {
  readonly suggestions: readonly Suggestion[];
  readonly isCommandInput: boolean;
  readonly trimmedValue: string;
  readonly focusOnSuggestions: boolean;
  readonly selectedSuggestionIndex: number;
};

export function BranchInputSuggestionList({
  suggestions,
  isCommandInput,
  trimmedValue,
  focusOnSuggestions,
  selectedSuggestionIndex,
}: BranchInputSuggestionListProps): React.JSX.Element | null {
  if (suggestions.length === 0) {
    if (isCommandInput && trimmedValue.length > 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No commands match "{trimmedValue}"</Text>
        </Box>
      );
    }

    return null;
  }

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" paddingX={1}>
        {suggestions.map((suggestion, index) => {
          const isSelected = focusOnSuggestions && index === selectedSuggestionIndex;
          const pointer = isSelected ? '❯ ' : '  ';

          if (suggestion.kind === 'branch') {
            return (
              <Box key={`branch-${suggestion.value}`}>
                <Text color={isSelected ? colors.foam : colors.muted}>{pointer}</Text>
                <Text color={isSelected ? colors.foam : colors.muted}>{suggestion.value}</Text>
              </Box>
            );
          }

          if (suggestion.kind === 'command') {
            return (
              <Box key={`command-${suggestion.value}`} flexDirection="column">
                <Box>
                  <Text color={isSelected ? colors.foam : colors.muted}>{pointer}</Text>
                  <Text color={isSelected ? colors.foam : colors.muted}>{suggestion.value}</Text>
                  <Text color={isSelected ? colors.foam : colors.muted}> {suggestion.description}</Text>
                </Box>
              </Box>
            );
          }

          return (
            <Box key="unknown-command">
              <Text color={colors.gold}>{pointer}</Text>
              <Text color={colors.gold}>{suggestion.message}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
