import { Box, Text, useInput } from 'ink';
import React from 'react';
import { colors } from '../utils/colors.js';
import { loadHistory } from '../utils/history.js';
import { Footer } from './Footer.js';

type BranchInputProps = {
  onSubmit: (branch: string) => void;
};

export function BranchInput({ onSubmit }: BranchInputProps): React.JSX.Element {
  const [value, setValue] = React.useState('LAAIR-');
  const [cursorPosition, setCursorPosition] = React.useState(6); // Position after "LAAIR-"

  // History state
  const [history, setHistory] = React.useState<string[]>([]);
  const [historyPosition, setHistoryPosition] = React.useState(-1); // -1 = current input
  const [savedInput, setSavedInput] = React.useState(''); // Save current input when entering history

  // Load history on mount
  React.useEffect(() => {
    void loadHistory().then(setHistory);
  }, []);

  useInput((input, key) => {
    if (key.return) {
      if (!value.trim()) return;

      onSubmit(value.trim());
      // Reset state after submit
      setValue('LAAIR-');
      setCursorPosition(6);
      setHistoryPosition(-1);
      setSavedInput('');
      return;
    }

    if (key.upArrow) {
      // Navigate backward in history (older items)
      if (history.length === 0) return;

      const newPosition = historyPosition + 1;
      if (newPosition >= history.length) return; // Already at oldest

      // Save current input if entering history for first time
      if (historyPosition === -1) {
        setSavedInput(value);
      }

      const historyItem = history[newPosition];
      if (!historyItem) return;

      setValue(historyItem);
      setCursorPosition(historyItem.length);
      setHistoryPosition(newPosition);
      return;
    }

    if (key.downArrow) {
      // Navigate forward in history (newer items)
      if (historyPosition === -1) return; // Already at current input

      const newPosition = historyPosition - 1;

      if (newPosition === -1) {
        // Return to current/saved input
        setValue(savedInput);
        setCursorPosition(savedInput.length);
        setHistoryPosition(-1);
        return;
      }

      const historyItem = history[newPosition];
      if (!historyItem) return;

      setValue(historyItem);
      setCursorPosition(historyItem.length);
      setHistoryPosition(newPosition);
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPosition <= 0) return;

      const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(cursorPosition - 1);
      // Reset history position when user types
      setHistoryPosition(-1);
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

    if (!input || key.ctrl || key.meta) return;

    const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
    setValue(newValue);
    setCursorPosition(cursorPosition + input.length);
    // Reset history position when user types
    setHistoryPosition(-1);
  });

  const displayValue = `${value.slice(0, cursorPosition)}█${value.slice(cursorPosition)}`;

  return (
    <Box flexDirection="column" padding={1}>
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
        <Text color={colors.text}>
          <Text color={colors.iris}>{'> '}</Text>
          {displayValue || '█'}
        </Text>
      </Box>
      <Footer showNavigation showSearch />
    </Box>
  );
}
