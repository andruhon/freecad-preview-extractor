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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get root directory for pattern matching
function getRootDir(cwd = process.cwd()) {
  return cwd;
}

// Run FreeCAD with isofit macro to generate preview
async function runFreeCADIsofit(fcstdFile) {
  const macroPath = path.join(__dirname, "isofit.FCMacro");

  return new Promise((resolve, reject) => {
    console.log(
      `🔧 Running FreeCAD with Isometric, Fit All macro on ${fcstdFile}...`,
    );

    const freecad = spawn("freecad", [fcstdFile, macroPath]);

    freecad.stdout.on("data", (data) => {
      // Log FreeCAD output if needed for debugging
      // console.log(`FreeCAD: ${data}`);
    });

    freecad.stderr.on("data", (data) => {
      // Log errors but don't fail immediately
      // console.error(`FreeCAD stderr: ${data}`);
    });

    freecad.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ FreeCAD processing complete for ${fcstdFile}`);
        resolve();
      } else {
        reject(new Error(`FreeCAD exited with code ${code}`));
      }
    });

    freecad.on("error", (err) => {
      reject(
        new Error(
          `Failed to start FreeCAD: ${err.message}. Make sure FreeCAD is installed and available in PATH.`,
        ),
      );
    });
  });
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

    for (const file of fcstdFiles) {
      try {
        // If --fit flag is set, run FreeCAD with isofit macro first
        if (runFit) {
          await runFreeCADIsofit(file);
        }

        // Prepare output path - same directory, same name but with .png extension
        const dir = path.dirname(file);
        const baseName = path.basename(file, path.extname(file));
        const pngPath = path.join(dir, `${baseName}-preview.png`);

        // Try to extract thumbnail from the file
        await extractThumbnailFromFCStd(file, pngPath);
      } catch (err) {
        console.log(`❌ Error processing ${file}: ${err.message}`);
      }
    }

    console.log("✅ Processing complete");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);

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
  const flagsToExclude = new Set(["--fit", "--ignore-config"]);
  if (ignoreConfig) {
    flagsToExclude.add(ignoreConfig);
  }
  const fileArgs = args.filter((arg) => !flagsToExclude.has(arg));

  if (fileArgs.length === 0) {
    // No arguments - process all files
    if (runFit) {
      console.log(
        "🔍 Running FreeCAD isofit and extracting images from all FreeCAD files in current directory...",
      );
    } else {
      console.log(
        "🔍 Extracting images from all FreeCAD files in current directory...",
      );
    }
    if (ignoreConfig) {
      console.log(`🔍 Using ignore config: ${ignoreConfig}`);
    }
    await processAllFiles(runFit, ignoreConfig);
  } else {
    // Process specific file(s)
    const file = fileArgs[0];

    // For single file mode, ignore config is not applied
    if (runFit) {
      console.log(`🔧 Running FreeCAD isofit on: ${file}`);
      await runFreeCADIsofit(file);
    }

    console.log(`🔍 Extracting image from: ${file}`);
    await processSingleFile(file);
  }
}

export { processAllFiles, runFreeCADIsofit };
export { loadIgnoreConfig, filterIgnoredFiles } from "./ignore-utils.js";

// Run the script
main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
