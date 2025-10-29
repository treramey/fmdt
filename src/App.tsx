import { Text } from 'ink';
import type React from 'react';
import { useState } from 'react';
import { BranchInput } from './components/BranchInput/index.js';
import { ConfigurationSetup } from './components/ConfigurationSetup.js';
import { ErrorDisplay } from './components/ErrorDisplay.js';
import { Header } from './components/Header.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { MultiRepositoryMergeStatusDisplay } from './components/MultiRepositoryMergeStatusDisplay.js';
import { ProjectSelector } from './components/ProjectSelector.js';
import { UpdateNotification } from './components/UpdateNotification.js';
import { useAppHandlers } from './hooks/useAppHandlers.js';
import { useAppInitialization } from './hooks/useAppInitialization.js';
import { useAutoUpdate } from './hooks/useAutoUpdate.js';
import { useBranchCache } from './hooks/useBranchCache.js';
import type { AppState, CliOptions } from './types/index.js';

type AppProps = {
  readonly cliOptions: CliOptions;
  readonly version: string;
};

export function App({ cliOptions, version }: AppProps): React.JSX.Element {
  const [branch, setBranch] = useState(cliOptions.branch);
  const [state, setState] = useState<AppState>({
    type: 'loading',
    message: 'Initializing...',
  });
  const [currentProject, setCurrentProject] = useState<string | undefined>(undefined);

  // Custom hooks for side effects
  const { updateInfo, autoUpdateEnabled } = useAutoUpdate({ version });
  useBranchCache();
  useAppInitialization({ branch, cliOptions, setState, setCurrentProject });

  // Event handlers
  const { handleBranchSubmit, handleNewSearch, handleSetupComplete, handleSwitchProject, handleProjectSelected } =
    useAppHandlers({
      setBranch,
      setState,
      setCurrentProject,
      cliOptions,
    });

  // Render based on state
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
