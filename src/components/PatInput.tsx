import { Box, Text, useInput } from 'ink';
import React from 'react';
import { colors } from '../utils/colors.js';
import { Footer } from './Footer.js';

type PatInputProps = {
  onSubmit: (pat: string) => void;
};

export function PatInput({ onSubmit }: PatInputProps): React.JSX.Element {
  const [value, setValue] = React.useState('');
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const [error, setError] = React.useState('');

  useInput((input, key) => {
    if (key.return) {
      if (value.trim().length < 10) {
        setError('PAT token is too short (minimum 10 characters)');
        return;
      }
      setError('');
      onSubmit(value.trim());
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        setValue(newValue);
        setCursorPosition(cursorPosition - 1);
        setError('');
      }
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(cursorPosition + input.length);
      setError('');
    }
  });

  const maskedValue = value.replace(/./g, '•');
  const displayValue = `${maskedValue.slice(0, cursorPosition)}█${maskedValue.slice(cursorPosition)}`;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={colors.iris}>Paste your Azure DevOps Personal Access Token:</Text>
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
      {error ? <Text color={colors.love}>{error}</Text> : <Text color={colors.muted}>Press Enter to continue</Text>}
      <Footer />
    </Box>
  );
}
