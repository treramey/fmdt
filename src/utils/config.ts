import type { EnvironmentConfig } from '../types/index.js';

export function getConfig(): EnvironmentConfig {
  const azureDevOpsPat = process.env.AZURE_DEVOPS_PAT;
  const azureDevOpsOrg = process.env.AZURE_DEVOPS_ORG;
  const azureDevOpsProject = process.env.AZURE_DEVOPS_PROJECT;

  if (!azureDevOpsPat) {
    throw new Error(
      'AZURE_DEVOPS_PAT environment variable is not set. Please create a .env file based on .env.example',
    );
  }

  if (!azureDevOpsOrg) {
    throw new Error(
      'AZURE_DEVOPS_ORG environment variable is not set. Please create a .env file based on .env.example',
    );
  }

  if (!azureDevOpsProject) {
    throw new Error(
      'AZURE_DEVOPS_PROJECT environment variable is not set. Please create a .env file based on .env.example',
    );
  }

  return {
    azureDevOpsPat,
    azureDevOpsOrg,
    azureDevOpsProject,
  };
}

export function createAuthHeader(pat: string): string {
  // Azure DevOps uses Basic authentication with an empty username and PAT as password
  const credentials = Buffer.from(`:${pat}`).toString('base64');
  return `Basic ${credentials}`;
}
