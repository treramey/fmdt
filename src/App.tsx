import { Text } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { BranchInput } from './components/BranchInput.js';
import { ConfigurationSetup } from './components/ConfigurationSetup.js';
import { ErrorDisplay } from './components/ErrorDisplay.js';
import { Header } from './components/Header.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { MultiRepositoryMergeStatusDisplay } from './components/MultiRepositoryMergeStatusDisplay.js';
import { UpdateNotification } from './components/UpdateNotification.js';
import { AzureDevOpsService } from './services/azure-devops.js';
import type { CliOptions, MultiRepositoryResult, UpdateInfo } from './types/index.js';
import { getConfig, hasValidConfig } from './utils/config.js';
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
  | { type: 'needsSetup' };

export function App({ cliOptions, version }: AppProps): React.JSX.Element {
  const [branch, setBranch] = useState(cliOptions.branch);
  const [state, setState] = useState<AppState>({
    type: 'loading',
    message: 'Initializing...',
  });
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Check for updates (non-blocking, runs in parallel with initialization)
  useEffect(() => {
    async function checkUpdates(): Promise<void> {
      const result = await checkForUpdates(version);
      if (result) {
        setUpdateInfo(result);
      }
    }
    void checkUpdates();
  }, [version]);

  useEffect(() => {
    async function initialize(): Promise<void> {
      try {
        // BEFORE checking for branch, check hasValidConfig()
        const configExists = await hasValidConfig();
        if (!configExists) {
          setState({ type: 'needsSetup' });
          return;
        }

        const config = await getConfig();
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
  }, [branch]);

  async function handleBranchSubmit(branchInput: string): Promise<void> {
    setBranch(branchInput);

    // Save to history
    try {
      const currentHistory = await loadHistory();
      const updatedHistory = addToHistory(branchInput, currentHistory);
      await saveHistory(updatedHistory);
    } catch (error) {
      // Log but don't fail - history saving shouldn't break the app
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
    // After setup completes, transition to next state
    try {
      const config = await getConfig();

      if (cliOptions.branch) {
        // User provided --branch flag, fetch results
        setBranch(cliOptions.branch);
        setState({
          type: 'loading',
          message: 'Scanning all repositories...',
        });

        const service = new AzureDevOpsService(config);
        const result = await service.getBatchBranchMergeStatus(cliOptions.branch);
        setState({ type: 'displayMultiStatus', result });
      } else {
        // No branch provided, prompt user for input
        setState({ type: 'inputBranch' });
      }
    } catch (error) {
      setState({
        type: 'error',
        error: error instanceof Error ? error.message : 'An unknown error occurred',
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
        {updateInfo && (
          <UpdateNotification currentVersion={updateInfo.currentVersion} latestVersion={updateInfo.latestVersion} />
        )}
        <Header />
        <BranchInput onSubmit={handleBranchSubmit} />
      </>
    );
  }

  if (state.type === 'displayMultiStatus') {
    return (
      <>
        {updateInfo && (
          <UpdateNotification currentVersion={updateInfo.currentVersion} latestVersion={updateInfo.latestVersion} />
        )}
        <MultiRepositoryMergeStatusDisplay {...state.result} onNewSearch={handleNewSearch} />
      </>
    );
  }

  return <Text>Unknown state</Text>;
}
