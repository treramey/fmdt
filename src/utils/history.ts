import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HISTORY_FILE = join(homedir(), '.fmdt_history');
const MAX_HISTORY = 50;

export async function loadHistory(): Promise<string[]> {
  try {
    const content = await fs.readFile(HISTORY_FILE, 'utf-8');
    const history = JSON.parse(content) as unknown;

    // Validate it's an array
    if (Array.isArray(history)) {
      return history.filter((item): item is string => typeof item === 'string');
    }

    return [];
  } catch (error) {
    // File doesn't exist or parse error, return empty
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    console.error('Error loading history:', error);
    return [];
  }
}

export async function saveHistory(history: string[]): Promise<void> {
  try {
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving history:', error);
    // Don't throw - failing to save history shouldn't break the app
  }
}

export function addToHistory(branch: string, currentHistory: string[]): string[] {
  // Remove the branch if it already exists
  const filtered = currentHistory.filter((item) => item !== branch);

  // Add to beginning (newest)
  const updated = [branch, ...filtered];

  // Limit to MAX_HISTORY items
  return updated.slice(0, MAX_HISTORY);
}
