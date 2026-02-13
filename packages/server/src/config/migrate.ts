import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppConfig } from '@fmdt/core';
import { DEFAULT_SERVER_BRANCHES } from '@fmdt/core';
import { Entry } from '@napi-rs/keyring';
import { z } from 'zod/v4';
import { getConfigDir, loadConfig, saveConfig } from './index.ts';

/** V1 config file schema (from src/types/index.ts). */
const V1ConfigSchema = z.object({
  azureDevOpsOrg: z.string().min(1),
  azureDevOpsProject: z.string().min(1),
  version: z.string().optional(),
  autoUpdate: z.boolean().optional(),
});

const V1_KEYRING_SERVICE = 'fmdt';
const V1_KEYRING_ACCOUNT = 'azure-devops-pat';
const V2_KEYRING_KEY = 'fmdt:azure-devops';

function readV1Pat(): string | null {
  try {
    const entry = new Entry(V1_KEYRING_SERVICE, V1_KEYRING_ACCOUNT);
    return entry.getPassword() ?? null;
  } catch {
    return null;
  }
}

function writeV2Pat(pat: string): void {
  const entry = new Entry(V1_KEYRING_SERVICE, V2_KEYRING_KEY);
  entry.setPassword(JSON.stringify({ type: 'pat', token: pat }));
}

/**
 * Detect v1 config and migrate to v2 format.
 * Returns true if migration was performed, false if v2 config already exists or v1 not found.
 */
export async function migrateV1Config(): Promise<boolean> {
  // Skip if v2 config already exists
  const existing = await loadConfig();
  if (existing) return false;

  // Try to read v1 config
  const v1Path = join(getConfigDir(), 'config.json');
  let v1Raw: string;
  try {
    v1Raw = await readFile(v1Path, 'utf-8');
  } catch {
    return false;
  }

  const v1Result = V1ConfigSchema.safeParse(JSON.parse(v1Raw));
  if (!v1Result.success) return false;

  const v1 = v1Result.data;
  const pat = readV1Pat();

  // Build v2 config
  const projectId = 'migrated-azure';
  const v2Config: AppConfig = {
    version: '2.0.0',
    autoUpdate: v1.autoUpdate ?? true,
    activeProject: projectId,
    projects: {
      [projectId]: {
        id: projectId,
        name: `${v1.azureDevOpsOrg}/${v1.azureDevOpsProject}`,
        ref: {
          provider: 'azure-devops',
          org: v1.azureDevOpsOrg,
          project: v1.azureDevOpsProject,
        },
        serverBranches: DEFAULT_SERVER_BRANCHES,
        createdAt: new Date().toISOString(),
      },
    },
  };

  await saveConfig(v2Config);

  // Re-key PAT from v1 format to v2 format
  if (pat) {
    writeV2Pat(pat);
  }

  return true;
}
