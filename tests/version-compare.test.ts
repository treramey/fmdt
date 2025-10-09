import { describe, expect, it } from 'vitest';
import { compareVersions, isNewerVersion } from '../src/utils/version-compare.js';

describe('compareVersions', () => {
  it('should return 0 when versions are equal', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.5.3', '2.5.3')).toBe(0);
  });

  it('should return 1 when v1 > v2', () => {
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.1.0', '1.0.9')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  });

  it('should return -1 when v1 < v2', () => {
    expect(compareVersions('1.9.9', '2.0.0')).toBe(-1);
    expect(compareVersions('1.0.9', '1.1.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
  });

  it('should handle different lengths', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.1', '1.0.9')).toBe(1);
  });

  it('should handle v prefix', () => {
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('v2.0.0', 'v1.0.0')).toBe(1);
  });
});

describe('isNewerVersion', () => {
  it('should return true when v1 > v2', () => {
    expect(isNewerVersion('2.0.0', '1.0.0')).toBe(true);
  });

  it('should return false when v1 <= v2', () => {
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
  });
});
