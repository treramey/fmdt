import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { UpdateCache, UpdateInfo } from '../types/index.js';
import { getConfigDir } from './config.js';
import { isNewerVersion } from './version-compare.js';

const UPDATE_CACHE_FILE = 'update-cache.json';
const DEFAULT_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const NPM_REGISTRY_URL = 'https://registry.npmjs.org/fmdt/latest';

/**
 * Get the path to the update cache file
 */
function getUpdateCachePath(): string {
  return join(getConfigDir(), UPDATE_CACHE_FILE);
}

/**
 * Load the update cache from disk
 */
async function loadUpdateCache(): Promise<UpdateCache | null> {
  try {
    const cachePath = getUpdateCachePath();
    const content = await readFile(cachePath, 'utf-8');
    const parsed = JSON.parse(content) as UpdateCache;
    return parsed;
  } catch {
    // Return null on error, don't throw (like config.ts pattern)
    return null;
  }
}

/**
 * Save the update cache to disk
 */
async function saveUpdateCache(cache: UpdateCache): Promise<void> {
  try {
    const configDir = getConfigDir();
    const cachePath = getUpdateCachePath();

    // Create directory if needed (like config.ts pattern)
    await mkdir(configDir, { recursive: true });

    await writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
  } catch {
    // Don't let cache save failures break the app
    // Silently fail - update check will run again next time
  }
}

/**
 * Fetch the latest version from npm registry
 * Exported for use by auto-updater
 */
export async function fetchLatestVersion(): Promise<string | null> {
  try {
    // Set a reasonable timeout (5 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(NPM_REGISTRY_URL, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { version: string };
    return data.version;
  } catch {
    // Network errors, timeouts, or parse errors
    // Return null to fail gracefully
    return null;
  }
}

/**
 * Check for available updates
 * @param currentVersion - Current version of the CLI
 * @param checkInterval - Time in ms before checking again (default: 24h)
 * @returns UpdateInfo if newer version available, null otherwise
 */
export async function checkForUpdates(
  currentVersion: string,
  checkInterval: number = DEFAULT_CHECK_INTERVAL,
): Promise<UpdateInfo | null> {
  try {
    // Respect NO_UPDATE_NOTIFIER environment variable
    if (process.env.NO_UPDATE_NOTIFIER === '1') {
      return null;
    }

    // Load cache and check if we need to fetch
    const cache = await loadUpdateCache();
    const now = Date.now();

    if (cache && now - cache.lastCheck < checkInterval) {
      // Use cached version if check interval hasn't passed
      if (isNewerVersion(cache.latestVersion, currentVersion)) {
        return {
          currentVersion,
          latestVersion: cache.latestVersion,
        };
      }
      return null;
    }

    // Fetch latest version from npm registry
    const latestVersion = await fetchLatestVersion();

    if (!latestVersion) {
      return null;
    }

    // Save to cache for next time
    await saveUpdateCache({
      lastCheck: now,
      latestVersion,
    });

    // Compare versions and return update info
    if (isNewerVersion(latestVersion, currentVersion)) {
      return {
        currentVersion,
        latestVersion,
      };
    }

    return null;
  } catch {
    // Don't let update check break the app
    return null;
  }
}
