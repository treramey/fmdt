import type { AuthInfo, ProjectConfig, Provider } from '@fmdt/core';
import { createAzureDevOpsProviderFromAuth } from './azure-devops/index.ts';
import { createGitHubProviderFromAuth } from './github/index.ts';

/** Create a Provider for the given project configuration and credentials. */
export function getProvider(projectConfig: ProjectConfig, authInfo: AuthInfo): Provider {
  switch (projectConfig.ref.provider) {
    case 'azure-devops':
      return createAzureDevOpsProviderFromAuth(
        projectConfig.ref.org,
        projectConfig.ref.project,
        authInfo,
        projectConfig.serverBranches,
      );
    case 'github':
      return createGitHubProviderFromAuth(
        projectConfig.ref.org,
        authInfo,
        projectConfig.ref.repoFilter,
        projectConfig.serverBranches,
      );
  }
}
