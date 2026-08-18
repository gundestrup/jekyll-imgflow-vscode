# AI / Agent Notes for Jekyll ImgFlow VS Code: Extension

## Build and Package

- Compile TypeScript: `npm run compile`
- Watch builds: `npm run watch`
- Lint/typecheck: `npm run lint` (`tsc --noEmit`)
- Produce VSIX: `npm run package` (runs `vsce package`)

## Release and Publish

- The project targets the **Open VSX** registry, not the VS Code: Marketplace.
- Release a new version by bumping `package.json`, updating `CHANGELOG.md` and `README.md` (if needed), committing, and creating a GitHub release.
- Creating a GitHub release triggers `.github/workflows/publish.yml`, which packages and publishes to Open VSX.
- The workflow expects a GitHub repository secret named `OVSX_PAT`.
- Open VSX does not allow overwriting published versions; each release needs a new version number.

## Project Layout

- `src/`: TypeScript source files
- `out/`: Compiled JavaScript output
- `images/`: Extension icon (`icon.png`) and README logo (`logo.png`)
- `package.json`: Extension manifest and configuration
- `.vscodeignore`: Controls what is bundled into the VSIX

## Key Dependencies

- `js-yaml`: Bundled for parsing `_config.yml`
- `vsce` (dev): Packages the extension
- `ovsx` (used in CI): Publishes to Open VSX

## Notes

- `package-lock.json` is not typically included in the VSIX; `node_modules` is bundled because the extension needs `js-yaml`.
- `.github/` and other development files are excluded from the VSIX by `.vscodeignore`.
