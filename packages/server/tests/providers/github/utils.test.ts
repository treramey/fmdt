import { describe, expect, it } from 'vitest';
import { createAuthHeader, extractWorkItemIds, parseLinkHeader } from '../../../src/providers/github/utils.ts';

describe('createAuthHeader', () => {
  it('creates Bearer header', () => {
    expect(createAuthHeader('ghp_test123')).toBe('Bearer ghp_test123');
  });
});

describe('extractWorkItemIds', () => {
  it('extracts Jira-style IDs from branch names', () => {
    expect(extractWorkItemIds('LAAIR-1548-fix-auth')).toEqual(['LAAIR-1548']);
  });

  it('returns empty array for non-matching branches', () => {
    expect(extractWorkItemIds('feature/add-logging')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(extractWorkItemIds('')).toEqual([]);
  });
});

describe('parseLinkHeader', () => {
  it('extracts next URL from Link header', () => {
    const header =
      '<https://api.github.com/repos?page=2>; rel="next", <https://api.github.com/repos?page=5>; rel="last"';
    expect(parseLinkHeader(header)).toBe('https://api.github.com/repos?page=2');
  });

  it('returns null when no next link', () => {
    const header = '<https://api.github.com/repos?page=5>; rel="last"';
    expect(parseLinkHeader(header)).toBeNull();
  });

  it('returns null for null header', () => {
    expect(parseLinkHeader(null)).toBeNull();
  });
});
