import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type React from 'react';
import { colors } from '../../utils/colors.js';

type BranchInputPromptProps = {
  readonly value: string;
  readonly onChange: (newValue: string) => void;
  readonly onSubmit: (submittedValue: string) => void;
};

export function BranchInputPrompt({ value, onChange, onSubmit }: BranchInputPromptProps): React.JSX.Element {
  return (
    <>
      <Text bold color={colors.iris}>
        Enter ticket number:
      </Text>
      <Box
        borderStyle="single"
        borderColor={colors.iris}
        borderTop
        borderBottom
        borderLeft={false}
        borderRight={false}
        paddingX={1}
      >
        <Text color={colors.iris}>{'> '}</Text>
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      </Box>
    </>
  );
}
