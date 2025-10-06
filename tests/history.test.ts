import { describe, expect, test } from 'vitest';
import { addToHistory } from '../src/utils/history.js';

describe('addToHistory', () => {
  test('should add new item to beginning', () => {
    const history = ['LAAIR-456'];
    const updated = addToHistory('LAAIR-123', history);
    expect(updated).toEqual(['LAAIR-123', 'LAAIR-456']);
  });

  test('should move duplicate to beginning', () => {
    const history = ['LAAIR-123', 'LAAIR-456', 'LAAIR-789'];
    const updated = addToHistory('LAAIR-456', history);
    expect(updated).toEqual(['LAAIR-456', 'LAAIR-123', 'LAAIR-789']);
  });

  test('should limit history to 50 items', () => {
    const history = Array.from({ length: 50 }, (_, i) => `branch-${i}`);
    const updated = addToHistory('new-branch', history);
    expect(updated).toHaveLength(50);
    expect(updated[0]).toBe('new-branch');
    expect(updated[49]).toBe('branch-48'); // Oldest item dropped (branch-49 was removed)
  });

  test('should handle empty history', () => {
    const updated = addToHistory('LAAIR-123', []);
    expect(updated).toEqual(['LAAIR-123']);
  });
});
