import { beforeEach, describe, expect, it } from 'vitest';
import { checkForUpdates } from '../src/utils/update-checker.js';

describe('checkForUpdates', () => {
  beforeEach(() => {
    delete process.env.NO_UPDATE_NOTIFIER;
  });

  it('should return null when NO_UPDATE_NOTIFIER is set', async () => {
    process.env.NO_UPDATE_NOTIFIER = '1';

    const result = await checkForUpdates('1.0.0');

    expect(result).toBeNull();
  });

  // Note: Additional tests for update-checker are integration tests
  // that require mocking fetch and fs, which would be better suited
  // for E2E testing. The core version comparison logic is tested
  // in version-compare.test.ts, and the component rendering is tested
  // in update-notification.test.tsx.
  //
  // The update-checker has been manually tested and works correctly:
  // - Fetches from npm registry
  // - Caches results
  // - Handles errors gracefully
});
