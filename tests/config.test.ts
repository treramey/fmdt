import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { ConfigFile } from '../src/types/index.js';
import { createAuthHeader, getConfigDir, getConfigFilePath } from '../src/utils/config.js';

// Mock the modules before importing the functions that depend on them
vi.mock('@folder/xdg', () => ({
  default: () => ({
    cache: join(process.cwd(), 'tests', '.test-config'),
    config: join(process.cwd(), 'tests', '.test-config'),
    data: join(process.cwd(), 'tests', '.test-config'),
    state: join(process.cwd(), 'tests', '.test-config'),
    runtime: join(process.cwd(), 'tests', '.test-config'),
    logs: join(process.cwd(), 'tests', '.test-config', 'logs'),
    config_dirs: [join(process.cwd(), 'tests', '.test-config')],
    data_dirs: [join(process.cwd(), 'tests', '.test-config')],
  }),
}));

vi.mock('@napi-rs/keyring', () => {
  // Store passwords in module-level closure
  const passwords = new Map<string, string>();

  return {
    Entry: class MockEntry {
      private service: string;
      private account: string;

      constructor(service: string, account: string) {
        this.service = service;
        this.account = account;
      }

      getPassword(): string {
        const key = `${this.service}:${this.account}`;
        const password = passwords.get(key);
        if (!password) {
          throw new Error('Password not found');
        }
        return password;
      }

      setPassword(password: string): void {
        const key = `${this.service}:${this.account}`;
        passwords.set(key, password);
      }

      deletePassword(): void {
        const key = `${this.service}:${this.account}`;
        passwords.delete(key);
      }
    },
  };
});

// Now import the functions that use the mocked modules
const {
  loadConfigFile,
  saveConfigFile,
  loadPatFromKeyring,
  savePatToKeyring,
  deletePatFromKeyring,
  hasValidConfig,
  getConfig,
  updateProjectInConfig,
} = await import('../src/utils/config.js');

describe('createAuthHeader', () => {
  test('should create valid Basic auth header', () => {
    const pat = 'test-token-123';
    const header = createAuthHeader(pat);

    expect(header).toMatch(/^Basic /);

    // Decode and verify
    const encoded = header.replace('Basic ', '');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    expect(decoded).toBe(':test-token-123');
  });

  test('should handle special characters in PAT', () => {
    const pat = 'token-with-@#$%^&*';
    const header = createAuthHeader(pat);
    const encoded = header.replace('Basic ', '');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    expect(decoded).toBe(':token-with-@#$%^&*');
  });
});

describe('config file operations', () => {
  const testDir = join(process.cwd(), 'tests', '.test-config');

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('getConfigDir', () => {
    test('should return config directory path', () => {
      const dir = getConfigDir();
      expect(dir).toBeTruthy();
      expect(typeof dir).toBe('string');
    });
  });

  describe('getConfigFilePath', () => {
    test('should return config file path', () => {
      const path = getConfigFilePath();
      expect(path).toBeTruthy();
      expect(path).toContain('config.json');
    });
  });

  describe('saveConfigFile and loadConfigFile', () => {
    test('should save and load valid config file', async () => {
      const config: ConfigFile = {
        azureDevOpsOrg: 'test-org',
        azureDevOpsProject: 'test-project',
        version: '1.0.0',
        autoUpdate: true,
      };

      await saveConfigFile(config);
      const loaded = await loadConfigFile();

      expect(loaded).toEqual(config);
    });

    test('should return null when config file does not exist', async () => {
      // Delete config file if it exists
      const configPath = getConfigFilePath();
      await rm(configPath, { force: true });

      const loaded = await loadConfigFile();
      expect(loaded).toBeNull();
    });

    test('should return null when config file is invalid JSON', async () => {
      const configPath = getConfigFilePath();
      await writeFile(configPath, 'invalid json', 'utf-8');
      const loaded = await loadConfigFile();
      expect(loaded).toBeNull();
    });
  });

  describe('keyring operations', () => {
    test('should save and load PAT from keyring', async () => {
      await savePatToKeyring('test-pat-123');
      const loaded = await loadPatFromKeyring();
      expect(loaded).toBe('test-pat-123');
    });

    test('should return null when PAT does not exist', async () => {
      await deletePatFromKeyring();
      const loaded = await loadPatFromKeyring();
      expect(loaded).toBeNull();
    });

    test('should delete PAT from keyring', async () => {
      await savePatToKeyring('test-pat-456');
      await deletePatFromKeyring();
      const loaded = await loadPatFromKeyring();
      expect(loaded).toBeNull();
    });
  });

  describe('hasValidConfig', () => {
    test('should return false when PAT is missing', async () => {
      await deletePatFromKeyring();
      await saveConfigFile({
        azureDevOpsOrg: 'test-org',
        azureDevOpsProject: 'test-project',
        version: '1.0.0',
      });

      const result = await hasValidConfig();
      expect(result).toBe(false);
    });

    test('should return false when config file is missing', async () => {
      await savePatToKeyring('test-pat');
      const configPath = getConfigFilePath();
      await rm(configPath, { force: true });

      const result = await hasValidConfig();
      expect(result).toBe(false);
    });

    test('should return true when both PAT and config file exist', async () => {
      await savePatToKeyring('test-pat');
      await saveConfigFile({
        azureDevOpsOrg: 'test-org',
        azureDevOpsProject: 'test-project',
        version: '1.0.0',
      });

      const result = await hasValidConfig();
      expect(result).toBe(true);
    });
  });

  describe('getConfig', () => {
    test('should throw error when PAT is missing', async () => {
      await deletePatFromKeyring();
      await saveConfigFile({
        azureDevOpsOrg: 'test-org',
        azureDevOpsProject: 'test-project',
        version: '1.0.0',
      });

      await expect(getConfig()).rejects.toThrow('Azure DevOps PAT not found in keyring');
    });

    test('should throw error when config file is missing', async () => {
      await savePatToKeyring('test-pat');
      const configPath = getConfigFilePath();
      await rm(configPath, { force: true });

      await expect(getConfig()).rejects.toThrow('Configuration file not found');
    });

    test('should return complete runtime config when both exist', async () => {
      await savePatToKeyring('test-pat-123');
      await saveConfigFile({
        azureDevOpsOrg: 'test-org',
        azureDevOpsProject: 'test-project',
        version: '1.0.0',
      });

      const config = await getConfig();

      expect(config).toEqual({
        azureDevOpsPat: 'test-pat-123',
        azureDevOpsOrg: 'test-org',
        azureDevOpsProject: 'test-project',
        autoUpdate: true,
      });
    });
  });

  describe('updateProjectInConfig', () => {
    test('should update only project field', async () => {
      // Setup: save initial config
      await savePatToKeyring('test-pat');
      await saveConfigFile({
        azureDevOpsOrg: 'test-org',
        azureDevOpsProject: 'old-project',
        version: '1.0.0',
        autoUpdate: true,
      });

      // Execute: update project
      await updateProjectInConfig('new-project');

      // Verify: only project changed
      const updated = await loadConfigFile();
      expect(updated?.azureDevOpsProject).toBe('new-project');
      expect(updated?.azureDevOpsOrg).toBe('test-org');
      expect(updated?.autoUpdate).toBe(true);
      expect(updated?.version).toBe('1.0.0');
    });

    test('should throw error when config does not exist', async () => {
      // Setup: delete config
      const configPath = getConfigFilePath();
      await rm(configPath, { force: true });

      // Verify: throws error
      await expect(updateProjectInConfig('any-project'))
        .rejects.toThrow('Configuration not found');
    });

    test('should preserve other config fields when updating project', async () => {
      // Setup: save config with all fields
      await saveConfigFile({
        azureDevOpsOrg: 'original-org',
        azureDevOpsProject: 'original-project',
        version: '1.0.0',
        autoUpdate: false,
      });

      // Execute: update project
      await updateProjectInConfig('updated-project');

      // Verify: all other fields preserved
      const updated = await loadConfigFile();
      expect(updated).toEqual({
        azureDevOpsOrg: 'original-org',
        azureDevOpsProject: 'updated-project',
        version: '1.0.0',
        autoUpdate: false,
      });
    });
  });
});
