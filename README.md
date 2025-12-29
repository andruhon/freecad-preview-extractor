file:///home/parents/Documents/freecad-preview-extractor/isofit.FCMacro# FreeCAD preview extractor

A little script extracting previews from all FreeCAD files in current directory recursively.

This is just a rough implementation with NodeJS, which extracts existing preview images.

The same thing should be achievable with FreeCAD python script in a better way:  
Idealy model should be switched to isometric view and then picture should be saved, maybe one day I will build this thing.

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
