import { useEffect } from 'react';
import { isCacheStale, loadBranchCache, refreshBranchCache } from '../utils/branch-cache.js';

/**
 * Custom hook for managing branch cache refresh.
 *
 * Checks if the branch cache is stale (older than 24 hours) and refreshes it
 * in the background if needed. This improves performance by caching branch data
 * from Azure DevOps repositories.
 *
 * @example
 * useBranchCache(); // Automatically refreshes cache if stale
 */
export function useBranchCache(): void {
  useEffect(() => {
    async function checkAndRefreshCache(): Promise<void> {
      try {
        const cache = loadBranchCache();
        const stale = !cache || isCacheStale(cache, 24 * 60 * 60 * 1000);

        if (stale) {
          // Background refresh - don't await
          void refreshBranchCache();
        }
      } catch (error) {
        console.error('Branch cache error:', error);
      }
    }

    void checkAndRefreshCache();
  }, []);
}
