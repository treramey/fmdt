import { useEffect, useState } from 'react';
import type { UpdateInfo } from '../types/index.js';
import { performAutoUpdate } from '../utils/auto-updater.js';
import { getConfig } from '../utils/config.js';
import { checkForUpdates } from '../utils/update-checker.js';

/**
 * Options for the useAutoUpdate hook.
 */
type UseAutoUpdateOptions = {
  /** Current version of the application */
  version: string;
};

/**
 * Return value from the useAutoUpdate hook.
 */
type UseAutoUpdateReturn = {
  /** Information about available updates, if any */
  updateInfo: UpdateInfo | null;
  /** Whether auto-update is enabled */
  autoUpdateEnabled: boolean;
};

/**
 * Custom hook for handling application auto-updates.
 *
 * Checks for updates and performs automatic updates if enabled in config.
 * Respects environment variables NO_UPDATE_NOTIFIER and FMDT_DISABLE_AUTO_UPDATE.
 *
 * @param options - Configuration options for auto-update
 * @returns Update information and auto-update status
 * @example
 * const { updateInfo, autoUpdateEnabled } = useAutoUpdate({ version: '1.0.0' });
 */
export function useAutoUpdate({ version }: UseAutoUpdateOptions): UseAutoUpdateReturn {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(true);

  // Check if auto-update is enabled based on environment and config
  useEffect(() => {
    async function checkAutoUpdateEnabled(): Promise<void> {
      if (process.env.NO_UPDATE_NOTIFIER === '1' || process.env.FMDT_DISABLE_AUTO_UPDATE === '1') {
        setAutoUpdateEnabled(false);
        return;
      }

      const config = await getConfig().catch(() => null);
      setAutoUpdateEnabled(config?.autoUpdate !== false);
    }

    void checkAutoUpdateEnabled();
  }, []);

  // Handle update checking and execution
  useEffect(() => {
    async function handleUpdates(): Promise<void> {
      if (!autoUpdateEnabled) {
        return;
      }

      try {
        const updateCheck = await checkForUpdates(version);
        if (updateCheck) {
          setUpdateInfo(updateCheck);
        }

        const config = await getConfig().catch(() => null);

        if (config?.autoUpdate === false) {
          return;
        }

        const result = await performAutoUpdate(version);

        if (result.attempted && result.success) {
          console.log('Auto-update successful:', result.version);
        } else if (result.attempted && !result.success) {
          console.error('Auto-update failed:', result.error);
        }
      } catch (error) {
        console.error('Update error:', error);
      }
    }

    void handleUpdates();
  }, [version, autoUpdateEnabled]);

  return {
    updateInfo,
    autoUpdateEnabled,
  };
}
