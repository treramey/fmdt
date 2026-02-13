import type { AuthStore, BranchMergeStatus, BranchReportRequest } from '@fmdt/core';
import { ScanComplete, ScanError, ScanRepoComplete, ScanStarted } from '../bus/events.ts';
import { Bus } from '../bus/index.ts';
import { loadConfig } from '../config/index.ts';
import { getProvider } from '../providers/index.ts';

export interface BranchReportDeps {
  authStore: AuthStore;
}

/** Execute a branch report: resolve project, build provider, scan repos, publish bus events. */
export async function executeBranchReport(
  deps: BranchReportDeps,
  request: BranchReportRequest,
): Promise<BranchMergeStatus[]> {
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
  await Bus.publish(ScanStarted, { totalRepos: 0 }); // Reason: totalRepos updated after repo list fetched

  try {
    const results = await provider.getBranchMergeStatus(request);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result) {
        await Bus.publish(ScanRepoComplete, { repo: result.repository, index: i });
      }
    }

    const duration = performance.now() - start;
    await Bus.publish(ScanComplete, { duration });

    return results;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await Bus.publish(ScanError, { repo: '*', error: message });
    throw err;
  }
}
