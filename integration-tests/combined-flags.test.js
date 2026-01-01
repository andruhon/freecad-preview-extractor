import { test, describe, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
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

describe('Integration Tests - Combined Flags', () => {
  const testDir = path.join(__dirname, 'combined-flags-test-files');
  const ignoreConfigFile = path.join(testDir, '.fcignore');
  const modelsDir = getModelsDir();
  const sourceFile = path.join(modelsDir, 'cube.FCStd');
  
  // Test files
  const file1 = path.join(testDir, 'model1.FCStd');
  const file2 = path.join(testDir, 'model2.FCStd');
  const archivedFile = path.join(testDir, 'archived', 'old-model.FCStd');
  const subDirFile = path.join(testDir, 'subdir', 'nested.FCStd');
  
  // Expected outputs
  const output1 = getPreviewPath(file1);
  const output2 = getPreviewPath(file2);
  const archivedOutput = getPreviewPath(archivedFile);
  const subDirOutput = getPreviewPath(subDirFile);

  before(() => {
    // Create test directory structure
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    
    // Create subdirectories
    mkdirSync(path.join(testDir, 'archived'), { recursive: true });
    mkdirSync(path.join(testDir, 'subdir'), { recursive: true });
    
    // Create ignore config
    const ignoreContent = `# Ignore archived files
archived/*.FCStd

# Ignore specific file
model2.FCStd
`;
    writeFileSync(ignoreConfigFile, ignoreContent);
    
    // Copy FreeCAD model files to test locations
    if (existsSync(sourceFile)) {
      cpSync(sourceFile, file1);
      cpSync(sourceFile, file2);
      cpSync(sourceFile, archivedFile);
      cpSync(sourceFile, subDirFile);
    } else {
      console.warn('⚠️ Source model file not found, creating empty files');
    }
  });

  after(() => {
    // Clean up all test files and directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should combine --fit and --ignore-config flags', async () => {
    // Clean up any existing preview files first
    cleanupPreviews([output1, output2, archivedOutput, subDirOutput]);

    // Run the extraction command with both --fit and --ignore-config flags
    const result = await runCli(['--fit', '--ignore-config', '.fcignore'], {
      cwd: testDir
    });

    // Check that the command succeeded
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // Check that ignore patterns were respected:
    // - model1.FCStd: should be processed (not ignored)
    // - model2.FCStd: should be ignored
    // - archived/*.FCStd: should be ignored
    // - subdir/nested.FCStd: should be processed (not ignored)
    
    // Files that should exist (not ignored)
    assert.ok(existsSync(output1), 'model1-preview.png should be created (not ignored)');
    assert.ok(existsSync(subDirOutput), 'nested-preview.png should be created (not ignored in subdir)');
    
    // Files that should NOT exist (ignored)
    assert.ok(!existsSync(output2), 'model2-preview.png should NOT be created (ignored by name)');
    assert.ok(!existsSync(archivedOutput), 'archived/old-model-preview.png should NOT be created (ignored by pattern)');
    
    // Check that FreeCAD was invoked (should see some output mentioning FreeCAD)
    assert.ok(result.stdout.includes('FreeCAD') || result.stderr.includes('FreeCAD'), 
              'Should contain FreeCAD-related output');
    
    // Check output mentions ignored files
    assert.ok(result.stdout.includes('Ignored'), 'Should mention ignored files in output');
  });

  test('should handle --fit flag with non-existent FreeCAD when ignore config is used', async () => {
    // Clean up any existing preview files first
    cleanupPreviews([output1, output2, archivedOutput, subDirOutput]);

    // Run the extraction command with --fit flag but with FreeCAD not available
    const result = await runCli(['--fit', '--ignore-config', '.fcignore'], {
      cwd: testDir,
      env: { ...process.env, PATH: '/non/existent/path' } // Remove freecad from PATH
    });

    // Should exit with error code due to FreeCAD not being available
    assert.ok(result.code !== 0, 'Command should exit with non-zero code when FreeCAD is not available');
    
    // Should contain error message about FreeCAD (errors are logged to stdout in this application)
    const output = result.stdout + result.stderr;
    assert.ok(output.toLowerCase().includes('freecad'), 
              `Should contain FreeCAD-related error message. stdout: ${result.stdout}, stderr: ${result.stderr}`);
  });

  test('should process remaining files even when some are ignored', async () => {
    // Clean up any existing preview files first
    cleanupPreviews([output1, output2, archivedOutput, subDirOutput]);

    // Run the extraction command with ignore config (no --fit)
    const result = await runCli(['--ignore-config', '.fcignore'], {
      cwd: testDir
    });

    // Check that the command succeeded
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // Verify that exactly 2 files were processed (model1 and subdir/nested)
    const processedFiles = [output1, subDirOutput];
    const ignoredFiles = [output2, archivedOutput];
    
    // Processed files should exist
    processedFiles.forEach(file => {
      assert.ok(existsSync(file), `Should process file: ${path.basename(file)}`);
    });
    
    // Ignored files should not exist
    ignoredFiles.forEach(file => {
      assert.ok(!existsSync(file), `Should ignore file: ${path.basename(file)}`);
    });
    
    // Check progress output
    assert.ok(result.stdout.includes('2 succeeded'), 'Should report 2 successful extractions');
    assert.ok(result.stdout.includes('Ignored 2 files'), 'Should report 2 ignored files');
  });
});
