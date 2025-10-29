import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';
import { AzureDevOpsService } from '../services/azure-devops.js';
import type { AppState, CliOptions } from '../types/index.js';
import { getConfig, hasValidConfig } from '../utils/config.js';

type UseAppInitializationOptions = {
  branch: string | undefined;
  cliOptions: CliOptions;
  setState: Dispatch<SetStateAction<AppState>>;
  setCurrentProject: Dispatch<SetStateAction<string | undefined>>;
};

export function useAppInitialization({
  branch,
  cliOptions,
  setState,
  setCurrentProject,
}: UseAppInitializationOptions): void {
  useEffect(() => {
    async function initialize(): Promise<void> {
      try {
        const configExists = await hasValidConfig();
        if (!configExists) {
          setState({ type: 'needsSetup' });
          return;
        }

        if (cliOptions.switchProject) {
          setState({ type: 'loading', message: 'Loading projects...' });

          const config = await getConfig();
          setCurrentProject(config.azureDevOpsProject);
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
          return;
        }

        const config = await getConfig();
        setCurrentProject(config.azureDevOpsProject);
        const service = new AzureDevOpsService(config);

        if (!branch) {
          setState({ type: 'inputBranch' });
          return;
        }

        setState({
          type: 'loading',
          message: 'Scanning all repositories...',
        });

        const result = await service.getBatchBranchMergeStatus(branch);

        setState({ type: 'displayMultiStatus', result });
      } catch (error) {
        setState({
          type: 'error',
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }
    }

    void initialize();
  }, [branch, cliOptions.switchProject, setState, setCurrentProject]);
}
