import { Box, Text, useInput } from 'ink';
import React from 'react';
import { colors } from '../utils/colors.js';

type OrganizationInputProps = {
  onSubmit: (org: string) => void;
};

export function OrganizationInput({ onSubmit }: OrganizationInputProps): React.JSX.Element {
  const [value, setValue] = React.useState('');
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const [error, setError] = React.useState('');

  useInput((input, key) => {
    if (key.return) {
      if (value.trim().length === 0) {
        setError('Organization name cannot be empty');
        return;
      }
      // Validate: no spaces, only alphanumeric, dash, and underscore
      if (!/^[a-zA-Z0-9-_]+$/.test(value.trim())) {
        setError('Organization name can only contain letters, numbers, dashes, and underscores');
        return;
      }
      setError('');
      onSubmit(value.trim());
    } else if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        setValue(newValue);
        setCursorPosition(cursorPosition - 1);
        setError('');
      }
    } else if (key.leftArrow) {
      setCursorPosition(Math.max(0, cursorPosition - 1));
    } else if (key.rightArrow) {
      setCursorPosition(Math.min(value.length, cursorPosition + 1));
    } else if (input && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(cursorPosition + input.length);
      setError('');
    }
  });

  const displayValue = `${value.slice(0, cursorPosition)}█${value.slice(cursorPosition)}`;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.iris}>
          Enter your Azure DevOps organization name:
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={colors.muted}>Example: https://dev.azure.com/YOUR-ORG-HERE</Text>
      </Box>
      <Box
        borderStyle="single"
        borderColor={error ? colors.love : colors.iris}
        borderTop
        borderBottom
        borderLeft={false}
        borderRight={false}
        paddingX={1}
      >
        <Text color={colors.text}>
          <Text color={colors.iris}>{'> '}</Text>
          {displayValue || '█'}
        </Text>
      </Box>
      {error ? (
        <Box marginTop={1}>
          <Text color={colors.love}>{error}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text color={colors.muted}>Enter: Submit, Arrow keys (←→): Navigate, Ctrl+C: Cancel</Text>
      </Box>
    </Box>
  );
}
