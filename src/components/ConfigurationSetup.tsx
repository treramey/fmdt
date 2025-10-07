import { Box, Text } from 'ink';
import type React from 'react';
import { useState } from 'react';
import { AzureDevOpsService } from '../services/azure-devops.js';
import type { SetupState } from '../types/index.js';
import { colors } from '../utils/colors.js';
import { saveConfigFile, savePatToKeyring } from '../utils/config.js';
import { ErrorDisplay } from './ErrorDisplay.js';
import { Header } from './Header.js';
import { LoadingScreen } from './LoadingScreen.js';
import { OrganizationInput } from './OrganizationInput.js';
import { PatInput } from './PatInput.js';
import { ProjectSelector } from './ProjectSelector.js';

type ConfigurationSetupProps = {
  onComplete: () => void;
};

export function ConfigurationSetup({ onComplete }: ConfigurationSetupProps): React.JSX.Element {
  const [setupState, setSetupState] = useState<SetupState>({ type: 'inputPat' });

  function handlePatSubmit(pat: string) {
    setSetupState({ type: 'inputOrg', pat });
  }

  async function handleOrgSubmit(org: string) {
    // Get PAT from current state
    if (setupState.type !== 'inputOrg') return;
    const { pat } = setupState;

    setSetupState({ type: 'validatingPat', pat, org });

    try {
      const tempConfig = {
        azureDevOpsPat: pat,
        azureDevOpsOrg: org,
        azureDevOpsProject: '', // Not needed for getProjects
      };

      const service = new AzureDevOpsService(tempConfig);
      const projects = await service.getProjects();

      if (projects.length === 0) {
        setSetupState({
          type: 'setupError',
          error: 'No projects found in this organization. Please check the organization name.',
          canRetry: true,
        });
        return;
      }

      setSetupState({ type: 'selectProject', pat, org, projects });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // CRITICAL: Determine if user can retry based on error type
      const canRetry = errorMessage.includes('Invalid PAT') || errorMessage.includes('Organization not found');

      setSetupState({
        type: 'setupError',
        error: errorMessage,
        canRetry,
      });
    }
  }

  async function handleProjectSelect(projectName: string) {
    if (setupState.type !== 'selectProject') return;
    const { pat, org } = setupState;

    setSetupState({ type: 'savingConfig', pat, org, project: projectName });

    try {
      // CRITICAL: Save PAT first, then config file
      // If PAT save fails, we don't want partial config
      await savePatToKeyring(pat);
      await saveConfigFile({
        azureDevOpsOrg: org,
        azureDevOpsProject: projectName,
        version: '1.0.0',
      });

      setSetupState({ type: 'setupComplete' });

      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      setSetupState({
        type: 'setupError',
        error: error instanceof Error ? error.message : 'Failed to save configuration',
        canRetry: false,
      });
    }
  }

  if (setupState.type === 'inputPat') {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <PatInput onSubmit={handlePatSubmit} />
      </Box>
    );
  }

  if (setupState.type === 'inputOrg') {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <OrganizationInput onSubmit={handleOrgSubmit} />
      </Box>
    );
  }

  if (setupState.type === 'validatingPat') {
    return <LoadingScreen message="Validating credentials and fetching projects..." />;
  }

  if (setupState.type === 'selectProject') {
    return <ProjectSelector projects={setupState.projects} onSelect={handleProjectSelect} />;
  }

  if (setupState.type === 'savingConfig') {
    return <LoadingScreen message="Saving configuration securely..." />;
  }

  if (setupState.type === 'setupComplete') {
    return (
      <Box padding={1}>
        <Text color={colors.foam}>✓ Configuration saved successfully!</Text>
      </Box>
    );
  }

  if (setupState.type === 'setupError') {
    return (
      <Box flexDirection="column" padding={1}>
        <ErrorDisplay error={setupState.error} />
        {setupState.canRetry}
      </Box>
    );
  }

  return <Text>Unknown setup state</Text>;
}
