# Release HOWTO

## Pre-release Checks

### Dry Run
Verify strictly what files will be included in the package:

```bash
npm publish --dry-run
```

### Review Changes
Good habit is to ask Gaunt Sloth to review changes before releasing them. 
Compare HEAD against the latest tag:

```bash
git --no-pager diff $(git describe --tags --abbrev=0)..HEAD | gth review
```

## Creating npm version

Make sure `npm config set git-tag-version true` is set (default).

> **Important**: The `files` block of `package.json` strictly controls what is actually released. If `files` is present, it acts as an allowlist, and `.npmignore` is effectively ignored for file inclusion (though still used for some other tools).

### Patch Release
(e.g., from 0.0.8 to 0.0.9)

```bash
npm version patch -m "Release %s"
git push --follow-tags
```

### Minor Release
(e.g., from 0.0.8 to 0.1.0)

```bash
npm version minor -m "Release %s"
git push --follow-tags
```

## Publish Release to GitHub

Note the release version from previous step and do:

(if you have multiple accounts in gh, you may need to do `gh auth switch`)

```bash
gh release create --generate-notes
```

Or manually:

```bash
gh release create v0.1.0 --notes "Release notes here"
```

## Publish to NPM

```bash
npm login
npm publish
```

## Viewing diff side by side

Configure KDE diff Kompare as github difftool:

```bash
# Configure default git diff tool
git config --global diff.tool kompare
# Compare all changed files against previous tag
git difftool $(git describe --tags --abbrev=0) HEAD -d
```

Configure vimdiff:

```bash
# Configure default git diff tool
git config --global diff.tool vimdiff
# Compare changed files one by one
git difftool $(git describe --tags --abbrev=0) HEAD
```

## Cleaning up the mess

If something went wrong, delete incidental remote and local tag:

```bash
git tag -d v0.3.0
git push --delete origin v0.3.0
```
