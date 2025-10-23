import Conf from 'conf';
import type { BranchCache, RepositoryBranches } from '../types/index.js';
import { BranchCacheSchema } from '../types/index.js';

const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const store = new Conf<{ branchCache: BranchCache | null }>({
  projectName: 'fmdt',
  defaults: { branchCache: null },
});

export function loadBranchCache(): BranchCache | null {
  const cached = store.get('branchCache');

  if (!cached) {
    return null;
  }

  try {
    return BranchCacheSchema.parse(cached);
  } catch {
    return null;
  }
}

export function saveBranchCache(cache: BranchCache): void {
  store.set('branchCache', cache);
}

export function isCacheStale(cache: BranchCache, ttl: number = DEFAULT_CACHE_TTL): boolean {
  const now = Date.now();
  return now - cache.lastUpdated > ttl;
}

export function getUniqueBranches(repos: RepositoryBranches[]): string[] {
  const allBranches = new Set<string>();
  for (const repo of repos) {
    for (const branch of repo.branches) {
      allBranches.add(branch);
    }
  }
  return Array.from(allBranches).sort();
}
