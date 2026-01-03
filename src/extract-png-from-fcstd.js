import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';

// Constants
const THUMBNAIL_PATH = 'thumbnails/Thumbnail.png';

// Helper to promisify yauzl's zip opening
function openZipPromise(filename) {
  return new Promise((resolve, reject) => {
    yauzl.open(filename, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      resolve(zipfile);
    });
  });
}

/**
 * Extract thumbnail from a FreeCAD file
 * @param {string} zipFilePath - Path to the .FCStd file
 * @param {string} outputPath - Path where to save the extracted PNG
 * @returns {Promise<boolean>} True if thumbnail was found and extracted
 */
export async function extractThumbnailFromFCStd(zipFilePath, outputPath) {
  const zipfile = await openZipPromise(zipFilePath);
  let foundThumbnail = false;
  
  return new Promise((resolve, reject) => {
    zipfile.on('entry', (entry) => {
      // Look specifically for thumbnails/Thumbnail.png
      if (entry.fileName === THUMBNAIL_PATH) {
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
          
          // Handle readStream errors to prevent resource leaks
          readStream.on('error', (err) => {
            zipfile.close();
            reject(err);
          });
          
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

/**
 * Process a single .FCStd file to extract its preview
 * @param {string} filePath - Path to the .FCStd file
 * @param {string} [customOutputPath] - Optional custom path for the output PNG
 * @returns {Promise<boolean>} True if processing was successful
 */
export async function processSingleFile(filePath, customOutputPath = null) {
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
    const pngPath = customOutputPath || path.join(dir, `${baseName}-preview.png`);
    
    // Try to extract thumbnail from the file
    await extractThumbnailFromFCStd(filePath, pngPath);
    return true;
    
  } catch (err) {
    console.log(`❌ Error processing ${filePath}: ${err.message}`);
    return false;
  }
}
