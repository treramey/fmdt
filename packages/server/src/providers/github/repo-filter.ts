import type { RepoFilter } from '@fmdt/core';
import type { GitHubRepo } from './api.ts';

/** Apply a RepoFilter to a list of GitHub repos. */
export function applyRepoFilter(repos: GitHubRepo[], filter: RepoFilter): GitHubRepo[] {
  switch (filter.type) {
    case 'all':
      return repos;

    case 'selected':
      return repos.filter((r) => filter.repos.includes(r.name));

    case 'pattern': {
      const patterns = filter.include.map((p) => new RegExp(p));
      return repos.filter((r) => patterns.some((re) => re.test(r.name)));
    }

    case 'topic':
      return repos.filter((r) => r.topics.some((t) => filter.topics.includes(t)));
  }
}
