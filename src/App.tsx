import { Text } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { BranchInput } from './components/BranchInput.js';
import { ConfigurationSetup } from './components/ConfigurationSetup.js';
import { ErrorDisplay } from './components/ErrorDisplay.js';
import { Header } from './components/Header.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { MultiRepositoryMergeStatusDisplay } from './components/MultiRepositoryMergeStatusDisplay.js';
import { ProjectSelector } from './components/ProjectSelector.js';
import { UpdateNotification } from './components/UpdateNotification.js';
import { AzureDevOpsService } from './services/azure-devops.js';
import type { CliOptions, MultiRepositoryResult, Project, UpdateInfo } from './types/index.js';
import { performAutoUpdate } from './utils/auto-updater.js';
import { getConfig, hasValidConfig, updateProjectInConfig } from './utils/config.js';
import { getUniqueBranches, isCacheStale, loadBranchCache, saveBranchCache } from './utils/branch-cache.js';
import { addToHistory, loadHistory, saveHistory } from './utils/history.js';
import { checkForUpdates } from './utils/update-checker.js';

type AppProps = {
  readonly cliOptions: CliOptions;
  readonly version: string;
};

type AppState =
  | { type: 'loading'; message: string }
  | { type: 'error'; error: string }
  | { type: 'displayMultiStatus'; result: MultiRepositoryResult }
  | { type: 'inputBranch' }
  | { type: 'needsSetup' }
  | { type: 'selectingProject'; projects: Project[]; currentProjectName: string };

export function App({ cliOptions, version }: AppProps): React.JSX.Element {
  const [branch, setBranch] = useState(cliOptions.branch);
  const [state, setState] = useState<AppState>({
    type: 'loading',
    message: 'Initializing...',
  });
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(true);
  const [currentProject, setCurrentProject] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function checkAutoUpdateEnabled(): Promise<void> {
      if (process.env.NO_UPDATE_NOTIFIER === '1' || process.env.FMDT_DISABLE_AUTO_UPDATE === '1') {
        setAutoUpdateEnabled(false);
        return;
      }

      const config = await getConfig().catch(() => null);
      setAutoUpdateEnabled(config?.autoUpdate !== false);
    }

    void checkAutoUpdateEnabled();
  }, []);

  useEffect(() => {
    async function handleUpdates(): Promise<void> {
      if (!autoUpdateEnabled) {
        return;
      }

      try {
        const updateCheck = await checkForUpdates(version);
        if (updateCheck) {
          setUpdateInfo(updateCheck);
        }

        const config = await getConfig().catch(() => null);

        if (config?.autoUpdate === false) {
          return;
        }

        const result = await performAutoUpdate(version);

        if (result.attempted && result.success) {
          console.log('Auto-update successful:', result.version);
        } else if (result.attempted && !result.success) {
          console.error('Auto-update failed:', result.error);
        }
      } catch (error) {
        console.error('Update error:', error);
      }
    }

    void handleUpdates();
  }, [version, autoUpdateEnabled]);

  useEffect(() => {
    async function refreshBranchCache(): Promise<void> {
      try {
        const cache = loadBranchCache();
        const stale = !cache || isCacheStale(cache, 24 * 60 * 60 * 1000);

        if (stale) {
          // Background refresh - don't await
          void updateBranchCache();
        }
      } catch (error) {
        console.error('Branch cache error:', error);
      }
    }

    async function updateBranchCache(): Promise<void> {
      try {
        const config = await getConfig();
        const service = new AzureDevOpsService(config);
        const repos = await service.getAllBranches();

        const allBranches = getUniqueBranches(repos);

        saveBranchCache({
          lastUpdated: Date.now(),
          repositories: repos,
          allBranches,
          version: '1.0.0',
        });
      } catch (error) {
        // Show non-blocking error notification
        console.error('Failed to update branch cache:', error);
      }
    }

    void refreshBranchCache();
  }, []);

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
  }, [branch, cliOptions.switchProject]);

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

      setBranch(undefined);
      setState({ type: 'inputBranch' });
    } catch (error) {
      setState({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to update project',
      });
    }
  }

  if (state.type === 'needsSetup') {
    return <ConfigurationSetup onComplete={handleSetupComplete} />;
  }

  if (state.type === 'loading') {
    return <LoadingScreen message={state.message} />;
  }

  if (state.type === 'error') {
    return <ErrorDisplay error={state.error} />;
  }

  if (state.type === 'inputBranch') {
    return (
      <>
        {autoUpdateEnabled && updateInfo && (
          <UpdateNotification currentVersion={updateInfo.currentVersion} latestVersion={updateInfo.latestVersion} />
        )}
        <Header {...(currentProject ? { currentProject } : {})} />
        <BranchInput onSubmit={handleBranchSubmit} onSwitchProject={handleSwitchProject} />
      </>
    );
  }

  if (state.type === 'displayMultiStatus') {
    return (
      <>
        {autoUpdateEnabled && updateInfo && (
          <UpdateNotification currentVersion={updateInfo.currentVersion} latestVersion={updateInfo.latestVersion} />
        )}
        <MultiRepositoryMergeStatusDisplay
          {...state.result}
          onNewSearch={handleNewSearch}
          onSwitchProject={handleSwitchProject}
        />
      </>
    );
  }

  if (state.type === 'selectingProject') {
    return (
      <ProjectSelector
        projects={state.projects}
        onSelect={handleProjectSelected}
        initialSelectedName={state.currentProjectName}
      />
    );
  }

  return <Text>Unknown state</Text>;
}
