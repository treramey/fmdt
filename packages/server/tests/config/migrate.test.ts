import type { AppConfig } from '@fmdt/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock keyring and filesystem at module level
let mockKeyringStore: Map<string, string>;
let mockFsFiles: Map<string, string>;
let savedConfig: AppConfig | null;

vi.mock('@napi-rs/keyring', () => ({
  Entry: class MockEntry {
    private readonly service: string;
    private readonly account: string;
    constructor(service: string, account: string) {
      this.service = service;
      this.account = account;
    }
    getPassword(): string | null {
      return mockKeyringStore.get(`${this.service}:${this.account}`) ?? null;
    }
    setPassword(password: string): void {
      mockKeyringStore.set(`${this.service}:${this.account}`, password);
    }
  },
}));

vi.mock('../../src/config/index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/config/index.ts')>();
  return {
    ...original,
    getConfigDir: () => '/tmp/fmdt-test',
    loadConfig: async () => savedConfig,
    saveConfig: async (config: AppConfig) => {
      savedConfig = config;
    },
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...original,
    readFile: async (path: string) => {
      const content = mockFsFiles.get(path);
      if (!content) throw new Error(`ENOENT: ${path}`);
      return content;
    },
  };
});

afterEach(() => {
  mockKeyringStore = new Map();
  mockFsFiles = new Map();
  savedConfig = null;
  vi.clearAllMocks();
});

describe('migrateV1Config', () => {
  // Reason: Must import dynamically so mocks are in place
  async function getMigrate() {
    return (await import('../../src/config/migrate.ts')).migrateV1Config;
  }

  it('migrates v1 config to v2 format', async () => {
    mockKeyringStore = new Map();
    mockFsFiles = new Map();

    const v1Config = {
      azureDevOpsOrg: 'myorg',
      azureDevOpsProject: 'myproject',
      version: '1.0.0',
      autoUpdate: true,
    };
    mockFsFiles.set('/tmp/fmdt-test/config.json', JSON.stringify(v1Config));
    mockKeyringStore.set('fmdt:azure-devops-pat', 'my-pat-token');

    const migrateV1Config = await getMigrate();
    const result = await migrateV1Config();

    expect(result).toBe(true);
    expect(savedConfig).not.toBeNull();
    expect(savedConfig?.version).toBe('2.0.0');
    expect(savedConfig?.activeProject).toBe('migrated-azure');
    const project = savedConfig?.projects['migrated-azure'];
    expect(project?.ref).toEqual({ provider: 'azure-devops', org: 'myorg', project: 'myproject' });
    expect(project?.serverBranches).toHaveLength(4);

    // PAT should be re-keyed
    const v2Pat = mockKeyringStore.get('fmdt:fmdt:azure-devops');
    expect(v2Pat).toContain('my-pat-token');
  });

  it('returns false when v2 config already exists', async () => {
    mockKeyringStore = new Map();
    mockFsFiles = new Map();
    savedConfig = {
      version: '2.0.0',
      autoUpdate: true,
      activeProject: '',
      projects: {},
    };

    const migrateV1Config = await getMigrate();
    const result = await migrateV1Config();

    expect(result).toBe(false);
  });

  it('returns false when v1 config does not exist', async () => {
    mockKeyringStore = new Map();
    mockFsFiles = new Map();

    const migrateV1Config = await getMigrate();
    const result = await migrateV1Config();

    expect(result).toBe(false);
  });
});
