import type { BranchMergeStatus } from '@fmdt/core';
import { AppConfigSchema, BranchMergeStatusSchema } from '@fmdt/core';
import { z } from 'zod/v4';

interface HeadlessDeps {
  fetchFn: typeof fetch;
  baseUrl: string;
}

async function fetchJSON<T>(deps: HeadlessDeps, path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await deps.fetchFn(`${deps.baseUrl}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return schema.parse(await res.json());
}

async function postJSON<T>(deps: HeadlessDeps, path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const res = await deps.fetchFn(`${deps.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return schema.parse(await res.json());
}

/** Resolve project ID — use --project name or fall back to active project. */
async function resolveProjectId(deps: HeadlessDeps, projectName: string | undefined): Promise<string> {
  const config = await fetchJSON(deps, '/config', AppConfigSchema);

  if (!projectName) {
    if (!config.activeProject || !config.projects[config.activeProject]) {
      throw new Error('No active project. Run fmdt --configure first.');
    }
    return config.activeProject;
  }

  // Reason: Match by project name (case-insensitive) since IDs are internal
  const match = Object.entries(config.projects).find(([, p]) => p.name.toLowerCase() === projectName.toLowerCase());
  if (!match) {
    const names = Object.values(config.projects)
      .map((p) => p.name)
      .join(', ');
    throw new Error(`Project "${projectName}" not found. Available: ${names}`);
  }
  return match[0];
}

function printBranchReport(branch: string, results: BranchMergeStatus[]): void {
  if (results.length === 0) {
    console.log(`No repositories found with branch: ${branch}`);
    return;
  }

  console.log(`\nBranch report for: ${branch}\n`);

  // Reason: Collect all environment names from first result for column headers
  const envNames = results[0]?.environments.map((e) => e.name) ?? [];
  const repoColWidth = Math.max(12, ...results.map((r) => r.repository.length)) + 2;

  // Header
  const header = 'Repository'.padEnd(repoColWidth) + envNames.map((n) => n.padEnd(14)).join('');
  console.log(header);
  console.log('-'.repeat(header.length));

  // Rows
  for (const repo of results) {
    const cells = repo.environments.map((env) => (env.merged ? 'Merged' : 'Not Merged').padEnd(14));
    console.log(repo.repository.padEnd(repoColWidth) + cells.join(''));
  }

  console.log(`\n${results.length} repositories scanned.`);
}

/** Run a branch report headlessly and print to stdout. */
export async function runHeadlessBranchReport(
  deps: HeadlessDeps,
  branch: string,
  projectName: string | undefined,
): Promise<void> {
  const projectId = await resolveProjectId(deps, projectName);
  const results = await postJSON(deps, '/report/branch', { branch, projectId }, z.array(BranchMergeStatusSchema));
  printBranchReport(branch, results);
}
