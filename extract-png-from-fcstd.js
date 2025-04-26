import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';
import { glob } from 'glob';

// Helper to promisify yauzl's zip opening
function openZipPromise(filename) {
  return new Promise((resolve, reject) => {
    yauzl.open(filename, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      resolve(zipfile);
    });
  });
}

// Helper to extract specifically thumbnails/Thumbnail.png from a zip archive
async function extractThumbnailFromFCStd(zipFilePath, outputPath) {
  const zipfile = await openZipPromise(zipFilePath);
  const targetFile = 'thumbnails/Thumbnail.png';
  let foundThumbnail = false;
  
  return new Promise((resolve, reject) => {
    zipfile.on('entry', (entry) => {
      // Look specifically for thumbnails/Thumbnail.png
      if (entry.fileName === targetFile) {
        console.log(`✅ Found Thumbnail in ${path.basename(zipFilePath)}`);
        foundThumbnail = true;
        
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            zipfile.close();
            return reject(err);
          }
          
          // Create directory if it doesn't exist
          const outputDir = path.dirname(outputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          const writeStream = fs.createWriteStream(outputPath);
          readStream.pipe(writeStream);
          
          writeStream.on('finish', () => {
            console.log(`✅ Extracted thumbnail to: ${outputPath}`);
            zipfile.close();
            resolve(true);
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
      if (!foundThumbnail) {
        console.log(`⚠️ No thumbnail found in ${path.basename(zipFilePath)}`);
        resolve(false);
      }
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
    // Find all .FCStd files in the current directory and subdirectories (case insensitive)
    const fcstdFiles = await glob('**/*.FCStd', { nocase: true });
    
    if (fcstdFiles.length === 0) {
      console.log('❌ No .FCStd files found');
      return;
    }
    
    console.log(`✅ Found ${fcstdFiles.length} .FCStd files to check`);
    
    for (const file of fcstdFiles) {
      try {
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
    
    console.log('✅ Processing complete');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

// Run the script
(async () => {
  await main();
})();