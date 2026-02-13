import type { AuthStore, EnvironmentReport, EnvReportRequest } from '@fmdt/core';
import { ScanComplete, ScanError, ScanStarted } from '../bus/events.ts';
import { Bus } from '../bus/index.ts';
import { loadConfig } from '../config/index.ts';
import { getProvider } from '../providers/index.ts';

export interface EnvReportDeps {
  authStore: AuthStore;
}

/** Execute an environment report: resolve project, build provider, scan, publish bus events. */
export async function executeEnvironmentReport(
  deps: EnvReportDeps,
  request: EnvReportRequest,
): Promise<EnvironmentReport> {
  const config = await loadConfig();
  if (!config) {
    throw new Error('No configuration found. Run setup first.');
  }
  const projectConfig = config.projects[request.projectId];
  if (!projectConfig) {
    throw new Error(`Project not found: ${request.projectId}`);
  }

  const authInfo = await deps.authStore.get(projectConfig.ref.provider);
  if (!authInfo) {
    throw new Error(`No credentials for provider: ${projectConfig.ref.provider}`);
  }

  const provider = getProvider(projectConfig, authInfo);

  const start = performance.now();
  await Bus.publish(ScanStarted, { totalRepos: 0 });

  try {
    const report = await provider.getEnvironmentReport(request);
    const duration = performance.now() - start;
    await Bus.publish(ScanComplete, { duration });
    return report;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await Bus.publish(ScanError, { repo: '*', error: message });
    throw err;
  }
}
