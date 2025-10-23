import Conf from 'conf';

const store = new Conf<{ history: string[] }>({
  projectName: 'fmdt',
  defaults: { history: [] },
});

const MAX_HISTORY = 50;

export async function loadHistory(): Promise<string[]> {
  // conf handles errors internally, returns default if key doesn't exist
  return store.get('history');
}

export async function saveHistory(history: string[]): Promise<void> {
  // No error handling needed - conf handles it
  store.set('history', history);
}

export function addToHistory(branch: string, currentHistory: string[]): string[] {
  const filtered = currentHistory.filter((item) => item !== branch);
  const updated = [branch, ...filtered];
  return updated.slice(0, MAX_HISTORY);
}
