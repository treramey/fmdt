import type { AppConfig, AuthStore } from '@fmdt/core';
import { DEFAULT_SERVER_BRANCHES } from '@fmdt/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/server.ts';

const noopAuthStore: AuthStore = {
  async get() {
    return null;
  },
  async set() {},
  async remove() {},
};

// Mock the config module
let mockConfig: AppConfig | null = null;

vi.mock('../../src/config/index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/config/index.ts')>();
  return {
    ...original,
    loadConfig: async () => mockConfig,
    saveConfig: async (config: AppConfig) => {
      mockConfig = config;
    },
  };
});

afterEach(() => {
  mockConfig = null;
});

function makeApp() {
  return createApp({ authStore: noopAuthStore })();
}

const sampleConfig: AppConfig = {
  version: '2.0.0',
  autoUpdate: true,
  activeProject: 'proj-1',
  projects: {
    'proj-1': {
      id: 'proj-1',
      name: 'Test Project',
      ref: { provider: 'azure-devops', org: 'myorg', project: 'myproject' },
      serverBranches: DEFAULT_SERVER_BRANCHES,
      createdAt: '2026-01-01T00:00:00Z',
    },
  },
};

describe('config routes', () => {
  it('GET /config returns default when no config exists', async () => {
    const app = makeApp();
    const res = await app.request('/config');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe('2.0.0');
    expect(body.projects).toEqual({});
  });

  it('GET /config returns existing config', async () => {
    mockConfig = sampleConfig;
    const app = makeApp();

    const res = await app.request('/config');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.activeProject).toBe('proj-1');
  });

  it('PUT /config saves and returns config', async () => {
    const app = makeApp();

    const res = await app.request('/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleConfig),
    });

    expect(res.status).toBe(200);
    expect(mockConfig).toEqual(sampleConfig);
  });

  it('GET /config/projects returns project list', async () => {
    mockConfig = sampleConfig;
    const app = makeApp();

    const res = await app.request('/config/projects');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Test Project');
  });

  it('GET /config/server-branches returns 404 when no active project', async () => {
    const app = makeApp();

    const res = await app.request('/config/server-branches');
    expect(res.status).toBe(404);
  });

  it('GET /config/server-branches returns branches for active project', async () => {
    mockConfig = sampleConfig;
    const app = makeApp();

    const res = await app.request('/config/server-branches');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(4);
    expect(body[0].name).toBe('Dev');
  });

  it('PUT /config/server-branches updates branches', async () => {
    mockConfig = structuredClone(sampleConfig);
    const app = makeApp();

    const newBranches = [{ name: 'Main', branch: 'main', order: 0 }];
    const res = await app.request('/config/server-branches', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBranches),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(newBranches);
    expect(mockConfig?.projects['proj-1']?.serverBranches).toEqual(newBranches);
  });

  it('PUT /config/server-branches returns 404 when no active project', async () => {
    const app = makeApp();

    const res = await app.request('/config/server-branches', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ name: 'Dev', branch: 'dev', order: 0 }]),
    });

    expect(res.status).toBe(404);
  });
});
