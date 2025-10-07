import { Box, Text, useInput } from 'ink';
import React from 'react';
import { z } from 'zod';
import { colors } from '../utils/colors.js';
import { Footer } from './Footer.js';

type OrganizationInputProps = {
  onSubmit: (org: string) => void;
};

const organizationSchema = z
  .string()
  .min(1, 'Organization name cannot be empty')
  .regex(/^[a-zA-Z0-9-_]+$/, 'Organization name can only contain letters, numbers, dashes, and underscores');

export function OrganizationInput({ onSubmit }: OrganizationInputProps): React.JSX.Element {
  const [value, setValue] = React.useState('');
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const [error, setError] = React.useState('');

  useInput((input, key) => {
    if (key.return) {
      const result = organizationSchema.safeParse(value.trim());

      if (!result.success) {
        setError(result.error.issues[0]?.message ?? 'Invalid organization name');
        return;
      }

      setError('');
      onSubmit(result.data);
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

    if (key.leftArrow) {
      setCursorPosition(Math.max(0, cursorPosition - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPosition(Math.min(value.length, cursorPosition + 1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(cursorPosition + input.length);
      setError('');
    }
  });

  const displayValue = `${value.slice(0, cursorPosition)}█${value.slice(cursorPosition)}`;

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color={colors.gold}>
          Enter your Azure DevOps organization name:
        </Text>
      </Box>
      <Box
        borderStyle="single"
        borderColor={error ? colors.love : colors.gold}
        borderTop
        borderBottom
        borderLeft={false}
        borderRight={false}
        paddingX={1}
      >
        <Text color={colors.text}>
          <Text color={colors.gold}>{'> '}</Text>
          {displayValue || '█'}
        </Text>
      </Box>
      {error ? (
        <Text color={colors.love}>{error}</Text>
      ) : (
        <Text color={colors.muted}>Example: https://dev.azure.com/YOUR-ORG-HERE ← this is your organization</Text>
      )}
      <Footer />
    </Box>
  );
}
