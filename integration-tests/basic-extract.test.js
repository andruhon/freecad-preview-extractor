import { test, describe, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, unlinkSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Integration Tests - Basic Extraction', () => {
  const testFile = path.join(__dirname, 'test-project', 'cube.FCStd');
  const expectedOutput = path.join(__dirname, 'test-project', 'cube-preview.png');

  // Clean up any existing preview file before tests
  before(() => {
    if (existsSync(expectedOutput)) {
      unlinkSync(expectedOutput);
    }
  });

  // Clean up after tests
  after(() => {
    if (existsSync(expectedOutput)) {
      console.log(`Cleaning up ${expectedOutput}`);
      unlinkSync(expectedOutput);
    }
  });

  test('should extract preview from cube.FCStd using fqreecad-preview-extractor', async () => {
    // Skip test if test file doesn't exist
    if (!existsSync(testFile)) {
      throw new Error(`${testFile} does not exist.`);
      return;
    }

    // Run the extraction command
    const result = await new Promise((resolve, reject) => {
      const child = spawn('npx', ['fqreecad-preview-extractor', testFile], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on('error', (err) => {
        reject(err);
      });
    });

    // Check that the command succeeded
    assert.equal(result.code, 0, `Command should exit with code 0. stderr: ${result.stderr}`);

    // Check that the output file was created
    assert.ok(existsSync(expectedOutput), `Preview file should be created at ${expectedOutput}`);

    // Check that the output file has content (not empty)
    const stats = statSync(expectedOutput);
    assert.ok(stats.size > 0, 'Preview file should not be empty');
  });
});
