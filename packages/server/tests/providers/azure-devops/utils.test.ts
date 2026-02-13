import { describe, expect, it } from 'vitest';
import { createAuthHeader, extractWorkItemIds } from '../../../src/providers/azure-devops/utils.ts';

describe('createAuthHeader', () => {
  it('creates basic auth header from PAT', () => {
    const header = createAuthHeader('mytoken123');
    const decoded = Buffer.from(header.replace('Basic ', ''), 'base64').toString();
    expect(decoded).toBe(':mytoken123');
    expect(header).toMatch(/^Basic /);
  });
});

describe('extractWorkItemIds', () => {
  it('extracts JIRA-style work item ID from branch name', () => {
    expect(extractWorkItemIds('PROJ-1234-fix-login')).toEqual(['PROJ-1234']);
  });

  it('extracts ID from branch with only ID', () => {
    expect(extractWorkItemIds('ABC-99')).toEqual(['ABC-99']);
  });

  it('returns empty array when no work item ID present', () => {
    expect(extractWorkItemIds('feature/add-logging')).toEqual([]);
  });

  it('returns empty array for lowercase branch names', () => {
    // Reason: regex requires uppercase prefix
    expect(extractWorkItemIds('proj-123-fix')).toEqual([]);
  });

  it('extracts only the first match', () => {
    expect(extractWorkItemIds('LAAIR-1548-fix')).toEqual(['LAAIR-1548']);
  });
});
