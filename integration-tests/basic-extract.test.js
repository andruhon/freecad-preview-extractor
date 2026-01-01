import { test, describe, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, statSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanupPreviews, getPreviewPath, copyModelsDirectory, runCli } from './support/test-support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Integration Tests - Basic Extraction', () => {
  const testDir = path.join(__dirname, 'test-basic-extract');
  const testFile = path.join(testDir, 'cube.FCStd');
  const expectedOutput = getPreviewPath(testFile);

  // Set up test environment before tests
  before(() => {
    // Clean up any existing test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    
    // Copy models directory for testing
    copyModelsDirectory(testDir);
    
    // Clean up any existing preview files
    cleanupPreviews([expectedOutput]);
  });

  // Clean up after tests
  after(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should extract preview from cube.FCStd using freecad-preview-extractor', async () => {
    // Skip test if test file doesn't exist
    if (!existsSync(testFile)) {
      throw new Error(`${testFile} does not exist.`);
    }

    // Run the extraction command
    const result = await runCli([testFile]);

    // Check that the command succeeded
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // Check that the output file was created
    assert.ok(existsSync(expectedOutput), `Preview file should be created at ${expectedOutput}`);

    // Check that the output file has content (not empty)
    const stats = statSync(expectedOutput);
    assert.ok(stats.size > 0, 'Preview file should not be empty');
  });
});
