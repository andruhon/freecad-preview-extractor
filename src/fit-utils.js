import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run FreeCAD with isometric fit macro to generate preview
async function runFreeCADIsometricFit(fcstdFile) {
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

export { runFreeCADIsometricFit };