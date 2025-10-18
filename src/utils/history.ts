import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HISTORY_FILE = join(homedir(), '.fmdt_history');
const MAX_HISTORY = 50;

export async function loadHistory(): Promise<string[]> {
  try {
    const content = await fs.readFile(HISTORY_FILE, 'utf-8');
    const history = JSON.parse(content) as unknown;

    if (Array.isArray(history)) {
      return history.filter((item): item is string => typeof item === 'string');
    }

    return [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

export async function saveHistory(history: string[]): Promise<void> {
  try {
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

export function addToHistory(branch: string, currentHistory: string[]): string[] {
  const filtered = currentHistory.filter((item) => item !== branch);
  const updated = [branch, ...filtered];
  return updated.slice(0, MAX_HISTORY);
}
