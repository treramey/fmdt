import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Reason: Mock @folder/xdg to redirect data dir to a temp directory
const testDir = join(tmpdir(), `fmdt-history-test-${Date.now()}`);
vi.mock('@folder/xdg', () => ({
  default: () => ({ data: testDir }),
}));

const { addHistoryEntry, loadHistory } = await import('../../src/history/store.ts');

describe('history store', () => {
  beforeEach(async () => {
    await mkdir(join(testDir, 'fmdt'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('loadHistory', () => {
    it('returns empty array when no history file exists', async () => {
      const result = await loadHistory();
      expect(result).toEqual([]);
    });

    it('returns entries from existing file', async () => {
      const entries = ['feature/foo', 'fix/bar'];
      await writeFile(join(testDir, 'fmdt', 'history.json'), JSON.stringify(entries), 'utf-8');
      const result = await loadHistory();
      expect(result).toEqual(entries);
    });

    it('filters out non-string entries', async () => {
      await writeFile(
        join(testDir, 'fmdt', 'history.json'),
        JSON.stringify(['valid', 42, null, 'also-valid']),
        'utf-8',
      );
      const result = await loadHistory();
      expect(result).toEqual(['valid', 'also-valid']);
    });
  });

  describe('addHistoryEntry', () => {
    it('prepends new entry and returns updated list', async () => {
      const first = await addHistoryEntry('feature/one');
      expect(first).toEqual(['feature/one']);

      const second = await addHistoryEntry('feature/two');
      expect(second).toEqual(['feature/two', 'feature/one']);
    });

    it('deduplicates — moves existing entry to front', async () => {
      await addHistoryEntry('a');
      await addHistoryEntry('b');
      const result = await addHistoryEntry('a');
      expect(result).toEqual(['a', 'b']);
    });

    it('ignores whitespace-only input', async () => {
      await addHistoryEntry('real');
      const result = await addHistoryEntry('   ');
      expect(result).toEqual(['real']);
    });

    it('caps at 100 entries', async () => {
      // Seed 100 entries
      const seed = Array.from({ length: 100 }, (_, i) => `branch-${i}`);
      await writeFile(join(testDir, 'fmdt', 'history.json'), JSON.stringify(seed), 'utf-8');

      const result = await addHistoryEntry('new-branch');
      expect(result).toHaveLength(100);
      expect(result[0]).toBe('new-branch');
      expect(result[99]).toBe('branch-98');
    });

    it('persists to disk', async () => {
      await addHistoryEntry('persisted');
      const raw = await readFile(join(testDir, 'fmdt', 'history.json'), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed).toEqual(['persisted']);
    });
  });
});
