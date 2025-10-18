import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { UpdateCache, UpdateInfo } from '../types/index.js';
import { getConfigDir } from './config.js';
import { isNewerVersion } from './version-compare.js';

const UPDATE_CACHE_FILE = 'update-cache.json';
const DEFAULT_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const NPM_REGISTRY_URL = 'https://registry.npmjs.org/fmdt/latest';

/**
 * Gets the absolute path to the update cache file.
 *
 * @returns The full path to update-cache.json in the config directory
 */
function getUpdateCachePath(): string {
  return join(getConfigDir(), UPDATE_CACHE_FILE);
}

/**
 * Loads the update cache from disk.
 *
 * @returns The cached update information or null if not found/invalid
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
 * Saves the update cache to disk.
 *
 * Creates the config directory if it doesn't exist. Silently fails on errors
 * to prevent cache issues from breaking the application.
 *
 * @param cache - The update cache data to save
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
 * Fetches the latest version of fmdt from the npm registry.
 *
 * Makes a request to the npm registry with a 5-second timeout.
 * Returns null on network errors, timeouts, or parse failures to fail gracefully.
 *
 * @returns The latest version string (e.g., "1.2.3") or null if fetch fails
 * @example
 * const latest = await fetchLatestVersion();
 * if (latest) {
 *   console.log(`Latest version: ${latest}`);
 * }
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
 * Checks for available updates to fmdt.
 *
 * Uses a disk cache to avoid excessive registry requests. Only checks for updates
 * if the cache is older than the specified interval (default: 24 hours).
 * Respects NO_UPDATE_NOTIFIER=1 environment variable to disable checks.
 *
 * @param currentVersion - The currently installed version (e.g., "1.0.0")
 * @param checkInterval - Milliseconds before checking again (default: 24 hours)
 * @returns UpdateInfo object if newer version is available, null otherwise
 * @example
 * const updateInfo = await checkForUpdates('1.0.0');
 * if (updateInfo) {
 *   console.log(`Update available: ${updateInfo.latestVersion}`);
 * }
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
