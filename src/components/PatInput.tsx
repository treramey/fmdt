import { Box, Text, useInput } from 'ink';
import React from 'react';
import { colors } from '../utils/colors.js';

type PatInputProps = {
  onSubmit: (pat: string) => void;
};

export function PatInput({ onSubmit }: PatInputProps): React.JSX.Element {
  const [value, setValue] = React.useState('');
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const [error, setError] = React.useState('');

  useInput((input, key) => {
    if (key.return) {
      // CRITICAL: Validate PAT before submitting
      if (value.trim().length < 10) {
        setError('PAT token is too short (minimum 10 characters)');
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
    } else if (input && !key.ctrl && !key.meta) {
      // Add character to input
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(cursorPosition + input.length);
      setError('');
    }
  });

  // CRITICAL: Mask the entire value with • characters
  const maskedValue = value.replace(/./g, '•');
  const displayValue = `${maskedValue.slice(0, cursorPosition)}█${maskedValue.slice(cursorPosition)}`;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.iris}>
          Enter your Azure DevOps Personal Access Token:
        </Text>
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
      ) : (
        <Box marginTop={1}>
          <Text color={colors.muted}>PAT will be stored securely in your system keychain</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={colors.muted}>Enter: Submit, Ctrl+C: Cancel</Text>
      </Box>
    </Box>
  );
}
