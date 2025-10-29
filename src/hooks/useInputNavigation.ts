import { useInput } from 'ink';
import type { Suggestion } from '../types/branch-input.js';

export function useInputNavigation(context: {
  value: string;
  setValue: (value: string) => void;
  cursorPosition: number;
  setCursorPosition: (position: number) => void;
  suggestions: readonly Suggestion[];
  focusOnSuggestions: boolean;
  setFocusOnSuggestions: (focus: boolean) => void;
  selectedSuggestionIndex: number;
  setSelectedSuggestionIndex: (index: number) => void;
  onSwitchProject?: () => void;
  onSubmitSuggestion: (suggestion: Suggestion) => void;
  onHistoryNavigateUp: (currentValue: string) => string | undefined;
  onHistoryNavigateDown: (currentValue: string) => string | undefined;
  onResetHistory: () => void;
  clearFeedback: () => void;
}): void {
  const {
    value,
    setValue,
    cursorPosition,
    setCursorPosition,
    suggestions,
    focusOnSuggestions,
    setFocusOnSuggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    onSwitchProject,
    onSubmitSuggestion,
    onHistoryNavigateUp,
    onHistoryNavigateDown,
    onResetHistory,
    clearFeedback,
  } = context;

  useInput((input, key) => {
    // Handle Ctrl+Shift+P for project switching
    if (key.ctrl && key.shift && input === 'P' && onSwitchProject) {
      onSwitchProject();
      return;
    }

    // Detect up/down movements from multiple sources
    let isUpArrow = key.upArrow || input === '\x1B[A' || input === '\u001b[A';
    let isDownArrow = key.downArrow || input === '\x1B[B' || input === '\u001b[B';

    // Check for Ctrl key combinations for vim-style navigation
    // Important: We need to consume these events even if there's nothing to navigate
    if (key.ctrl) {
      // Ctrl+P (up) - common vim binding
      if (input === 'p') {
        isUpArrow = true;
      }
      // Ctrl+K (up) - might be intercepted by terminal
      else if (input === 'k') {
        isUpArrow = true;
      }
      // Ctrl+J (down) - might be intercepted by terminal
      else if (input === 'j') {
        isDownArrow = true;
      }
      // Ctrl+N (down/next) - common readline binding, less likely to be intercepted
      else if (input === 'n') {
        isDownArrow = true;
      }
    }


    // === FOCUS ON SUGGESTIONS LIST ===
    if (focusOnSuggestions) {
      if (suggestions.length === 0) {
        setFocusOnSuggestions(false);
        return;
      }

      if (isDownArrow) {
        // Navigate down in suggestions
        setSelectedSuggestionIndex(suggestions.length - 1 <= selectedSuggestionIndex ? 0 : selectedSuggestionIndex + 1);
        return;
      }

      if (isUpArrow) {
        // Navigate up in suggestions, or return to input if at top
        if (selectedSuggestionIndex === 0) {
          setFocusOnSuggestions(false);
        } else {
          setSelectedSuggestionIndex(selectedSuggestionIndex - 1);
        }
        return;
      }

      if (key.escape) {
        setFocusOnSuggestions(false);
        return;
      }

      if (key.return) {
        const selected = suggestions[selectedSuggestionIndex];
        if (!selected) {
          return;
        }

        onSubmitSuggestion(selected);
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        setFocusOnSuggestions(false);
        const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        setValue(newValue);
        setCursorPosition(cursorPosition + input.length);
        onResetHistory();
        return;
      }

      if (key.backspace || key.delete) {
        setFocusOnSuggestions(false);
        if (cursorPosition <= 0) return;
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        setValue(newValue);
        setCursorPosition(cursorPosition - 1);
        onResetHistory();
        return;
      }

      return;
    }

    // === FOCUS ON INPUT ===
    if (isDownArrow) {
      if (suggestions.length > 0) {
        setFocusOnSuggestions(true);
        setSelectedSuggestionIndex(0);
        return;
      }

      // Otherwise, history navigation
      const historyValue = onHistoryNavigateDown(value);
      if (historyValue !== undefined) {
        setValue(historyValue);
      }
      return;
    }

    if (isUpArrow) {
      // History navigation only
      const historyValue = onHistoryNavigateUp(value);
      if (historyValue !== undefined) {
        setValue(historyValue);
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPosition <= 0) return;
      const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(cursorPosition - 1);
      onResetHistory();
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
    onResetHistory();
  });
}
