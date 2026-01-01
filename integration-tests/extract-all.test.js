import {after, before, describe, test} from 'node:test';
import {strict as assert} from 'node:assert';
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  cleanupPreviews,
  getModelsDir,
  getPreviewPath,
  runCli
} from './support/test-support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Integration Tests - Extract All Functionality', () => {
  const testDir = path.join(__dirname, 'extract-all-test-files');
  const modelsDir = getModelsDir();
  const sourceFile = path.join(modelsDir, 'cube.FCStd');
  
  const subDir1 = path.join(testDir, 'models');
  const subDir2 = path.join(testDir, 'projects', 'subproject');
  
  // Test files in different directories
  const rootFile1 = path.join(testDir, 'root-model.FCStd');
  const rootFile2 = path.join(testDir, 'another-root.FCStd');
  const subFile1 = path.join(subDir1, 'sub-model.FCStd');
  const subFile2 = path.join(subDir1, 'sub-model2.FCStd');
  const deepFile = path.join(subDir2, 'deep-model.FCStd');
  
  // Mixed case files
  const mixedCaseFile1 = path.join(testDir, 'MixedCase.FCSTD');
  const mixedCaseFile2 = path.join(subDir1, 'lowercase.fcstd');
  
  // Expected outputs
  const outputs = [
    getPreviewPath(rootFile1),
    getPreviewPath(rootFile2),
    getPreviewPath(subFile1),
    getPreviewPath(subFile2),
    getPreviewPath(deepFile),
    getPreviewPath(mixedCaseFile1),
    getPreviewPath(mixedCaseFile2)
  ];

  before(() => {
    // Create test directory structure
    mkdirSync(testDir, { recursive: true });
    mkdirSync(subDir1, { recursive: true });
    mkdirSync(subDir2, { recursive: true });
    
    // Copy model files to various locations with different cases
    if (existsSync(sourceFile)) {
      cpSync(sourceFile, rootFile1);
      cpSync(sourceFile, rootFile2);
      cpSync(sourceFile, subFile1);
      cpSync(sourceFile, subFile2);
      cpSync(sourceFile, deepFile);
      cpSync(sourceFile, mixedCaseFile1);
      cpSync(sourceFile, mixedCaseFile2);
    } else {
      console.warn('⚠️ Source model file not found, creating empty files');
      const emptyContent = Buffer.alloc(0);
      writeFileSync(rootFile1, emptyContent);
      writeFileSync(rootFile2, emptyContent);
      writeFileSync(subFile1, emptyContent);
      writeFileSync(subFile2, emptyContent);
      writeFileSync(deepFile, emptyContent);
      writeFileSync(mixedCaseFile1, emptyContent);
      writeFileSync(mixedCaseFile2, emptyContent);
    }
  });

  after(() => {
    // Clean up all test files and directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should extract from all .FCStd files in directory and subdirectories', async () => {
    // Clean up any existing preview files first
    cleanupPreviews(outputs);

    // Run the extraction command on the test directory
    const result = await runCli([], {
      cwd: testDir
    });

    // Check that the command succeeded
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // Verify that all expected preview files were created
    outputs.forEach(outputFile => {
      assert.ok(existsSync(outputFile), `Preview file should be created: ${path.basename(outputFile)}`);
      
      // Check that the file has content (not empty)
      const stats = statSync(outputFile);
      assert.ok(stats.size > 0, `Preview file should not be empty: ${path.basename(outputFile)}`);
    });
    
    // Check that the correct number of files were found and processed
    assert.ok(result.stdout.includes('Found 7 .FCStd files'), 'Should report finding 7 files');
    assert.ok(result.stdout.includes('7 succeeded'), 'Should report 7 successful extractions');
  });

  test('should handle case-insensitive file matching', async () => {
    // Clean up any existing preview files first
    cleanupPreviews(outputs);

    // Run the extraction command
    const result = await runCli([], {
      cwd: testDir
    });

    // Should successfully process files with different case extensions
    const caseSensitiveFiles = [
      getPreviewPath(mixedCaseFile1),
      getPreviewPath(mixedCaseFile2)
    ];
    
    caseSensitiveFiles.forEach(outputFile => {
      assert.ok(existsSync(outputFile), `Should process file with different case: ${path.basename(outputFile)}`);
    });
  });

  test('should handle empty directory gracefully', async () => {
    const emptyDir = path.join(__dirname, 'empty-test-dir');
    
    try {
      // Create empty directory
      mkdirSync(emptyDir, { recursive: true });

      // Run the extraction command on empty directory
      const result = await runCli([], {
        cwd: emptyDir
      });

      // Should exit with error code when no files found
      assert.ok(result.code !== 0, 'Command should exit with non-zero code when no .FCStd files found');
      assert.ok(result.stdout.includes('No .FCStd files found'), 'Should report no files found');
    } finally {
      // Clean up empty directory
      if (existsSync(emptyDir)) {
        rmSync(emptyDir, { recursive: true, force: true });
      }
    }
  });

  test('should handle directory with only non-FCStd files', async () => {
    const nonFCStdDir = path.join(__dirname, 'non-fcstd-test-dir');
    
    try {
      // Create directory with only non-FCStd files
      mkdirSync(nonFCStdDir, { recursive: true });
      
      // Create some non-FCStd files
      writeFileSync(path.join(nonFCStdDir, 'document.txt'), 'test content');
      writeFileSync(path.join(nonFCStdDir, 'image.png'), Buffer.alloc(100));
      writeFileSync(path.join(nonFCStdDir, 'README.md'), '# Test');

      // Run the extraction command
      const result = await runCli([], {
        cwd: nonFCStdDir
      });

      // Should exit with error code when no FCStd files found
      assert.ok(result.code !== 0, 'Command should exit with non-zero code when no .FCStd files found');
      assert.ok(result.stdout.includes('No .FCStd files found'), 'Should report no files found');
    } finally {
      // Clean up directory
      if (existsSync(nonFCStdDir)) {
        rmSync(nonFCStdDir, { recursive: true, force: true });
      }
    }
  });

  test('should handle partial failures gracefully', async () => {
    const partialDir = path.join(__dirname, 'partial-failure-test');
    const validFile = path.join(partialDir, 'valid.FCStd');
    const invalidFile = path.join(partialDir, 'invalid.FCStd');
    
    try {
      // Create test directory
      mkdirSync(partialDir, { recursive: true });
      
      // Create one valid file (copy from models)
      if (existsSync(sourceFile)) {
        cpSync(sourceFile, validFile);
      } else {
        writeFileSync(validFile, Buffer.alloc(0));
      }
      
      // Create an invalid file (small file that's not a valid ZIP)
      writeFileSync(invalidFile, Buffer.alloc(10));

      // Run the extraction command
      const result = await runCli([], {
        cwd: partialDir
      });

      // Should exit with error code due to partial failures
      assert.ok(result.code !== 0, 'Command should exit with non-zero code when there are partial failures');
      
      // Should create preview for valid file
      const validOutput = getPreviewPath(validFile);
      assert.ok(existsSync(validOutput), 'Should create preview for valid file');
      
      // Should report failures in output
      assert.ok(result.stdout.includes('failed'), 'Should report failures in output');
    } finally {
      // Clean up directory
      if (existsSync(partialDir)) {
        rmSync(partialDir, { recursive: true, force: true });
      }
    }
  });
});
