import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';
import { glob } from 'glob';
import { execSync } from 'child_process';

// Helper to promisify yauzl's zip opening
function openZipPromise(filename) {
  return new Promise((resolve, reject) => {
    yauzl.open(filename, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      resolve(zipfile);
    });
  });
}

// Helper to read a specific file from a zip archive
async function extractPngFromZip(zipFilePath, outputPath) {
  const zipfile = await openZipPromise(zipFilePath);
  let foundPng = false;
  
  return new Promise((resolve, reject) => {
    zipfile.on('entry', (entry) => {
      // Look for PNG files in the zip
      if (entry.fileName.toLowerCase().endsWith('.png')) {
        console.log(`✅ Found PNG in ${path.basename(zipFilePath)}: ${entry.fileName}`);
        foundPng = true;
        
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            zipfile.close();
            return reject(err);
          }
          
          const writeStream = fs.createWriteStream(outputPath);
          readStream.pipe(writeStream);
          
          writeStream.on('close', () => {
            console.log(`✅ Extracted to: ${outputPath}`);
            zipfile.readEntry();
          });
          
          writeStream.on('error', (err) => {
            zipfile.close();
            reject(err);
          });
        });
      } else {
        zipfile.readEntry();
      }
    });
    
    zipfile.on('end', () => {
      if (!foundPng) {
        console.log(`⚠️ No PNG files found in ${path.basename(zipFilePath)}`);
      }
      resolve(foundPng);
    });
    
    zipfile.on('error', (err) => {
      reject(err);
    });
    
    zipfile.readEntry();
  });
}

// Main function
async function main() {
  try {
    // Find all .fcstd files in the current directory and subdirectories
    const fcstdFiles = await glob('**/*.FCStd'); // FIXME this is case sensitive!
    
    if (fcstdFiles.length === 0) {
      console.log('❌ No .fcstd files found');
      return;
    }
    
    console.log(`✅ Found ${fcstdFiles.length} .fcstd files to check`);
    
    for (const file of fcstdFiles) {
      try {
        // Prepare output path - same directory, same name but with .png extension
        const dir = path.dirname(file);
        const baseName = path.basename(file, '.fcstd');
        const pngPath = path.join(dir, `${baseName}.png`);
        
        // Try to extract PNG from the file treating it as a ZIP
        await extractPngFromZip(file, pngPath);
        
      } catch (err) {
        console.log(`❌ Error processing ${file}: ${err.message}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

// Run the script
(async () => {
  await main();
})();