/**
 * Compares two semantic version strings.
 *
 * Handles versions with or without 'v' prefix (e.g., "v1.2.3" or "1.2.3").
 * Treats missing version parts as 0 (e.g., "1.2" is treated as "1.2.0").
 *
 * @param v1 - First version string (e.g., "1.2.3" or "v1.2.3")
 * @param v2 - Second version string (e.g., "1.3.0" or "v1.3.0")
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 * @example
 * compareVersions("1.2.3", "1.3.0"); // Returns -1
 * compareVersions("2.0.0", "1.9.9"); // Returns 1
 * compareVersions("v1.0.0", "1.0.0"); // Returns 0
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
 * Checks if the first version is newer than the second version.
 *
 * Convenience wrapper around compareVersions for determining if an update is available.
 *
 * @param v1 - First version string to compare
 * @param v2 - Second version string to compare against
 * @returns true if v1 is newer than v2, false otherwise
 * @example
 * isNewerVersion("1.2.3", "1.2.0"); // Returns true
 * isNewerVersion("1.0.0", "1.0.0"); // Returns false
 * isNewerVersion("0.9.0", "1.0.0"); // Returns false
 */
export function isNewerVersion(v1: string, v2: string): boolean {
  return compareVersions(v1, v2) > 0;
}
