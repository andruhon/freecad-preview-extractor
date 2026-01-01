import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadIgnorePatterns,
  shouldIgnoreFile,
  filterIgnoredFiles,
  loadIgnoreConfig
} from '../src/ignore-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test helper to create temp directory
function createTempDir() {
  const tempDir = path.join(__dirname, 'test-temp-' + Date.now());
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true });
  }
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

// Test helper to cleanup
function cleanupTempDir(tempDir) {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true });
  }
}

describe('Ignore Utils Tests', () => {
  test('loadIgnorePatterns - loads patterns from file', () => {
    const tempDir = createTempDir();
    const ignoreFile = path.join(tempDir, '.testignore');
    
    try {
      const content = `# Comment line
archived/*.FCStd
test-model.FCStd
*backup*.FCStd

# Another comment
`;
      writeFileSync(ignoreFile, content);
      
      const patterns = loadIgnorePatterns(ignoreFile);
      
      assert.equal(patterns.length, 3, 'Should load 3 patterns (excluding comments and empty lines)');
      assert.equal(patterns[0], 'archived/*.FCStd', 'First pattern should be archived/*.FCStd');
      assert.equal(patterns[1], 'test-model.FCStd', 'Second pattern should be test-model.FCStd');
      assert.equal(patterns[2], '*backup*.FCStd', 'Third pattern should be *backup*.FCStd');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test('loadIgnorePatterns - returns empty array for non-existent file', () => {
    const patterns = loadIgnorePatterns('/non/existent/file.txt');
    assert.equal(patterns.length, 0, 'Should return empty array for non-existent file');
  });

  test('shouldIgnoreFile - correctly identifies ignored files', () => {
    const tempDir = createTempDir();
    const rootDir = tempDir;
    
    try {
      const patterns = [
        'archived/*.FCStd',
        'test-model.FCStd',
        '**/*backup*.FCStd'
      ];
      
      // These should be ignored
      assert.equal(shouldIgnoreFile(path.join(rootDir, 'archived/file.FCStd'), rootDir, patterns, true), true);
      assert.equal(shouldIgnoreFile(path.join(rootDir, 'test-model.FCStd'), rootDir, patterns, true), true);
      assert.equal(shouldIgnoreFile(path.join(rootDir, 'subdir/file-backup.FCStd'), rootDir, patterns, true), true);
      
      // These should NOT be ignored
      assert.equal(shouldIgnoreFile(path.join(rootDir, 'file.FCStd'), rootDir, patterns, true), false);
      assert.equal(shouldIgnoreFile(path.join(rootDir, 'archived/subdir/file.FCStd'), rootDir, patterns, true), false);
      assert.equal(shouldIgnoreFile(path.join(rootDir, 'my-test-model.FCStd'), rootDir, patterns, true), false);
      
      // When disabled, nothing should be ignored
      assert.equal(shouldIgnoreFile(path.join(rootDir, 'archived/file.FCStd'), rootDir, patterns, false), false);
      
      // When no patterns, nothing should be ignored
      assert.equal(shouldIgnoreFile(path.join(rootDir, 'archived/file.FCStd'), rootDir, [], true), false);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test('filterIgnoredFiles - correctly filters array of files', () => {
    const tempDir = createTempDir();
    const rootDir = tempDir;
    
    try {
      const patterns = ['archived/*.FCStd', '*backup*'];
      
      const files = [
        path.join(rootDir, 'file1.FCStd'),
        path.join(rootDir, 'archived/file2.FCStd'),
        path.join(rootDir, 'file3-backup.FCStd'),
        path.join(rootDir, 'subdir/file4.FCStd'),
        path.join(rootDir, 'archived/deep/file5.FCStd'),
      ];
      
      const filtered = filterIgnoredFiles(files, rootDir, patterns, true);
      
      assert.equal(filtered.length, 3, 'Should have 3 files after filtering');
      assert.ok(filtered.includes(path.join(rootDir, 'file1.FCStd')), 'file1.FCStd should be included');
      assert.ok(filtered.includes(path.join(rootDir, 'subdir/file4.FCStd')), 'subdir/file4.FCStd should be included');
      assert.ok(filtered.includes(path.join(rootDir, 'archived/deep/file5.FCStd')), 'archived/deep/file5.FCStd should be included');
      
      // When disabled, all files should pass through
      const allFiles = filterIgnoredFiles(files, rootDir, patterns, false);
      assert.equal(allFiles.length, 5, 'Should have all 5 files when disabled');
      
      // When no patterns, all files should pass through
      const noPatterns = filterIgnoredFiles(files, rootDir, [], true);
      assert.equal(noPatterns.length, 5, 'Should have all 5 files with no patterns');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test('loadIgnoreConfig - loads config from file', () => {
    const tempDir = createTempDir();
    const ignoreFile = path.join(tempDir, '.testignore');
    
    try {
      const content = `# Test patterns
*.log
**/temp/*
`;
      writeFileSync(ignoreFile, content);
      
      const patterns = loadIgnoreConfig(ignoreFile, tempDir);
      
      assert.equal(patterns.length, 2, 'Should load 2 patterns');
      assert.equal(patterns[0], '*.log');
      assert.equal(patterns[1], '**/temp/*');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test('shouldIgnoreFile - handles relative path matching correctly', () => {
    const rootDir = '/home/user/projects';
    
    const patterns = [
      'archived/*.FCStd',
      '**/backup/*.FCStd',
      'test.FCStd'
    ];
    
    // Test with absolute paths converted to relative
    const testCases = [
      { path: '/home/user/projects/archived/file.FCStd', expected: true },
      { path: '/home/user/projects/backup/file.FCStd', expected: true },
      { path: '/home/user/projects/sub/backup/file.FCStd', expected: true },
      { path: '/home/user/projects/test.FCStd', expected: true },
      { path: '/home/user/projects/models/file.FCStd', expected: false },
    ];
    
    for (const tc of testCases) {
      const result = shouldIgnoreFile(tc.path, rootDir, patterns, true);
      assert.equal(result, tc.expected, `Path ${tc.path} should be ${tc.expected ? 'ignored' : 'included'}`);
    }
  });
});
