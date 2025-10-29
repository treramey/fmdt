import { Box } from 'ink';
import type React from 'react';
import { useInputNavigation } from '../../hooks/useInputNavigation.js';
import { Footer } from '../Footer.js';
import { BranchInputCommandFeedback } from './BranchInputCommandFeedback.js';
import { BranchInputProvider, useBranchInputContext } from './BranchInputContext.js';
import { BranchInputPrompt } from './BranchInputPrompt.js';
import { BranchInputSuggestionList } from './BranchInputSuggestionList.js';

type BranchInputProps = {
  onSubmit: (branch: string) => void;
  onSwitchProject?: () => void;
  initialValue?: string;
};

function BranchInputContent(): React.JSX.Element {
  const context = useBranchInputContext();

  // Setup keyboard navigation
  useInputNavigation(context);

  const handleSubmit = (submittedValue: string) => {
    context.onSubmitValue(submittedValue);
  };

  const handleChange = (newValue: string) => {
    context.clearFeedback();
    context.setValue(newValue);
    context.onResetHistory();
  };

  return (
    <Box flexDirection="column" padding={1}>
      <BranchInputPrompt value={context.value} onChange={handleChange} onSubmit={handleSubmit} />

      <BranchInputSuggestionList
        suggestions={context.suggestions}
        isCommandInput={context.isCommandInput}
        trimmedValue={context.trimmedValue}
        focusOnSuggestions={context.focusOnSuggestions}
        selectedSuggestionIndex={context.selectedSuggestionIndex}
      />

      <BranchInputCommandFeedback message={context.commandFeedback} />

      <Footer showNavigation showSearch showProjectSwitch />
    </Box>
  );
}

export function BranchInput({ onSubmit, onSwitchProject, initialValue }: BranchInputProps): React.JSX.Element {
  return (
    <BranchInputProvider
      onSubmit={onSubmit}
      {...(initialValue !== undefined && { initialValue })}
      {...(onSwitchProject !== undefined && { onSwitchProject })}
    >
      <BranchInputContent />
    </BranchInputProvider>
  );
}
