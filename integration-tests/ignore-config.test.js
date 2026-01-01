import { test, describe, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, unlinkSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
  cleanupPreviews, 
  getPreviewPath,
  getModelsDir,
  runCli
} from './support/test-support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Integration Tests - Ignore Configuration', () => {
  const testDir = path.join(__dirname, 'ignore-test-files');
  const ignoreConfigFile = path.join(testDir, '.fcignore');
  const modelsDir = getModelsDir();
  const sourceFile = path.join(modelsDir, 'cube.FCStd');
  
  // Test files
  const file1 = path.join(testDir, 'model1.FCStd');
  const file2 = path.join(testDir, 'model2.FCStd');
  const archivedFile = path.join(testDir, 'archived', 'old-model.FCStd');
  const backupFile = path.join(testDir, 'backup', 'temp.FCStd');
  const subDirFile = path.join(testDir, 'subdir', 'nested.FCStd');
  
  // Expected outputs
  const output1 = getPreviewPath(file1);
  const output2 = getPreviewPath(file2);
  const archivedOutput = getPreviewPath(archivedFile);
  const backupOutput = getPreviewPath(backupFile);
  const subDirOutput = getPreviewPath(subDirFile);

  before(() => {
    // Create test directory structure
    mkdirSync(testDir, { recursive: true });
    mkdirSync(path.join(testDir, 'archived'), { recursive: true });
    mkdirSync(path.join(testDir, 'backup'), { recursive: true });
    mkdirSync(path.join(testDir, 'subdir'), { recursive: true });
    
    // Create ignore config
    const ignoreContent = `# Ignore archived files
archived/*.FCStd

# Ignore backup files
backup/*.FCStd

# Ignore specific file
model2.FCStd

# Comment line (should be ignored)
`;
    writeFileSync(ignoreConfigFile, ignoreContent);
    
    // Copy model files to test locations
    if (existsSync(sourceFile)) {
      cpSync(sourceFile, file1);
      cpSync(sourceFile, file2);
      cpSync(sourceFile, archivedFile);
      cpSync(sourceFile, backupFile);
      cpSync(sourceFile, subDirFile);
    } else {
      console.warn('⚠️ Source model file not found, creating empty files');
      writeFileSync(file1, Buffer.alloc(0));
      writeFileSync(file2, Buffer.alloc(0));
      writeFileSync(archivedFile, Buffer.alloc(0));
      writeFileSync(backupFile, Buffer.alloc(0));
      writeFileSync(subDirFile, Buffer.alloc(0));
    }
  });

  after(() => {
    // Clean up all test files and directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should respect ignore config and skip ignored files', async () => {
    // Run the extraction command with ignore config
    const result = await runCli(['--ignore-config', '.fcignore'], {
      cwd: testDir
    });

    // Check that the command succeeded
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // Check which files were processed based on our ignore rules:
    // - model1.FCStd: should be processed (not ignored)
    // - model2.FCStd: should be ignored
    // - archived/*.FCStd: should be ignored
    // - backup/*.FCStd: should be ignored
    // - subdir/nested.FCStd: should be processed (not ignored)
    
    // Files that should exist (not ignored)
    assert.ok(existsSync(output1), 'model1-preview.png should be created (not ignored)');
    assert.ok(existsSync(subDirOutput), 'nested-preview.png should be created (not ignored in subdir)');
    
    // Files that should NOT exist (ignored)
    assert.ok(!existsSync(output2), 'model2-preview.png should NOT be created (ignored by name)');
    assert.ok(!existsSync(archivedOutput), 'archived/old-model-preview.png should NOT be created (ignored by pattern)');
    assert.ok(!existsSync(backupOutput), 'backup/temp-preview.png should NOT be created (ignored by pattern)');
    
    // Check output mentions ignored files
    assert.ok(result.stdout.includes('Ignored'), 'Should mention ignored files in output');
  });

  test('should process all files when no ignore config is provided', async () => {
    // First, clean up any existing preview files
    const previewFiles = [output1, output2, archivedOutput, backupOutput, subDirOutput];
    cleanupPreviews(previewFiles);

    // Run the extraction command without ignore config
    const result = await runCli([], {
      cwd: testDir
    });

    // Check that the command succeeded
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // All files should be processed when no ignore config is provided
    assert.ok(existsSync(output1), 'model1-preview.png should be created');
    assert.ok(existsSync(output2), 'model2-preview.png should be created');
    assert.ok(existsSync(archivedOutput), 'archived/old-model-preview.png should be created');
    assert.ok(existsSync(backupOutput), 'backup/temp-preview.png should be created');
    assert.ok(existsSync(subDirOutput), 'nested-preview.png should be created');
  });

  test('should handle non-existent ignore config file gracefully', async () => {
    // Run the extraction command with non-existent ignore config
    const result = await runCli(['--ignore-config', 'non-existent.ignore'], {
      cwd: testDir
    });

    // Should still succeed - non-existent ignore config should not cause failure
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // Should process all files (no ignore patterns applied)
    assert.ok(existsSync(output1), 'model1-preview.png should be created');
    assert.ok(existsSync(output2), 'model2-preview.png should be created');
  });

  test('should handle invalid ignore config file gracefully', async () => {
    const invalidIgnoreFile = path.join(testDir, '.invalid-ignore');
    writeFileSync(invalidIgnoreFile, 'invalid-pattern-with-special-chars-[]{}');
    
    try {
      // Run the extraction command with invalid ignore config
      const result = await runCli(['--ignore-config', '.invalid-ignore'], {
        cwd: testDir
      });

      // Should still succeed - invalid patterns should be handled gracefully
      assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);
    } finally {
      // Clean up invalid ignore file
      if (existsSync(invalidIgnoreFile)) {
        unlinkSync(invalidIgnoreFile);
      }
    }
  });
});
