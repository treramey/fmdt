/**
 * Compare two semver version strings
 * @param v1 - First version (e.g., "1.2.3")
 * @param v2 - Second version (e.g., "1.3.0")
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix if present (v1.0.0 -> 1.0.0)
  const clean1 = v1.replace(/^v/, '');
  const clean2 = v2.replace(/^v/, '');

  // Split and convert to numbers
  const parts1 = clean1.split('.').map(Number);
  const parts2 = clean2.split('.').map(Number);

  // Compare each part (major, minor, patch)
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0; // Handle missing parts as 0
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0; // Versions are equal
}

/**
 * Check if v1 is greater than v2
 * @param v1 - First version
 * @param v2 - Second version
 * @returns true if v1 > v2
 */
export function isNewerVersion(v1: string, v2: string): boolean {
  return compareVersions(v1, v2) > 0;
}
