import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';

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
export async function extractThumbnailFromFCStd(zipFilePath, outputPath) {
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

// Process a single .FCStd file
export async function processSingleFile(filePath) {
  try {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return false;
    }
    
    // Verify it's a .FCStd file
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.fcstd') {
      console.log(`❌ Not a .FCStd file: ${filePath}`);
      return false;
    }
    
    // Prepare output path - same directory, same name but with .png extension
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const pngPath = path.join(dir, `${baseName}-preview.png`);
    
    // Try to extract thumbnail from the file
    await extractThumbnailFromFCStd(filePath, pngPath);
    return true;
    
  } catch (err) {
    console.log(`❌ Error processing ${filePath}: ${err.message}`);
    return false;
  }
}
