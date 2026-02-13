import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppConfig } from '@fmdt/core';
import { AppConfigSchema } from '@fmdt/core';
import xdg from '@folder/xdg';

const CONFIG_DIR_NAME = 'fmdt';
const CONFIG_FILE_NAME = 'config.json';

export function getConfigDir(): string {
  const paths = xdg();
  return join(paths.config, CONFIG_DIR_NAME);
}

export function getConfigFilePath(): string {
  return join(getConfigDir(), CONFIG_FILE_NAME);
}

export async function loadConfig(): Promise<AppConfig | null> {
  try {
    const raw = await readFile(getConfigFilePath(), 'utf-8');
    return AppConfigSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const dir = getConfigDir();
  await mkdir(dir, { recursive: true });
  await writeFile(getConfigFilePath(), JSON.stringify(config, null, 2), 'utf-8');
}

/** Delete the config file (for --configure reset). */
export async function deleteConfig(): Promise<void> {
  try {
    await rm(getConfigFilePath());
  } catch {
    // Reason: File may not exist — that's fine for a reset
  }
}

/** Return a default empty config for fresh installs. */
export function defaultConfig(): AppConfig {
  return {
    version: '2.0.0',
    autoUpdate: true,
    activeProject: '',
    projects: {},
  };
}
