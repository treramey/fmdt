import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React from 'react';
import type { BranchSuggestion } from '../types/index.js';
import { loadBranchCache } from '../utils/branch-cache.js';
import { colors } from '../utils/colors.js';
import { loadHistory } from '../utils/history.js';
import { BranchSuggestions } from './BranchSuggestions.js';
import { Footer } from './Footer.js';

type BranchInputProps = {
  onSubmit: (branch: string) => void;
  onSwitchProject?: () => void;
};

export function BranchInput({ onSubmit, onSwitchProject }: BranchInputProps): React.JSX.Element {
  const [value, setValue] = React.useState('LAAIR-');

  // History state
  const [history, setHistory] = React.useState<string[]>([]);
  const [historyPosition, setHistoryPosition] = React.useState(-1);
  const [savedInput, setSavedInput] = React.useState('');

  // Suggestions state
  const [branchCache, setBranchCache] = React.useState<string[]>([]);
  const [suggestions, setSuggestions] = React.useState<BranchSuggestion[]>([]);
  const [suggestionIndex, setSuggestionIndex] = React.useState(-1);

  // Load history on mount
  React.useEffect(() => {
    void loadHistory().then(setHistory);
  }, []);

  // Load branch cache on mount
  React.useEffect(() => {
    const cache = loadBranchCache();
    if (cache) {
      setBranchCache(cache.allBranches);
    }
  }, []);

  // Filter suggestions on value change
  React.useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setSuggestionIndex(-1);
      return;
    }

    const filtered = branchCache
      .filter((branch) => branch.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 10)
      .map((branchName) => ({
        branchName,
        repositories: [], // Could enhance later with repo lookup
        matchScore: 0,
      }));

    setSuggestions(filtered);
    setSuggestionIndex(-1);
  }, [value, branchCache]);

  useInput((input, key) => {
    if (key.ctrl && input === 'p' && onSwitchProject) {
      onSwitchProject();
    // NEW: Tab navigation for suggestions
    if (input === '\t' && suggestions.length > 0) {
      if (key.shift) {
        // Shift+Tab: navigate up
        setSuggestionIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      } else {
        // Tab: navigate down
        setSuggestionIndex((prev) => (prev >= suggestions.length - 1 ? 0 : prev + 1));
      }
      return; // Don't process other handlers
    }

    // NEW: Enter on suggestion fills input
    if (key.return && suggestionIndex >= 0) {
      const selected = suggestions[suggestionIndex];
      if (selected) {
        setValue(selected.branchName);
        setCursorPosition(selected.branchName.length);
        setSuggestions([]);
        setSuggestionIndex(-1);
        return;
      }
    }

    if (key.return) {
      if (!value.trim()) return;

      onSubmit(value.trim());
      // Reset state after submit
      setValue('LAAIR-');
      setCursorPosition(6);
      setHistoryPosition(-1);
      setSavedInput('');
      setSuggestionIndex(-1);
      return;
    }

    const isUpArrow = key.upArrow || input === '\x1B[A' || input === '\u001b[A';
    const isDownArrow = key.downArrow || input === '\x1B[B' || input === '\u001b[B';

    if (isUpArrow) {
      if (history.length === 0) return;

      const newPosition = historyPosition + 1;
      if (newPosition >= history.length) return;

      if (historyPosition === -1) {
        setSavedInput(value);
      }

      const historyItem = history[newPosition];
      if (!historyItem) return;

      setValue(historyItem);
      setHistoryPosition(newPosition);
      return;
    }

    if (isDownArrow) {
      if (historyPosition === -1) return;

      const newPosition = historyPosition - 1;

      if (newPosition === -1) {
        setValue(savedInput);
        setHistoryPosition(-1);
        return;
      }

      const historyItem = history[newPosition];
      if (!historyItem) return;

      setValue(historyItem);
      setHistoryPosition(newPosition);
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPosition <= 0) return;

      const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(cursorPosition - 1);
      // Reset history position and suggestion index when user types
      setHistoryPosition(-1);
      setSuggestionIndex(-1);
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
    // Reset history position and suggestion index when user types
    setHistoryPosition(-1);
    setSuggestionIndex(-1);
  });

  const handleSubmit = (submittedValue: string) => {
    if (!submittedValue.trim()) return;

    onSubmit(submittedValue.trim());
    setValue('LAAIR-');
    setHistoryPosition(-1);
    setSavedInput('');
  };

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setHistoryPosition(-1);
  };

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
        <Text color={colors.iris}>{'> '}</Text>
        <TextInput value={value} onChange={handleChange} onSubmit={handleSubmit} />
      </Box>
      <Footer showNavigation showSearch showProjectSwitch />
      <BranchSuggestions suggestions={suggestions} selectedIndex={suggestionIndex} visible={suggestions.length > 0} />
      <Footer showNavigation showSearch />
    </Box>
  );
}
