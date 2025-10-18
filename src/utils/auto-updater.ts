import type { AutoUpdateResult, PackageManager } from '../types/index.js';
import { fetchLatestVersion } from './update-checker.js';
import { isNewerVersion } from './version-compare.js';

/**
 * Detects which package manager was used to install fmdt globally.
 *
 * Tries to detect the package manager by:
 * 1. Checking process.execPath to prioritize the runtime (bun vs node)
 * 2. Running package manager list commands to see which has fmdt installed
 * 3. Returns 'unknown' if detection fails
 *
 * @returns The detected package manager or 'unknown' if detection fails
 * @example
 * const pm = await detectPackageManager();
 * if (pm !== 'unknown') {
 *   console.log(`Detected ${pm}`);
 * }
 */
export async function detectPackageManager(): Promise<PackageManager> {
  try {
    const execPath = process.execPath.toLowerCase();

    const checks = [
      {
        name: 'npm' as const,
        command: ['npm', 'list', '-g', '--depth=0'],
      },
      {
        name: 'bun' as const,
        command: ['bun', 'pm', 'ls', '-g'],
      },
      {
        name: 'pnpm' as const,
        command: ['pnpm', 'list', '-g', '--depth=0'],
      },
      {
        name: 'yarn' as const,
        command: ['yarn', 'global', 'list'],
      },
    ];

    // Sort checks: prioritize the one matching process.execPath
    checks.sort((a, b) => {
      const aMatches = execPath.includes(a.name);
      const bMatches = execPath.includes(b.name);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });

    for (const check of checks) {
      try {
        const proc = Bun.spawn({
          cmd: check.command,
          stdout: 'pipe',
          stderr: 'pipe',
        });

        const output = await new Response(proc.stdout).text();
        await proc.exited;

        if (output.includes('fmdt')) {
          return check.name;
        }
      } catch {}
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Executes the upgrade command for the given package manager.
 *
 * Runs the appropriate global install command based on the detected package manager.
 * Handles npm, bun, pnpm, and yarn with their respective syntaxes.
 *
 * @param method - The package manager to use for the upgrade
 * @param targetVersion - The version to upgrade to (e.g., "1.2.3")
 * @returns Object indicating success/failure and optional error message
 * @example
 * const result = await executeUpgrade('npm', '1.2.3');
 * if (result.success) {
 *   console.log('Upgrade successful');
 * } else {
 *   console.error('Upgrade failed:', result.error);
 * }
 */
export async function executeUpgrade(
  method: PackageManager,
  targetVersion: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (method === 'unknown') {
      return { success: false, error: 'Unknown installation method' };
    }

    // Determine the command based on package manager
    const command = (() => {
      switch (method) {
        case 'npm':
          return ['npm', 'install', '-g', `fmdt@${targetVersion}`];
        case 'bun':
          return ['bun', 'install', '-g', `fmdt@${targetVersion}`];
        case 'pnpm':
          return ['pnpm', 'install', '-g', `fmdt@${targetVersion}`];
        case 'yarn':
          return ['yarn', 'global', 'add', `fmdt@${targetVersion}`];
        default:
          return null;
      }
    })();

    if (!command) {
      return { success: false, error: `Unsupported package manager: ${method}` };
    }

    // Execute the upgrade command
    const proc = Bun.spawn({
      cmd: command,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return { success: false, error: stderr || 'Upgrade command failed' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Performs automatic self-update of the fmdt package.
 *
 * This is the main auto-update orchestrator that:
 * 1. Checks environment variables for opt-out (NO_UPDATE_NOTIFIER, FMDT_DISABLE_AUTO_UPDATE)
 * 2. Fetches the latest version from npm registry
 * 3. Compares versions to determine if update is needed
 * 4. Detects the package manager used for installation
 * 5. Executes the upgrade command if appropriate
 *
 * This function is designed to run in the background without blocking app startup.
 * It never throws errors and always returns a result object.
 *
 * @param currentVersion - The currently installed version (e.g., "1.0.0")
 * @returns Result object with attempt status, success flag, method used, and any errors
 * @example
 * const result = await performAutoUpdate('1.0.0');
 * if (result.attempted && result.success) {
 *   console.log(`Updated to ${result.version} using ${result.method}`);
 * }
 */
export async function performAutoUpdate(currentVersion: string): Promise<AutoUpdateResult> {
  try {
    // Check environment variables for opt-out
    if (process.env.NO_UPDATE_NOTIFIER || process.env.FMDT_DISABLE_AUTO_UPDATE) {
      return { attempted: false, success: false };
    }

    const latestVersion = await fetchLatestVersion();

    if (!latestVersion) {
      return { attempted: false, success: false, error: 'Failed to fetch latest version' };
    }

    if (!isNewerVersion(latestVersion, currentVersion)) {
      return { attempted: false, success: false };
    }

    const method = await detectPackageManager();
    if (method === 'unknown') {
      return { attempted: false, success: false, method, error: 'Unknown installation method' };
    }

    const result = await executeUpgrade(method, latestVersion);

    return {
      attempted: true,
      success: result.success,
      method,
      version: latestVersion,
      ...(result.error ? { error: result.error } : {}),
    };
  } catch (error) {
    return {
      attempted: false,
      success: false,
      error: String(error),
    };
  }
}
