import type { Dispatch, SetStateAction } from 'react';
import { AzureDevOpsService } from '../services/azure-devops.js';
import type { AppState, CliOptions } from '../types/index.js';
import { clearBranchCache, refreshBranchCache } from '../utils/branch-cache.js';
import { getConfig, updateProjectInConfig } from '../utils/config.js';
import { addToHistory, loadHistory, saveHistory } from '../utils/history.js';

type UseAppHandlersOptions = {
  setBranch: Dispatch<SetStateAction<string | undefined>>;
  setState: Dispatch<SetStateAction<AppState>>;
  setCurrentProject: Dispatch<SetStateAction<string | undefined>>;
  cliOptions: CliOptions;
};

type UseAppHandlersReturn = {
  handleBranchSubmit: (branchInput: string) => Promise<void>;
  handleNewSearch: () => void;
  handleSetupComplete: () => Promise<void>;
  handleSwitchProject: () => Promise<void>;
  handleProjectSelected: (projectName: string) => Promise<void>;
};

export function useAppHandlers({
  setBranch,
  setState,
  setCurrentProject,
  cliOptions,
}: UseAppHandlersOptions): UseAppHandlersReturn {
  async function handleBranchSubmit(branchInput: string): Promise<void> {
    setBranch(branchInput);

    try {
      const currentHistory = await loadHistory();
      const updatedHistory = addToHistory(branchInput, currentHistory);
      await saveHistory(updatedHistory);
    } catch (error) {
      console.error('Failed to save history:', error);
    }

    try {
      const config = await getConfig();
      const service = new AzureDevOpsService(config);

      setState({
        type: 'loading',
        message: 'Scanning all repositories...',
      });

      const result = await service.getBatchBranchMergeStatus(branchInput);

      setState({ type: 'displayMultiStatus', result });
    } catch (error) {
      setState({
        type: 'error',
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  }

  function handleNewSearch(): void {
    setBranch(undefined);
    setState({ type: 'inputBranch' });
  }

  async function handleSetupComplete(): Promise<void> {
    try {
      const config = await getConfig();

      if (cliOptions.branch) {
        setBranch(cliOptions.branch);
        setState({
          type: 'loading',
          message: 'Scanning all repositories...',
        });

        const service = new AzureDevOpsService(config);
        const result = await service.getBatchBranchMergeStatus(cliOptions.branch);
        setState({ type: 'displayMultiStatus', result });
      } else {
        setState({ type: 'inputBranch' });
      }
    } catch (error) {
      setState({
        type: 'error',
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  }

  async function handleSwitchProject(): Promise<void> {
    try {
      setState({ type: 'loading', message: 'Loading projects...' });

      const config = await getConfig();
      const service = new AzureDevOpsService(config);
      const projects = await service.getProjects();

      if (projects.length === 0) {
        setState({
          type: 'error',
          error: 'No projects found in your organization.',
        });
        return;
      }

      setState({ type: 'selectingProject', projects, currentProjectName: config.azureDevOpsProject });
    } catch (error) {
      setState({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to load projects',
      });
    }
  }

  async function handleProjectSelected(projectName: string): Promise<void> {
    try {
      setState({ type: 'loading', message: 'Updating configuration...' });

      await updateProjectInConfig(projectName);
      setCurrentProject(projectName);

      setState({ type: 'loading', message: 'Refreshing branch cache...' });
      clearBranchCache();
      await refreshBranchCache();

      setBranch(undefined);
      setState({ type: 'inputBranch' });
    } catch (error) {
      setState({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to update project',
      });
    }
  }

  return {
    handleBranchSubmit,
    handleNewSearch,
    handleSetupComplete,
    handleSwitchProject,
    handleProjectSelected,
  };
}
