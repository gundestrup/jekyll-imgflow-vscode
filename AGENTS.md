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
- Unit tests with coverage: `npm run test:coverage` (v8 coverage; writes `coverage/cobertura-coverage.xml`)
- Integration tests: `npm run test:integration` (VS Code Extension Development Host via `@vscode/test-electron`)
- Integration tests with coverage: `npm run test:integration:coverage` (captures V8 coverage from the extension host via `NODE_V8_COVERAGE`, remaps to `src/` with `c8`, writes `coverage/integration/cobertura-coverage.xml`)
- Dependency audit: `npm run audit` (fails on high or critical advisories)
- Full pre-release verification: `npm run verify` (lint, unit tests, and dependency audit)
- Produce VSIX: `npm run package` (generates a sanitized README, compiles, then runs `vsce package`)

## Release and Publish

- The project targets the **Open VSX** registry, not the VS Code: Marketplace.
- Release a new version by first staging all changes and committing them, then running `npm version patch -m "Release v<version>"` which atomically bumps `package.json` and `package-lock.json`, creates a release commit, and tags it. Update `CHANGELOG.md` (move entries from `[Unreleased]` to a new versioned section) before the staging commit. Run `npm run verify` and `npm run test:integration` before committing. Push with `git push origin main --tags`; pushing the `v*` tag triggers the publish workflow below — do not create the GitHub release manually.
- Pull requests and pushes to `main` run `.github/workflows/ci.yml`, which verifies source quality, runs unit tests, audits dependencies, packages the extension, and runs VS Code integration tests against the minimum and current stable VS Code versions. The `verify` job uploads unit-test coverage and the `integration` job uploads extension-host coverage to Codecov (OIDC via `id-token: write`, `CODECOV_TOKEN` secret as fallback); Codecov merges both reports, and thresholds live in `codecov.yml`. CI also runs a non-blocking `npm outdated` check after verification to surface outdated dependencies without failing the build.
- Dependabot checks npm and GitHub Actions dependencies weekly via `.github/dependabot.yml`.
- Pushing a `v*` tag triggers `.github/workflows/publish.yml`, which re-runs the VS Code integration matrix and verification, packages the extension, creates the GitHub release from the tag (idempotent — safe if it already exists), and publishes to Open VSX. The publish workflow gates publishing on a CHANGELOG entry: it verifies that `CHANGELOG.md` contains a `## [<version>]` section matching the tagged version (without the leading `v`) before publishing to Open VSX.
- The workflow expects a GitHub repository secret named `OVSX_PAT`.
- Open VSX does not allow overwriting published versions; each release needs a new version number.

## Project Layout

- `src/`: TypeScript source files
- `test/`: Unit (Vitest) and integration (`@vscode/test-electron` harness + fixture) tests
- `out/`: Compiled JavaScript output
- `images/`: Extension icon (`icon.png`) and README logo (`logo.png`)
- `scripts/`: `prepare-vsix-readme.mjs` packaging transform and `hooks/` git hooks
- `package.json`: Extension manifest and configuration
- `tsconfig.json` / `tsconfig.test.json`: Source config (emits `src/` → `out/`) and test config (emits `test/` → `out/test/`); `test/tsconfig.json` is typecheck-only
- `vitest.config.mts`: Vitest + v8 → cobertura coverage
- `eslint.config.mjs`: typescript-eslint flat config
- `codecov.yml`: Codecov coverage thresholds
- `.semgrep.yml`: Local Semgrep rules mirroring the App Policies page
- `.codefactor.yml`: CodeFactor ratings scope and exclusions
- `.sonarcloud.properties`: SonarCloud AutoScan configuration (classifies `test/` as test code)
- `.vscodeignore`: Controls what is bundled into the VSIX
- `.npmrc`: `min-release-age=7` — only install dependency versions published at least 7 days ago
- `.devin/config.json`: Devin CLI project permissions (allow-listed commands)

## Key Dependencies

- `js-yaml`: Bundled for parsing `_config.yml`
- `@types/vscode` (dev): Exact pin matching the `engines.vscode` minimum (`1.91.0`); bump only when intentionally raising the supported VS Code floor
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
- Avoid floating/unpinned versions (`latest`, `*`) for CI and new package installs; prefer versions that are at least a week old to avoid freshly-published, unvetted releases. `.npmrc` enforces this via `min-release-age=7` for `npm install` (the lockfile via `npm ci` is unaffected); dependabot applies the same cooldown to update PRs.
- A git pre-commit hook lives at `scripts/hooks/pre-commit` and runs `npm run lint` plus `npm test`. Enable it once after cloning with `git config core.hooksPath scripts/hooks`; bypass temporarily with `git commit --no-verify`.
- `js-yaml` bundles its own TypeScript types — do not add `@types/js-yaml`.
