import { existsSync, unlinkSync, mkdirSync, rmSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the path to the freecad-models directory containing test FreeCAD files
 */
export function getModelsDir() {
  return path.join(__dirname, '..', 'freecad-models');
}

/**
 * Get the path to the src/index.js CLI entry point
 */
export function getCliPath() {
  return path.join(__dirname, '..', '..', 'src', 'index.js');
}

/**
 * Clean up preview files in a directory
 * @param {string[]} previewPaths - Array of preview file paths to clean up
 */
export function cleanupPreviews(previewPaths) {
  previewPaths.forEach(file => {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  });
}

/**
 * Create a test environment by copying FreeCAD models to a test directory
 * @param {string} testDir - Target test directory path
 * @param {Object} options - Options for test environment setup
 * @param {string[]} options.models - Array of model names to copy (e.g., ['cube.FCStd', 'sphere.FCStd'])
 * @param {Object} options.structure - Directory structure to create (nested object)
 * @returns {Object} - Object with paths to created files
 */
export function createTestEnvironment(testDir, options = {}) {
  const { models = ['cube.FCStd'], structure = {} } = options;
  const modelsDir = getModelsDir();
  const createdFiles = {};

  // Clean up existing test directory
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }

  // Create test directory
  mkdirSync(testDir, { recursive: true });

  // Create subdirectory structure
  Object.keys(structure).forEach(subDir => {
    const dirPath = path.join(testDir, subDir);
    mkdirSync(dirPath, { recursive: true });
  });

  // Copy model files to appropriate locations
  models.forEach(modelName => {
    const sourcePath = path.join(modelsDir, modelName);
    if (!existsSync(sourcePath)) {
      console.warn(`⚠️ Model file ${modelName} not found in ${modelsDir}`);
      return;
    }

    const content = readFileSync(sourcePath);
    
    // Copy to root of test directory
    const destPath = path.join(testDir, modelName);
    createdFiles[modelName] = destPath;

    // Also copy to subdirectories if specified in structure
    Object.entries(structure).forEach(([subDir, fileMapping]) => {
      if (fileMapping[modelName]) {
        const subDirPath = path.join(testDir, subDir);
        const subDestPath = path.join(subDirPath, fileMapping[modelName]);
        createdFiles[`${subDir}/${fileMapping[modelName]}`] = subDestPath;
      }
    });
  });

  return { testDir, files: createdFiles };
}

/**
 * Copy entire freecad-models directory to a test location
 * @param {string} testDir - Target test directory path
 */
export function copyModelsDirectory(testDir) {
  const modelsDir = getModelsDir();
  
  // Clean up existing test directory
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }

  // Copy entire directory
  cpSync(modelsDir, testDir, { recursive: true });
  
  return testDir;
}

/**
 * Run the CLI command and return the result
 * @param {string[]} args - CLI arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
export function runCli(args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [getCliPath(), ...args], {
      stdio: 'pipe',
      ...options
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
}

/**
 * Get expected preview path for a FreeCAD file
 * @param {string} fcstdPath - Path to .FCStd file
 * @returns {string} - Path to expected preview file
 */
export function getPreviewPath(fcstdPath) {
  const dir = path.dirname(fcstdPath);
  const baseName = path.basename(fcstdPath, path.extname(fcstdPath));
  return path.join(dir, `${baseName}-preview.png`);
}

/**
 * Create multiple test files with different naming conventions
 * @param {string} testDir - Test directory path
 * @param {Object} fileSpec - File specification object
 * @returns {Object} - Object with created file paths and their preview paths
 */
export function createTestFiles(testDir, fileSpec) {
  const modelsDir = getModelsDir();
  const sourceFile = path.join(modelsDir, 'cube.FCStd');
  const sourceContent = existsSync(sourceFile) ? readFileSync(sourceFile) : Buffer.alloc(0);
  
  const created = {
    files: {},
    previews: {}
  };

  Object.entries(fileSpec).forEach(([key, filePath]) => {
    const fullPath = path.join(testDir, filePath);
    const dir = path.dirname(fullPath);
    
    // Ensure directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write file
    if (sourceContent.length > 0) {
      cpSync(sourceFile, fullPath);
    } else {
      // Fallback to empty file
      writeFileSync(fullPath, Buffer.alloc(0));
    }

    created.files[key] = fullPath;
    created.previews[key] = getPreviewPath(fullPath);
  });

  return created;
}
