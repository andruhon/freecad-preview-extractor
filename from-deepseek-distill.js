const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function isZipFile(filePath) {
    return new Promise((resolve) => {
        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);
        resolve(buffer.toString('hex') === '504b0304'); // ZIP file magic number
    });
}

async function processZipFile(filePath) {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    
    const directory = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const baseName = path.parse(fileName).name;

    for (const entry of entries) {
        if (entry.fileName.endsWith('.png')) {
            const pngData = zip.readFile(entry);
            const outputName = `${baseName}.png`;
            const outputPath = path.join(directory, outputName);
            
            fs.writeFileSync(outputPath, pngData);
            console.log(`Extracted PNG: ${outputPath}`);
        }
    }
}

async function walkDirectory(dir) {
    const files = await fs.promises.readdir(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.isDirectory()) {
            await walkDirectory(filePath);
        } else {
            // Check if file has one of the target extensions
            if (file.endsWith('.fcstd') || file.endsWith('.f3d') || file.endsWith('.fcm')) {
                if (await isZipFile(filePath)) {
                    await processZipFile(filePath);
                }
            }
        }
    }
}

async function main() {
    try {
        const rootDir = '.'; // Start from current directory
        await walkDirectory(rootDir);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();