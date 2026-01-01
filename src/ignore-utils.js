import { existsSync, readFileSync } from 'node:fs';
import { minimatch } from 'minimatch';
import path from 'node:path';

/**
 * Load ignore patterns from a file
 * @param {string} ignoreFilePath - Path to the ignore file
 * @returns {string[]} Array of ignore patterns
 */
export function loadIgnorePatterns(ignoreFilePath) {
  if (!existsSync(ignoreFilePath)) {
    // Return empty array if file doesn't exist
    return [];
  }

  try {
    const content = readFileSync(ignoreFilePath, 'utf-8');
    const patterns = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    return patterns;
  } catch (error) {
    console.warn(`⚠️ Warning: Could not read ignore file ${ignoreFilePath}: ${error.message}`);
    return [];
  }
}

/**
 * Check if a file path should be ignored based on patterns
 * @param {string} filePath - The file path to check
 * @param {string} rootDir - The root directory for relative pattern matching
 * @param {string[] | undefined} customPatterns - Optional custom patterns to use
 * @param {boolean} enabled - Whether ignore functionality is enabled
 * @returns {boolean} True if the file should be ignored, false otherwise
 */
export function shouldIgnoreFile(filePath, rootDir, customPatterns = undefined, enabled = true) {
  if (!enabled) {
    return false;
  }

  const patterns = customPatterns ?? [];

  if (patterns.length === 0) {
    return false;
  }

  // Convert file path to relative path for pattern matching
  const relativePath = path.relative(rootDir, filePath);

  // Check if any pattern matches
  for (const pattern of patterns) {
    try {
      if (minimatch(relativePath, pattern, { dot: true })) {
        return true;
      }
    } catch (error) {
      console.warn(`⚠️ Warning: Error matching pattern '${pattern}': ${error.message}`);
    }
  }

  return false;
}

/**
 * Filter an array of file paths based on ignore patterns
 * @param {string[]} filePaths - Array of file paths to filter
 * @param {string} rootDir - The root directory for relative pattern matching
 * @param {string[] | undefined} customPatterns - Optional custom patterns to use
 * @param {boolean} enabled - Whether ignore functionality is enabled
 * @returns {string[]} Filtered array of file paths that should not be ignored
 */
export function filterIgnoredFiles(filePaths, rootDir, customPatterns = undefined, enabled = true) {
  if (!enabled) {
    return filePaths;
  }

  return filePaths.filter((filePath) => !shouldIgnoreFile(filePath, rootDir, customPatterns, enabled));
}

/**
 * Load ignore patterns and resolve to absolute paths if needed
 * @param {string} ignoreFilePath - Path to the ignore config file
 * @param {string} cwd - Current working directory for relative resolution
 * @returns {string[]} Array of patterns
 */
export function loadIgnoreConfig(ignoreFilePath, cwd = process.cwd()) {
  if (!existsSync(ignoreFilePath)) {
    console.warn(`⚠️ Warning: Ignore config file not found: ${ignoreFilePath}`);
    return [];
  }

  const patterns = loadIgnorePatterns(ignoreFilePath);
  console.log(`🔍 Loaded ${patterns.length} ignore patterns from ${ignoreFilePath}`);
  return patterns;
}
