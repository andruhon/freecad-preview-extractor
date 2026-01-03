#!/usr/bin/env node
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { glob } from "glob";
import {
  processSingleFile,
  extractThumbnailFromFCStd,
} from "./extract-png-from-fcstd.js";
import { loadIgnoreConfig, filterIgnoredFiles } from "./ignore-utils.js";
import { runFreeCADIsometricFit } from "./fit-utils.js";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get root directory for pattern matching
function getRootDir(cwd = process.cwd()) {
  return cwd;
}

// Process all .FCStd files in current directory and subdirectories
async function processAllFiles(runFit = false, ignoreConfig = null) {
  try {
    // Find all .FCStd files in the current directory and subdirectories (case insensitive)
    let fcstdFiles = await glob("**/*.FCStd", { nocase: true });

    if (fcstdFiles.length === 0) {
      console.log("❌ No .FCStd files found");
      return;
    }

    // Apply ignore patterns if config is provided
    let ignorePatterns = [];
    if (ignoreConfig) {
      const rootDir = getRootDir();
      ignorePatterns = loadIgnoreConfig(ignoreConfig, rootDir);
      if (ignorePatterns.length > 0) {
        const originalCount = fcstdFiles.length;
        fcstdFiles = filterIgnoredFiles(fcstdFiles, rootDir, ignorePatterns, true);
        const ignoredCount = originalCount - fcstdFiles.length;
        if (ignoredCount > 0) {
          console.log(`🔍 Ignored ${ignoredCount} files based on ${ignoreConfig}`);
        }
      }
    }

    if (fcstdFiles.length === 0) {
      console.log("❌ All files were filtered out by ignore patterns");
      return;
    }

    console.log(`✅ Found ${fcstdFiles.length} .FCStd files to check`);

    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const file of fcstdFiles) {
      let fileToProcess = file;
      let tempFile = null;

      try {
        // If --fit flag is set, run FreeCAD with isometric-fit macro first
        if (runFit) {
          const ext = path.extname(file);
          const dir = path.dirname(file);
          const baseName = path.basename(file, ext);
          tempFile = path.join(dir, `${baseName}_temp_${Date.now()}${ext}`);

          fs.copyFileSync(file, tempFile);
          fileToProcess = tempFile;

          await runFreeCADIsometricFit(fileToProcess);
        }

        // Prepare output path - same directory, same name but with .png extension
        const dir = path.dirname(file);
        const baseName = path.basename(file, path.extname(file));
        const pngPath = path.join(dir, `${baseName}-preview.png`);

        // Try to extract thumbnail from the file
        await extractThumbnailFromFCStd(fileToProcess, pngPath);
        successCount++;
      } catch (err) {
        console.log(`❌ Error processing ${file}: ${err.message}`);
        failureCount++;
      } finally {
        // Clean up temp file
        if (tempFile && fs.existsSync(tempFile)) {
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            console.log(`⚠️ Could not delete temp file ${tempFile}: ${e.message}`);
          }
        }
      }
      processedCount++;
      console.log(`📊 Progress: ${processedCount}/${fcstdFiles.length} (${successCount} succeeded, ${failureCount} failed)`);
    }

    if (failureCount > 0) {
      console.log(`⚠️ Processing completed with ${failureCount} failures out of ${processedCount} files`);
      return false; // Indicate partial failure
    } else {
      console.log("✅ Processing complete - all files processed successfully");
      return true; // Indicate success
    }
  } catch (err) {
    console.error("❌ Error:", err);
    return false; // Indicate failure
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);

  // Check for --version or --help flags
  if (args.includes("--version") || args.includes("-v")) {
    const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url)));
    console.log(pkg.version);
    process.exit(0);
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`FreeCAD Preview Extractor v0.0.2-alpha

Usage: fcxtc [options] [file]

Options:
  --fit               Run FreeCAD with isometric fit macro before extracting
  --ignore-config     Path to ignore config file (e.g., .fcignore)
  --version, -v       Show version number
  --help, -h          Show this help message

Examples:
  fcxtc               Extract previews from all .FCStd files in current directory
  fcxtc myfile.FCStd  Extract preview from specific file
  fcxtc --fit         Run isometric fit macro on all files before extracting
  fcxtc --ignore-config .fcignore  Use ignore config file
  fcxtc --fit --ignore-config .fcignore  Combine flags`);
    process.exit(0);
  }

  // Check for --fit flag
  const fitIndex = args.indexOf("--fit");
  const runFit = fitIndex !== -1;

  // Check for --ignore-config flag
  let ignoreConfig = null;
  const ignoreConfigIndex = args.indexOf("--ignore-config");
  if (ignoreConfigIndex !== -1 && ignoreConfigIndex + 1 < args.length) {
    ignoreConfig = args[ignoreConfigIndex + 1];
  }

  // Filter out --fit, --ignore-config and its value to get file arguments
  const fileArgs = args.filter((arg, index) => {
    if (arg === "--fit") return false;
    if (arg === "--ignore-config") return false;
    if (ignoreConfigIndex !== -1 && index === ignoreConfigIndex + 1) return false;
    return true;
  });

  if (fileArgs.length === 0) {
    // No arguments - process all files
    if (runFit) {
      console.log(
        "🔍 Running FreeCAD isometric-fit and extracting images from all FreeCAD files in current directory...",
      );
    } else {
      console.log(
        "🔍 Extracting images from all FreeCAD files in current directory...",
      );
    }
    if (ignoreConfig) {
      console.log(`🔍 Using ignore config: ${ignoreConfig}`);
    }
    const success = await processAllFiles(runFit, ignoreConfig);
    if (!success) {
      process.exit(1); // Exit with error code if batch processing failed
    }
  } else {
    // Process specific file(s)
    const file = fileArgs[0];
    let fileToProcess = file;
    let tempFile = null;
    let customOutputPath = null;

    try {
      // For single file mode, ignore config is not applied
      if (runFit) {
        const ext = path.extname(file);
        const dir = path.dirname(file);
        const baseName = path.basename(file, ext);
        tempFile = path.join(dir, `${baseName}_temp_${Date.now()}${ext}`);

        fs.copyFileSync(file, tempFile);
        fileToProcess = tempFile;
        
        // Set output path based on original file
        customOutputPath = path.join(dir, `${baseName}-preview.png`);

        console.log(`🔧 Running FreeCAD isometric-fit on temp file: ${path.basename(tempFile)}`);
        await runFreeCADIsometricFit(fileToProcess);
      }

      console.log(`🔍 Extracting image from: ${fileToProcess}`);
      await processSingleFile(fileToProcess, customOutputPath);
    } catch (err) {
      console.error(`❌ Error processing ${file}:`, err);
      process.exitCode = 1;
    } finally {
      // Clean up temp file
      if (tempFile && fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.warn(`⚠️ Failed to delete temp file: ${e.message}`);
        }
      }
    }
  }
}

export { processAllFiles };
export { loadIgnoreConfig, filterIgnoredFiles } from "./ignore-utils.js";

// Run the script
main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
