# FreeCAD preview extractor

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
```bash
fcxtc
```

or 

```bash
freecad-preview-extractor
```