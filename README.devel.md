# Jekyll ImgFlow VS Code: Development Guide

## Prerequisites

- Node.js 26
- VS Code 1.91 or newer

```bash
npm ci
```

## Development

```bash
npm run compile   # build once
npm run watch     # rebuild on save
```

Source is in `src/`, compiled output in `out/`. Press `F5` in VS Code to launch an Extension Development Host for manual testing against a Jekyll workspace.

## Verification

```bash
npm run verify              # lint + unit tests + audit
npm run test:integration    # VS Code integration tests (downloads VS Code 1.91.0)
```

Integration tests run against a fixture workspace in `test/fixtures/jekyll-site/`. Override the VS Code version with `VSCODE_VERSION=stable npm run test:integration`.

## Packaging

```bash
npm run package
```

Produces `jekyll-imgflow-<version>.vsix`. The DeepWiki SVG badge is stripped from the packaged README because `vsce` rejects SVG URLs.

Install locally:

```bash
code --install-extension jekyll-imgflow-<version>.vsix
```

## Release

The extension is published to Open VSX, not the VS Code Marketplace.

1. Update `CHANGELOG.md`: move entries from `[Unreleased]` to a new `[<version>] - <date>` section.

2. Commit all changes:

   ```bash
   git add -A
   git commit -m "Description of changes"
   ```

3. Verify:

   ```bash
   npm run verify
   npm run test:integration
   npm run package
   ```

4. Bump the version, commit, and tag in one step:

   ```bash
   npm version patch -m "Release v%s"
   ```

   Use `npm version minor` or `npm version major` for larger changes.

5. Push the commit and tag:

   ```bash
   git push origin main --follow-tags
   ```

Pushing a `v*` tag triggers `.github/workflows/publish.yml`. It runs integration tests, verifies and packages the extension, creates the GitHub release, and publishes to Open VSX. No manual GitHub release or VSIX attachment is needed. The workflow needs an `OVSX_PAT` repository secret.

Open VSX versions cannot be overwritten. Each release needs a new version number.
