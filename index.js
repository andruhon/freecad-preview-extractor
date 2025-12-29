#!/usr/bin/env node
import path from 'path';
import { glob } from 'glob';
import { processSingleFile, extractThumbnailFromFCStd } from './extract-png-from-fcstd.js';

// Process all .FCStd files in current directory and subdirectories
async function processAllFiles() {
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

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // No arguments - process all files
    console.log('🔍 Extracting images from all FreeCAD files in current directory...');
    await processAllFiles();
  } else {
    // Process specific file(s)
    console.log(`🔍 Extracting image from: ${args[0]}`);
    await processSingleFile(args[0]);
  }
}

// Run the script
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
