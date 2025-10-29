import React from 'react';
import { useBranchSuggestions } from '../../hooks/useBranchSuggestions.js';
import { useCommandFeedback } from '../../hooks/useCommandFeedback.js';
import { useInputHistory } from '../../hooks/useInputHistory.js';
import type { Suggestion } from '../../types/branch-input.js';

type BranchInputContextValue = {
  // Input state
  value: string;
  setValue: (value: string) => void;
  cursorPosition: number;
  setCursorPosition: (position: number) => void;

  // Suggestions state
  suggestions: readonly Suggestion[];
  isCommandInput: boolean;
  trimmedValue: string;
  focusOnSuggestions: boolean;
  setFocusOnSuggestions: (focus: boolean) => void;
  selectedSuggestionIndex: number;
  setSelectedSuggestionIndex: (index: number) => void;

  // Command feedback
  commandFeedback: string | undefined;
  clearFeedback: () => void;

  // History
  onHistoryNavigateUp: (currentValue: string) => string | undefined;
  onHistoryNavigateDown: (currentValue: string) => string | undefined;
  onResetHistory: () => void;

  // Actions
  onSubmitSuggestion: (suggestion: Suggestion) => void;
  onSubmitValue: (value: string) => void;
  resetInputState: () => void;

  // Props from parent
  onSwitchProject?: () => void;
};

const BranchInputContext = React.createContext<BranchInputContextValue | undefined>(undefined);

type BranchInputProviderProps = {
  children: React.ReactNode;
  initialValue?: string;
  onSubmit: (branch: string) => void;
  onSwitchProject?: () => void;
};

export function BranchInputProvider({
  children,
  initialValue = '',
  onSubmit,
  onSwitchProject,
}: BranchInputProviderProps): React.JSX.Element {
  const [value, setValue] = React.useState(initialValue);
  const [cursorPosition, setCursorPosition] = React.useState(initialValue.length);
  const [focusOnSuggestions, setFocusOnSuggestions] = React.useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState(0);

  // Custom hooks
  const { suggestions, isCommandInput, trimmedValue } = useBranchSuggestions(value);
  const { commandFeedback, clearFeedback, handleCommand } = useCommandFeedback();
  const history = useInputHistory();

  // Sync selected index with suggestions length
  React.useEffect(() => {
    if (suggestions.length === 0) {
      setSelectedSuggestionIndex(0);
      if (focusOnSuggestions) {
        setFocusOnSuggestions(false);
      }
      return;
    }

    if (selectedSuggestionIndex >= suggestions.length) {
      setSelectedSuggestionIndex(0);
    }
  }, [suggestions.length, focusOnSuggestions, selectedSuggestionIndex]);

  const resetInputState = React.useCallback(() => {
    setValue('');
    setCursorPosition(0);
    history.resetHistory();
    setFocusOnSuggestions(false);
    clearFeedback();
  }, [history, clearFeedback]);

  const onSubmitValue = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();

      if (trimmed.length === 0) {
        return;
      }

      if (trimmed.startsWith('/')) {
        const handled = handleCommand(trimmed, onSwitchProject);
        if (handled) {
          resetInputState();
        }
        return;
      }

      clearFeedback();
      onSubmit(trimmed);
      resetInputState();
    },
    [handleCommand, onSwitchProject, resetInputState, clearFeedback, onSubmit],
  );

  const onSubmitSuggestion = React.useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.kind === 'branch') {
        setValue(suggestion.value);
        setCursorPosition(suggestion.value.length);
        setFocusOnSuggestions(false);
        history.resetHistory();
        clearFeedback();
        return;
      }

      if (suggestion.kind === 'command') {
        setFocusOnSuggestions(false);
        onSubmitValue(suggestion.value);
        return;
      }

      setFocusOnSuggestions(false);
      handleCommand(suggestion.value, onSwitchProject);
    },
    [history, clearFeedback, onSubmitValue, handleCommand, onSwitchProject],
  );

  const contextValue = React.useMemo<BranchInputContextValue>(
    () => ({
      value,
      setValue,
      cursorPosition,
      setCursorPosition,
      suggestions,
      isCommandInput,
      trimmedValue,
      focusOnSuggestions,
      setFocusOnSuggestions,
      selectedSuggestionIndex,
      setSelectedSuggestionIndex,
      commandFeedback,
      clearFeedback,
      onHistoryNavigateUp: history.navigateUp,
      onHistoryNavigateDown: history.navigateDown,
      onResetHistory: history.resetHistory,
      onSubmitSuggestion,
      onSubmitValue,
      resetInputState,
      ...(onSwitchProject !== undefined && { onSwitchProject }),
    }),
    [
      value,
      cursorPosition,
      suggestions,
      isCommandInput,
      trimmedValue,
      focusOnSuggestions,
      selectedSuggestionIndex,
      commandFeedback,
      clearFeedback,
      history.navigateUp,
      history.navigateDown,
      history.resetHistory,
      onSubmitSuggestion,
      onSubmitValue,
      resetInputState,
      onSwitchProject,
    ],
  );

  return <BranchInputContext.Provider value={contextValue}>{children}</BranchInputContext.Provider>;
}

export function useBranchInputContext(): BranchInputContextValue {
  const context = React.useContext(BranchInputContext);
  if (!context) {
    throw new Error('useBranchInputContext must be used within BranchInputProvider');
  }
  return context;
}
