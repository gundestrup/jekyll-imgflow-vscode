# AGENTS.md — jekyll-imgflow-vscode

> **Single source of truth for all coding agents working on this project.**

## Build and Package

- Compile TypeScript: `npm run compile`
- Watch builds: `npm run watch`
- Lint and typecheck: `npm run lint` (compile source, typecheck tests, plus ESLint)
- Typecheck only: `npm run lint:types` (source and tests)
- Test typecheck only: `npm run lint:tests`
- ESLint only: `npm run lint:eslint` (source and tests)
- Unit tests: `npm test` (Vitest)
- Integration tests: `npm run test:integration` (VS Code Extension Development Host via `@vscode/test-electron`)
- Dependency audit: `npm run audit` (fails on high or critical advisories)
- Full pre-release verification: `npm run verify` (lint plus dependency audit)
- Produce VSIX: `npm run package` (generates a sanitized README, compiles, then runs `vsce package`)

## Release and Publish

- The project targets the **Open VSX** registry, not the VS Code: Marketplace.
- Release a new version by first staging all changes and committing them, then running `npm version patch -m "Release v<version>"` which atomically bumps `package.json` and `package-lock.json`, creates a release commit, and tags it. Update `CHANGELOG.md` (move entries from `[Unreleased]` to a new versioned section) before the staging commit. Run `npm run verify` and `npm run test:integration` before committing. Push with `git push origin main --tags`, then create a GitHub release from the tag.
- Pull requests and pushes to `main` run `.github/workflows/ci.yml`, which verifies source quality, runs unit tests, audits dependencies, packages the extension, and runs VS Code integration tests against the minimum and current stable VS Code versions. CI also runs a non-blocking `npm outdated` check after verification to surface outdated dependencies without failing the build.
- Dependabot checks npm and GitHub Actions dependencies weekly via `.github/dependabot.yml`.
- Creating a GitHub release triggers `.github/workflows/publish.yml`, which repeats verification, packages, and publishes to Open VSX. The publish workflow gates publishing on a CHANGELOG entry: it verifies that `CHANGELOG.md` contains a `## [<version>]` section matching the tagged version (without the leading `v`) before publishing to Open VSX.
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

- CI uses the current Node.js 26 release with `actions/setup-node@v6`; local development should use Node.js 26 as well.
- `npm run lint` runs both TypeScript compilation and ESLint; `npm run lint:types` runs the TypeScript check alone.
- `package-lock.json` is not typically included in the VSIX; `node_modules` is bundled because the extension needs `js-yaml`.
- `.github/` and other development files are excluded from the VSIX by `.vscodeignore`.
- `README.md` retains the official DeepWiki SVG badge for automatic refresh. `npm run package` generates a sanitized README under `.vsix-readme/` because `vsce` rejects SVG URLs in packaged READMEs.
- `scripts/prepare-vsix-readme.mjs` is the single packaging transformation; do not maintain a second committed README.
- Always use best practices and, when possible, the newest stable version of dependencies.
- Avoid floating/unpinned versions (`latest`, `*`) for CI and new package installs; prefer versions that are at least a week old to avoid freshly-published, unvetted releases.
