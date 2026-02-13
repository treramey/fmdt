import { describe, expect, it } from 'vitest';
import { formatBranchName, formatDateShort, truncate } from '../src/utils/formatters.ts';

describe('formatDateShort', () => {
  it('formats ISO date to short display', () => {
    const result = formatDateShort('2024-03-15T14:30:00Z');
    expect(result).toContain('Mar');
    expect(result).toContain('15');
  });

  it('handles edge case date strings', () => {
    // Reason: Use midday to avoid timezone boundary issues
    const result = formatDateShort('2024-01-15T12:00:00Z');
    expect(result).toContain('Jan');
  });
});

describe('formatBranchName', () => {
  it('strips refs/heads/ prefix', () => {
    expect(formatBranchName('refs/heads/feature/test')).toBe('feature/test');
  });

  it('returns plain branch names unchanged', () => {
    expect(formatBranchName('feature/test')).toBe('feature/test');
  });
});

describe('truncate', () => {
  it('returns short text unchanged', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });

  it('truncates long text with ellipsis', () => {
    expect(truncate('hello world test', 10)).toBe('hello w...');
  });

  it('handles exact length boundary', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});
