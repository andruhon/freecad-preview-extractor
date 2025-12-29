# FreeCAD preview extractor

A CLI tool for extracting and generating preview thumbnails from FreeCAD files.

## Features

- **Extract existing previews**: Quickly extract embedded thumbnail images from `.FCStd` files
- **Generate new previews**: Use FreeCAD to create fresh previews with isometric view and fit-to-view
- **Batch processing**: Process all FreeCAD files in a directory recursively
- **Single file mode**: Extract or generate previews for specific files

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
```bash
fcxtc --fit
```

or for a specific file:

```bash
fcxtc --fit filename.FCStd
```

The `--fit` option will:
1. Open each FreeCAD file with FreeCAD
2. Run the `isofit.FCMacro` macro to set Isometric View and Fit All
3. Save the file with the updated preview
4. Extract the preview image as usual

**Note:** The `--fit` option requires:
- FreeCAD installed and available in your system PATH
- A desktop environment / X server (cannot run headless)
- UI access for FreeCAD to render the view
