import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testDir = join(tmpdir(), `fmdt-history-route-test-${Date.now()}`);
vi.mock('@folder/xdg', () => ({
  default: () => ({ data: testDir }),
}));

const { HistoryRoutes } = await import('../../src/routes/history.ts');

describe('history routes', () => {
  let app: Hono;

  beforeEach(async () => {
    await mkdir(join(testDir, 'fmdt'), { recursive: true });
    app = new Hono().route('/history', HistoryRoutes());
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('GET /history', () => {
    it('returns empty array when no history', async () => {
      const res = await app.request('/history');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });

    it('returns existing entries', async () => {
      await writeFile(join(testDir, 'fmdt', 'history.json'), JSON.stringify(['a', 'b']), 'utf-8');
      const res = await app.request('/history');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(['a', 'b']);
    });
  });

  describe('POST /history', () => {
    it('adds entry and returns updated list', async () => {
      const res = await app.request('/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: 'feature/new' }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(['feature/new']);
    });

    it('returns 400 for empty entry', async () => {
      const res = await app.request('/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: '' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing entry field', async () => {
      const res = await app.request('/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });
});
