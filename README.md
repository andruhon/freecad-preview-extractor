# FreeCAD preview extractor

A CLI tool for extracting and generating preview thumbnails from FreeCAD files.

## Features

- **Extract existing previews**: Quickly extract embedded thumbnail images from `.FCStd` files
- **Generate new previews**: Use FreeCAD to create fresh previews with isometric view and fit-to-view
- **Batch processing**: Process all FreeCAD files in a directory recursively
- **Single file mode**: Extract or generate previews for specific files
- **Ignore patterns**: Use an ignore config file (like `.gitignore`) to exclude specific files from batch processing

## Installation
```bash
git clone https://github.com/andruhon/freecad-preview-extractor.git
cd ./freecad-preview-extractor
npm ci
sudo npm install -g ./
```

## Usage

### Extract existing previews from all FreeCAD files
```bash
fcxtc
```

or 

```bash
freecad-preview-extractor
```

### Extract preview from a specific file
```bash
fcxtc filename.FCStd
```

### Generate preview with FreeCAD before extraction (requires FreeCAD and desktop environment)

Adding `--fit` argument will trigger `src/isofit.FCMacro` FreeCAD macros for each file,
the macros sets model to the isometric view, does "fit into view", and saves the file.

```bash
fcxtc --fit
```

or for a specific file:

```bash
fcxtc --fit filename.FCStd
```

### Ignore specific files during batch processing
```bash
fcxtc --ignore-config .myignore
```

Create an ignore file (e.g., `.myignore`) with patterns to exclude:
```
# Ignore all files in the archived directory
archived/*.FCStd

# Ignore specific files
test-model.FCStd

# Ignore files with specific naming pattern
*backup*.FCStd
```

The `--fit` option will:
1. Open each FreeCAD file with FreeCAD
2. Run the `isofit.FCMacro` macro to set Isometric View and Fit All
3. Save the file with the updated preview
4. Extract the preview image as usual

The `--ignore-config` option allows you to exclude specific files from batch processing using pattern matching similar to `.gitignore`:
- Supports wildcards (`*`, `?`)
- Supports `**` for recursive matching
- Supports character ranges (`[abc]`)
- Lines starting with `#` are treated as comments
- Empty lines are ignored

**Note:** The `--fit` option requires:
- FreeCAD installed and available in your system PATH
- A desktop environment / X server (cannot run headless)
- UI access for FreeCAD to render the view

**Note:** The `--ignore-config` option only works in batch processing mode (when no specific file is provided). It is ignored in single-file mode.

## Testing

```bash
# Run unit tests
npm test
```

## Utilities

The project exports utility functions that can be used programmatically:

- `loadIgnoreConfig(filePath, cwd)` - Load ignore patterns from a file
- `filterIgnoredFiles(filePaths, rootDir, patterns, enabled)` - Filter files based on patterns
- `shouldIgnoreFile(filePath, rootDir, patterns, enabled)` - Check if a single file should be ignored

## Project Files

Key files of the project (not including all files):

- `src/index.js` - Main CLI entry point
- `src/extract-png-from-fcstd.js` - Thumbnail extraction logic
- `src/isofit.FCMacro` - FreeCAD macro for isometric view and fit (used by `--fit` option)
- `tests/` - Unit tests for ignore functionality

## License

MIT
