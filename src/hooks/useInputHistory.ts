import React from 'react';
import { loadHistory } from '../utils/history.js';

export type UseInputHistoryResult = {
  history: string[];
  historyPosition: number;
  savedInput: string;
  setHistoryPosition: (position: number) => void;
  setSavedInput: (input: string) => void;
  resetHistory: () => void;
  navigateUp: (currentValue: string) => string | undefined;
  navigateDown: (currentValue: string) => string | undefined;
};

export function useInputHistory(): UseInputHistoryResult {
  const [history, setHistory] = React.useState<string[]>([]);
  const [historyPosition, setHistoryPosition] = React.useState(-1);
  const [savedInput, setSavedInput] = React.useState('');

  // Load history on mount
  React.useEffect(() => {
    void loadHistory().then(setHistory);
  }, []);

  const resetHistory = React.useCallback(() => {
    setHistoryPosition(-1);
    setSavedInput('');
  }, []);

  const navigateUp = React.useCallback(
    (currentValue: string): string | undefined => {
      if (history.length === 0) return undefined;
      const newPosition = historyPosition + 1;
      if (newPosition >= history.length) return undefined;
      if (historyPosition === -1) {
        setSavedInput(currentValue);
      }
      const historyItem = history[newPosition];
      if (historyItem) {
        setHistoryPosition(newPosition);
        return historyItem;
      }
      return undefined;
    },
    [history, historyPosition],
  );

  const navigateDown = React.useCallback(
    (currentValue: string): string | undefined => {
      if (historyPosition === -1) return undefined;
      const newPosition = historyPosition - 1;
      if (newPosition === -1) {
        setHistoryPosition(-1);
        return savedInput;
      }
      const historyItem = history[newPosition];
      if (historyItem) {
        setHistoryPosition(newPosition);
        return historyItem;
      }
      return undefined;
    },
    [history, historyPosition, savedInput],
  );

  return {
    history,
    historyPosition,
    savedInput,
    setHistoryPosition,
    setSavedInput,
    resetHistory,
    navigateUp,
    navigateDown,
  };
}
