import type { AutoUpdateResult, PackageManager } from '../types/index.js';
import { fetchLatestVersion } from './update-checker.js';
import { isNewerVersion } from './version-compare.js';

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
 * Execute the upgrade command for the given package manager
 *
 * Pattern: Based on opencode's upgrade execution
 * Critical: Must catch ALL errors - don't throw
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
 * Main auto-update function
 * Call this from App.tsx in a background useEffect
 *
 * Pattern: Combines detection + execution with graceful error handling
 * Critical: Must NEVER throw errors - always catch and return result
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
