# Jekyll ImgFlow VS Code: Development Guide

This document describes local development, verification, packaging, and release procedures for the Jekyll ImgFlow VS Code extension.

## Prerequisites

- Node.js 26
- npm
- VS Code 1.91 or newer

Install the locked dependencies from the repository root:

```bash
npm ci
```

## Development

Compile the TypeScript source once:

```bash
npm run compile
```

Watch for source changes and rebuild automatically:

```bash
npm run watch
```

The extension source is in `src/`. Compiled JavaScript is written to `out/` and should not be edited directly.

For interactive extension-host testing, open the repository in VS Code and press `F5`. This starts a separate Extension Development Host window. Open a Jekyll workspace containing `_config.yml` and an `imgflow.originals` directory, then test completion in a Markdown or `.liquid` file:

```liquid
{% imgflow photo
```

The completion provider should suggest matching image files. Test parameter completion after an image path as well:

```liquid
{% imgflow photo.jpg width:
```

Also verify that adding, deleting, renaming, and moving image files refreshes the suggestions.

## Verification

Run the full development checks before packaging:

```bash
npm run verify
```

This runs TypeScript compilation, ESLint, the Vitest unit tests, and `npm audit` with high-severity advisories treated as failures. Dependabot also checks npm and GitHub Actions dependencies weekly and opens update pull requests. The individual checks are also available:

```bash
npm run lint:types
npm run lint:eslint
npm test
npm run test:integration
```

Unit tests cover `_config.yml` parsing, setting precedence, default paths, extension filtering, and recursive image-file discovery. Integration tests run inside a real VS Code instance via `@vscode/test-electron` against a fixture Jekyll workspace in `test/fixtures/jekyll-site/`. They verify extension activation, image filename completion in Markdown and Liquid files, nested image discovery, parameter completion after quoted image paths, quote-closing insertion, completion filtering by typed text, and the absence of duplicate completion items.

The default VS Code version for integration tests is 1.91.0 (the minimum supported version). CI runs the integration suite against both 1.91.0 and the current stable VS Code release. Override locally with:

```bash
VSCODE_VERSION=stable npm run test:integration
```

Integration tests cannot run in environments where `ELECTRON_RUN_AS_NODE=1` is set globally; the runner unsets it automatically.

## Packaging

Build the installable VSIX locally:

```bash
npm run package
```

Packaging performs these steps:

1. Generates `.vsix-readme/README.md` from `README.md`, replacing the DeepWiki SVG badge because `vsce` rejects SVG URLs in packaged READMEs.
2. Compiles the extension.
3. Creates `jekyll-imgflow-<version>.vsix` with `vsce`.

The generated directory and VSIX files are ignored by Git. Inspect the package contents if needed:

```bash
npx vsce ls --tree
```

To install and test the local package, use VS Code's `Extensions: Install from VSIX...` command or:

```bash
code --install-extension jekyll-imgflow-<version>.vsix
```

## Release

The extension is published to Open VSX, not the VS Code Marketplace.

1. Update the version in `package.json` and `package-lock.json` using npm, for example:

   ```bash
   npm version <new-version> --no-git-tag-version
   ```

2. Update `CHANGELOG.md` and user-facing documentation in `README.md`.
3. Run verification and packaging:

   ```bash
   npm ci
   npm run verify
   npm run package
   ```

4. Review the generated VSIX and Git diff.
5. Commit the release changes.
6. Push the commit to `main`.
7. Create a GitHub release with the matching tag, for example `v0.1.3`, and attach the generated VSIX:

   ```bash
   gh release create v<new-version> --title "Jekyll ImgFlow <new-version>" \
     --generate-notes jekyll-imgflow-<new-version>.vsix
   ```

Publishing the GitHub release triggers `.github/workflows/publish.yml`. The workflow checks out the release commit, installs dependencies with Node 26, packages the extension, and publishes it to Open VSX with `ovsx`.

The workflow requires the repository secret `OVSX_PAT`, containing an Open VSX personal access token. Add it under GitHub repository settings at **Secrets and variables → Actions**. Never place the token in source files, workflow YAML, commit messages, or logs.

Open VSX versions cannot be overwritten. Every published release must use a new version number.

## Documentation Sources

- `README.md` is the canonical project README and includes the official DeepWiki badge for automatic refresh.
- `AGENTS.md` contains concise instructions for AI coding agents.
- `README.devel.md` contains the detailed human developer workflow.
