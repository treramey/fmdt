import { describe, expect, it } from 'vitest';
import type { GitHubRepo } from '../../../src/providers/github/api.ts';
import { applyRepoFilter } from '../../../src/providers/github/repo-filter.ts';

function makeRepo(name: string, topics: string[] = []): GitHubRepo {
  return {
    id: Math.random(),
    name,
    full_name: `org/${name}`,
    default_branch: 'main',
    disabled: false,
    archived: false,
    topics,
    owner: { login: 'org' },
  };
}

const repos = [
  makeRepo('api', ['backend']),
  makeRepo('web', ['frontend']),
  makeRepo('docs'),
  makeRepo('api-v2', ['backend']),
];

describe('applyRepoFilter', () => {
  it('returns all repos for "all" filter', () => {
    expect(applyRepoFilter(repos, { type: 'all' })).toHaveLength(4);
  });

  it('filters by selected repo names', () => {
    const result = applyRepoFilter(repos, { type: 'selected', repos: ['api', 'docs'] });
    expect(result.map((r) => r.name)).toEqual(['api', 'docs']);
  });

  it('filters by regex pattern', () => {
    const result = applyRepoFilter(repos, { type: 'pattern', include: ['api.*'] });
    expect(result.map((r) => r.name)).toEqual(['api', 'api-v2']);
  });

  it('filters by topic', () => {
    const result = applyRepoFilter(repos, { type: 'topic', topics: ['backend'] });
    expect(result.map((r) => r.name)).toEqual(['api', 'api-v2']);
  });

  it('returns empty for no topic match', () => {
    const result = applyRepoFilter(repos, { type: 'topic', topics: ['mobile'] });
    expect(result).toHaveLength(0);
  });
});
