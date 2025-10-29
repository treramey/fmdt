import React from 'react';
import { findCommandDefinition } from '../utils/commands.js';

export type UseCommandFeedbackResult = {
  commandFeedback: string | undefined;
  setCommandFeedback: (feedback: string | undefined) => void;
  clearFeedback: () => void;
  handleCommand: (command: string, onSwitchProject?: () => void) => boolean;
};

export function useCommandFeedback(): UseCommandFeedbackResult {
  const [commandFeedback, setCommandFeedback] = React.useState<string | undefined>(undefined);

  const clearFeedback = React.useCallback(() => {
    setCommandFeedback(undefined);
  }, []);

  const handleCommand = React.useCallback(
    (command: string, onSwitchProject?: () => void): boolean => {
      const trimmed = command.trim();
      const normalized = trimmed.startsWith('/') ? trimmed.slice(1).trim().toLowerCase() : trimmed.trim().toLowerCase();

      if (normalized.length === 0) {
        setCommandFeedback('Please provide a command after "/".');
        return false;
      }

      const matchedDefinition = findCommandDefinition(command);

      if (!matchedDefinition) {
        setCommandFeedback(`Unknown command: ${command}`);
        return false;
      }

      if (matchedDefinition.trigger === '/project') {
        if (!onSwitchProject) {
          setCommandFeedback('Project switching is not available.');
          return false;
        }

        setCommandFeedback(undefined);
        onSwitchProject();
        return true;
      }

      setCommandFeedback(`Unknown command: ${command}`);
      return false;
    },
    [],
  );

  return {
    commandFeedback,
    setCommandFeedback,
    clearFeedback,
    handleCommand,
  };
}
