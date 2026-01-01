import { test, describe, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, statSync, writeFileSync, rmSync, renameSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
  cleanupPreviews, 
  getPreviewPath, 
  copyModelsDirectory, 
  runCli,
  getModelsDir
} from './support/test-support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Integration Tests - FIT Flag', () => {
  const modelsDir = getModelsDir();
  const testFile = path.join(modelsDir, 'cube.FCStd');
  const cubePreview = getPreviewPath(path.join(modelsDir, 'cube.FCStd'));
  const spherePreview = getPreviewPath(path.join(modelsDir, 'sphere.FCStd'));
  
  // Test directory for FIT operations
  const fitTestDir = path.join(__dirname, 'fit-test-files');
  const fitTestFile = path.join(fitTestDir, 'fit-test.FCStd');
  const fitPreview = getPreviewPath(fitTestFile);

  // Clean up any existing preview files before tests
  before(() => {
    cleanupPreviews([cubePreview, spherePreview, fitPreview]);
    
    // Create fit test environment by copying models directory
    copyModelsDirectory(fitTestDir);
    
    // Rename cube.FCStd to fit-test.FCStd for single file test
    const cubePath = path.join(fitTestDir, 'cube.FCStd');
    if (existsSync(cubePath)) {
      renameSync(cubePath, fitTestFile);
    }
    
    // Remove sphere.FCStd from fit test dir (only need one file)
    const spherePath = path.join(fitTestDir, 'sphere.FCStd');
    if (existsSync(spherePath)) {
      unlinkSync(spherePath);
    }
  });

  // Clean up after tests
  after(() => {
    cleanupPreviews([cubePreview, spherePreview, fitPreview]);
    
    // Clean up test directory
    if (existsSync(fitTestDir)) {
      rmSync(fitTestDir, { recursive: true, force: true });
    }
  });

  test('should run with --fit flag on single file', async () => {
    // Skip test if test file doesn't exist
    if (!existsSync(fitTestFile)) {
      throw new Error(`${fitTestFile} does not exist.`);
    }

    // Run the extraction command with --fit flag
    const result = await runCli(['--fit', fitTestFile], {
      cwd: path.join(__dirname, '..')
    });

    // Check that the command succeeded
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // Check that the output file was created
    assert.ok(existsSync(fitPreview), `Preview file should be created at ${fitPreview}`);

    // Check that the output file has content (not empty)
    const stats = statSync(fitPreview);
    assert.ok(stats.size > 0, 'Preview file should not be empty');
    
    // Check that FreeCAD was invoked (should see some output mentioning FreeCAD)
    assert.ok(result.stdout.includes('FreeCAD') || result.stderr.includes('FreeCAD'), 
              'Should contain FreeCAD-related output');
  });

  test('should run with --fit flag on multiple files', async () => {
    // Skip test if test file doesn't exist
    if (!existsSync(testFile)) {
      throw new Error(`${testFile} does not exist.`);
    }

    // Run the extraction command with --fit flag on the models directory
    const result = await runCli(['--fit'], {
      cwd: modelsDir
    });

    // Check that the command succeeded
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // Check that output files were created for both test files
    assert.ok(existsSync(cubePreview), `Cube preview file should be created`);
    assert.ok(existsSync(spherePreview), `Sphere preview file should be created`);

    // Check that both files have content
    const cubeStats = statSync(cubePreview);
    const sphereStats = statSync(spherePreview);
    assert.ok(cubeStats.size > 0, 'Cube preview file should not be empty');
    assert.ok(sphereStats.size > 0, 'Sphere preview file should not be empty');
    
    // Check that FreeCAD was invoked (should see some output mentioning FreeCAD)
    assert.ok(result.stdout.includes('FreeCAD') || result.stderr.includes('FreeCAD'), 
              'Should contain FreeCAD-related output');
  });

  test('should handle --fit flag with non-existent FreeCAD gracefully', async () => {
    // This test verifies that the --fit flag is handled gracefully when FreeCAD is not available
    // We'll use a mock environment where freecad command doesn't exist
    
    const result = await runCli(['--fit', testFile], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PATH: '/non/existent/path' } // Remove freecad from PATH
    });

    // Should exit with error code due to FreeCAD not being available
    assert.ok(result.code !== 0, 'Command should exit with non-zero code when FreeCAD is not available');
    
    // Should contain error message about FreeCAD
    assert.ok(result.stderr.includes('FreeCAD') || result.stderr.includes('freecad'), 
              'Should contain FreeCAD-related error message');
  });
});
