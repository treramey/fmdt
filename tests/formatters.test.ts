import { describe, expect, test } from 'vitest';
import { formatBranchName, truncate } from '../src/utils/formatters.js';

describe('formatBranchName', () => {
  test('should remove refs/heads/ prefix', () => {
    expect(formatBranchName('refs/heads/feature-123')).toBe('feature-123');
  });

  test('should return branch name as-is if no prefix', () => {
    expect(formatBranchName('feature-123')).toBe('feature-123');
  });

  test('should handle empty string', () => {
    expect(formatBranchName('')).toBe('');
  });
});

describe('truncate', () => {
  test('should truncate long text', () => {
    const text = 'This is a very long text that should be truncated';
    expect(truncate(text, 20)).toBe('This is a very lo...');
  });

  test('should not truncate short text', () => {
    const text = 'Short text';
    expect(truncate(text, 20)).toBe('Short text');
  });

  test('should handle exact length', () => {
    const text = '12345';
    expect(truncate(text, 5)).toBe('12345');
  });
});
