import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import xdg from '@folder/xdg';
import { Entry } from '@napi-rs/keyring';
import type { ConfigFile, RuntimeConfig } from '../types/index.js';
import { ConfigFileSchema } from '../types/index.js';

const KEYRING_SERVICE = 'fmdt';
const KEYRING_ACCOUNT = 'azure-devops-pat';
const CONFIG_DIR_NAME = 'fmdt';
const CONFIG_FILE_NAME = 'config.json';

export function getConfigDir(): string {
  // macOS: ~/Library/Application Support/fmdt
  // Linux: ~/.config/fmdt
  // Windows: %APPDATA%/fmdt
  const paths = xdg();
  return join(paths.config, CONFIG_DIR_NAME);
}

export function getConfigFilePath(): string {
  return join(getConfigDir(), CONFIG_FILE_NAME);
}

export async function loadConfigFile(): Promise<ConfigFile | null> {
  try {
    const configPath = getConfigFilePath();
    const fileContent = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(fileContent);

    return ConfigFileSchema.parse(parsed);
  } catch (_error) {
    return null;
  }
}

export async function saveConfigFile(config: ConfigFile): Promise<void> {
  const configDir = getConfigDir();
  const configPath = getConfigFilePath();

  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function loadPatFromKeyring(): Promise<string | null> {
  try {
    const entry = new Entry(KEYRING_SERVICE, KEYRING_ACCOUNT);
    const password = entry.getPassword();
    return password;
  } catch (_error) {
    return null;
  }
}

export async function savePatToKeyring(pat: string): Promise<void> {
  try {
    const entry = new Entry(KEYRING_SERVICE, KEYRING_ACCOUNT);
    entry.setPassword(pat);
  } catch (_error) {
    throw new Error(
      'Unable to save PAT to system keyring. ' +
        'Please ensure your system keyring service is available. ' +
        'Linux users may need to install gnome-keyring or libsecret.',
    );
  }
}

export async function deletePatFromKeyring(): Promise<void> {
  try {
    const entry = new Entry(KEYRING_SERVICE, KEYRING_ACCOUNT);
    entry.deletePassword();
  } catch (_error) {}
}

export async function getConfig(): Promise<RuntimeConfig> {
  const pat = await loadPatFromKeyring();
  const configFile = await loadConfigFile();

  if (!pat) {
    throw new Error(
      'Azure DevOps PAT not found in keyring. ' + 'Please run with --configure flag to set up credentials.',
    );
  }

  if (!configFile) {
    throw new Error('Configuration file not found. ' + 'Please run with --configure flag to set up credentials.');
  }

  return {
    azureDevOpsPat: pat,
    azureDevOpsOrg: configFile.azureDevOpsOrg,
    azureDevOpsProject: configFile.azureDevOpsProject,
    autoUpdate: configFile.autoUpdate,
  };
}

export async function hasValidConfig(): Promise<boolean> {
  try {
    const pat = await loadPatFromKeyring();
    const configFile = await loadConfigFile();
    return Boolean(pat && configFile);
  } catch {
    return false;
  }
}

export function createAuthHeader(pat: string): string {
  // Azure DevOps uses Basic authentication with an empty username and PAT as password
  const credentials = Buffer.from(`:${pat}`).toString('base64');
  return `Basic ${credentials}`;
}
