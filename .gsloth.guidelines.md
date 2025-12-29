# Development Guidelines - FreeCAD Preview Extractor

## Project Overview

This is a Node.js CLI tool that extracts preview thumbnails from FreeCAD (.FCStd) files. FreeCAD files are ZIP archives containing a `thumbnails/Thumbnail.png` file, which this tool extracts and saves alongside the original file.

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Main Dependencies**:
  - `yauzl` - ZIP file parsing
  - `glob` - File pattern matching
  - `mkdirp` - Directory creation utilities

## Code Style & Conventions

### General Principles
- Use ES modules (`import`/`export`) syntax
- Use async/await for asynchronous operations
- Use descriptive variable names
- Keep functions focused and single-purpose
- Handle errors gracefully with try-catch blocks

### File Naming
- Use kebab-case for file names: `extract-png-from-fcstd.js`
- Main entry point: `index.js`

### Console Output
Use emoji indicators for user feedback:
- ✅ for success messages
- ❌ for errors
- ⚠️ for warnings
- 🔍 for informational messages

### Error Handling
- Always catch and log errors with meaningful messages
- Include file names in error messages for context
- Don't crash on individual file errors when processing multiple files
- Exit with proper exit codes (0 for success, 1 for errors)

## Code Structure

### Main Entry Point (`index.js`)
- Shebang for CLI execution: `#!/usr/bin/env node`
- Handle both single file and batch processing modes
- Process command line arguments
- Provide clear feedback on operations

### Core Functionality (`extract-png-from-fcstd.js`)
- Export reusable functions for library usage
- Handle ZIP operations with yauzl
- Manage file I/O operations
- Create output directories as needed

## CLI Interface

### Commands
- `fcxtc` or `freecad-preview-extractor` - Process all .FCStd files in current directory recursively
- `fcxtc <file>` - Process a single specific file

### Output
- Preview images saved as `{original-name}-preview.png` in the same directory as source file
- Case-insensitive file matching (**.FCStd, **.fcstd, etc.)

## Testing Approach

When testing or debugging:
1. Test with single files first before running batch operations
2. Verify file existence and extension before processing
3. Check for thumbnail existence in ZIP archive
4. Ensure output directories are created
5. Validate error handling with malformed or missing files

## Future Enhancements (Documented in README)

The project has a known limitation: it only extracts existing previews. A better approach would be:
- Use FreeCAD Python API to programmatically generate previews
- Switch model to isometric view before capturing
- Generate consistent preview images even if none exist

## Dependencies Management

- Use `npm ci` for clean installs (reproducible builds)
- Keep dependencies minimal and focused
- Only include production dependencies in `dependencies`

## Installation & Distribution

- Global installation supported via `npm install -g`
- Binary commands configured in package.json `bin` field
- MIT licensed, open source project

## Project Files

### Core Files
- `index.js` - CLI entry point and batch processing
- `extract-png-from-fcstd.js` - Core extraction logic
- `package.json` - Project metadata and dependencies

### Documentation
- `README.md` - User-facing documentation
- `LICENSE` - MIT license

### FreeCAD Files (Examples/Tests)
- `*.FCStd` - FreeCAD document files
- `*.FCMacro` - FreeCAD macro files

### Development
- `.gitignore` - Git exclusions
- `.gsloth.config.json` - AI assistant configuration
- `.gsloth.guidelines.md` - This file

## Contribution Guidelines

When modifying code:
1. Maintain existing code style and emoji conventions
2. Test with actual FreeCAD files before committing
3. Update README.md if CLI interface changes
4. Ensure error messages are clear and actionable
5. Keep the tool simple and focused on its core purpose
