import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import xdg from '@folder/xdg';

const DATA_DIR_NAME = 'fmdt';
const HISTORY_FILE_NAME = 'history.json';
const MAX_ENTRIES = 100;

function getDataDir(): string {
  const paths = xdg();
  return join(paths.data, DATA_DIR_NAME);
}

function getHistoryFilePath(): string {
  return join(getDataDir(), HISTORY_FILE_NAME);
}

/** Load search history entries (most recent first). */
export async function loadHistory(): Promise<string[]> {
  try {
    const raw = await readFile(getHistoryFilePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

/** Add an entry to history. Deduplicates and caps at MAX_ENTRIES. */
export async function addHistoryEntry(entry: string): Promise<string[]> {
  const trimmed = entry.trim();
  if (trimmed.length === 0) return loadHistory();

  const existing = await loadHistory();
  // Reason: Remove duplicates then prepend new entry
  const filtered = existing.filter((e) => e !== trimmed);
  const updated = [trimmed, ...filtered].slice(0, MAX_ENTRIES);

  const dir = getDataDir();
  await mkdir(dir, { recursive: true });
  await writeFile(getHistoryFilePath(), JSON.stringify(updated, null, 2), 'utf-8');

  return updated;
}
