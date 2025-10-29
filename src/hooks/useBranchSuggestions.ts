import React from 'react';
import { useDebounce } from './useDebounce.js';
import { loadBranchCache } from '../utils/branch-cache.js';
import type { Suggestion } from '../types/branch-input.js';
import { buildCommandSuggestions } from '../utils/commands.js';

export type UseBranchSuggestionsResult = {
  suggestions: Suggestion[];
  isCommandInput: boolean;
  trimmedValue: string;
};

export function useBranchSuggestions(value: string): UseBranchSuggestionsResult {
  const [branchCache, setBranchCache] = React.useState<string[]>([]);
  const [branchSuggestions, setBranchSuggestions] = React.useState<string[]>([]);

  const debouncedValue = useDebounce(value, 150);
  const trimmedValue = value.trim();
  const isCommandInput = trimmedValue.startsWith('/');

  // Load branch cache on mount
  React.useEffect(() => {
    const cache = loadBranchCache();
    if (cache) {
      setBranchCache(cache.allBranches);
    }
  }, []);

  // Build command suggestions
  const commandSuggestions = React.useMemo<Suggestion[]>(() => {
    if (!isCommandInput) {
      return [];
    }

    if (trimmedValue.length === 0) {
      return [];
    }

    return buildCommandSuggestions(trimmedValue);
  }, [isCommandInput, trimmedValue]);

  // Filter branch suggestions based on debounced input
  React.useEffect(() => {
    if (isCommandInput) {
      setBranchSuggestions([]);
      return;
    }

    if (value.length === 0 || debouncedValue.length === 0) {
      setBranchSuggestions([]);
      return;
    }

    const filtered = branchCache
      .filter((branch) => branch.toLowerCase().includes(debouncedValue.toLowerCase()))
      .slice(0, 10);

    setBranchSuggestions(filtered);
  }, [value, debouncedValue, branchCache, isCommandInput]);

  // Convert to Suggestion type
  const suggestions = React.useMemo<Suggestion[]>(() => {
    if (isCommandInput) {
      return commandSuggestions;
    }
    return branchSuggestions.map((branch) => ({ kind: 'branch', value: branch }));
  }, [isCommandInput, commandSuggestions, branchSuggestions]);

  return {
    suggestions,
    isCommandInput,
    trimmedValue,
  };
}
