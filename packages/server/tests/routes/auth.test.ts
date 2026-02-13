import type { AuthInfo, AuthStore } from '@fmdt/core';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/server.ts';

function createMockAuthStore(): AuthStore & { _store: Map<string, AuthInfo> } {
  const _store = new Map<string, AuthInfo>();
  return {
    _store,
    async get(id) {
      return _store.get(id) ?? null;
    },
    async set(id, info) {
      _store.set(id, info);
    },
    async remove(id) {
      _store.delete(id);
    },
  };
}

describe('auth routes', () => {
  it('PUT /auth/:providerId stores credentials', async () => {
    const store = createMockAuthStore();
    const app = createApp({ authStore: store })();

    const res = await app.request('/auth/azure-devops', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pat', token: 'my-token' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(store._store.get('azure-devops')).toEqual({ type: 'pat', token: 'my-token' });
  });

  it('DELETE /auth/:providerId removes credentials', async () => {
    const store = createMockAuthStore();
    store._store.set('github', { type: 'pat', token: 'gh-token' });
    const app = createApp({ authStore: store })();

    const res = await app.request('/auth/github', { method: 'DELETE' });

    expect(res.status).toBe(200);
    expect(store._store.has('github')).toBe(false);
  });

  it('GET /auth/status returns provider configuration state', async () => {
    const store = createMockAuthStore();
    store._store.set('azure-devops', { type: 'pat', token: 'x' });
    const app = createApp({ authStore: store })();

    const res = await app.request('/auth/status');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.providers['azure-devops'].configured).toBe(true);
    expect(body.providers.github.configured).toBe(false);
  });

  it('PUT /auth/:providerId rejects invalid provider', async () => {
    const store = createMockAuthStore();
    const app = createApp({ authStore: store })();

    const res = await app.request('/auth/gitlab', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pat', token: 'x' }),
    });

    expect(res.status).toBe(400);
  });
});
