# Changelog

## [Unreleased]

## [0.2.2] - 2026-09-11

### Added

- SonarCloud quality gate badge to README
- `Gemfile.lock` for the `test/fixtures/jekyll-site` fixture (SonarCloud `text:S8568`)

### Changed

- Run `npm ci --ignore-scripts` in CI and publish workflows (SonarCloud `githubactions:S6505`)
- Pin the CI Semgrep install to `semgrep==1.176.1` with `--only-binary :all:` (SonarCloud `githubactions:S8541`, `githubactions:S8544`)
- Move `contents: write` permission from workflow level to the `publish` job (SonarCloud `githubactions:S8233`)

### Fixed

- Resolved 11 SonarCloud findings: locale-aware image sorting in `imageIndex.ts` (`typescript:S2871`), super-linear regex backtracking in `completionProvider.ts` (`typescript:S8786`), unpinned/scripted dependency installs and workflow-level write permission in GitHub Actions, and missing fixture lock file

## [0.2.1] - 2026-09-10

### Added

- Semgrep and CodeFactor badges to README
- `.codefactor.yml` scoping CodeFactor analysis to `src/**`
- `npm run semgrep` script for local Pro engine dry-run scans (`semgrep ci --dry-run`)
- `npm run semgrep:local` script for offline community edition scans with `.semgrep.yml`
- `npm run semgrep:publish` script to publish custom rules to the Semgrep App registry

### Changed

- Updated `eslint` to 10.10.0, `typescript-eslint` to 8.70.0, and `@types/node` to 26.5.1
- Pinned GitHub Actions to commit SHAs in `ci.yml` and `publish.yml` (`actions/checkout@3d3c42e`, `actions/setup-node@8207627`)
- Added 7-day cooldown to Dependabot configuration for both npm and github-actions ecosystems
- Excluded `.codefactor.yml` and `.semgrep.yml` from the VSIX package via `.vscodeignore`

### Fixed

- Resolved 13 Semgrep Pro findings: 2 Dependabot missing cooldown, 9 GitHub Actions mutable tag references, 2 non-literal RegExp in `documentsCompletionProvider.ts` (replaced dynamic `new RegExp` with pre-compiled regex literals)

## [0.2.0] - 2026-09-05

### Notes

- Version 0.1.4 was never published to Open VSX: its publish workflow was cancelled after the `integration (1.91.0)` job exceeded the 6-hour GitHub Actions timeout (the test runner hung after tests passed). The fixes intended for 0.1.4 — the `fast-uri` and `qs` advisory resolutions, the CHANGELOG publish gate, and the `npm outdated` CI step — are all included in this release.

### Added

- Document title autocomplete for `{% doc_link %}` and category autocomplete for `{% doc_category %}`
- Support for `jekyll-documents` roots, extensions, filename validation, path categories, and category mappings
- Path-based completion insertion for duplicate document titles and repeated category names supported by `jekyll-documents` 0.7.0

### Changed

- Reload autocomplete indexes and directory watchers when `_config.yml` or extension settings change
- Share recursive file collection and parsed Jekyll configuration across ImgFlow and Documents indexing
- Expand the VS Code integration fixture to declare both gems and cover root-level and deeply nested documents, overlapping and mapped categories, quoting, duplicate titles, filtering, and live file updates
- Typecheck all unit and integration tests through an editor-discoverable test TypeScript project

## [0.1.4] - 2026-09-03

### Added

- CHANGELOG gate in publish workflow — fails if `CHANGELOG.md` has no `## [<version>]` entry for the tagged version
- `npm outdated` as a non-blocking CI step to surface outdated dependencies

### Changed

- Aligned AGENTS.md header to the open convention with "Single source of truth" note
- Updated `js-yaml` to 5.4.1, ESLint to 10.9.1, `typescript-eslint` to 8.68.0, and transitive dependencies `fast-uri` to 3.1.7 and `qs` to 6.16.0
- Updated GitHub Actions to `actions/checkout@v7` and `actions/setup-node@v7`
- Pinned `@types/vscode` to 1.91.0 to match the minimum supported VS Code API

### Fixed

- Resolved high-severity `fast-uri` and moderate-severity `qs` dependency advisories

## [0.1.3] - 2026-08-18

### Added

- Official DeepWiki badge to README for automatic documentation refresh
- Generated sanitized README for VSIX packaging
- CI verification workflow for linting, dependency auditing, and packaging
- Weekly Dependabot checks for npm and GitHub Actions dependencies
- Automated Vitest coverage for configuration parsing, settings precedence, and image discovery
- VS Code integration tests via `@vscode/test-electron` against a fixture Jekyll workspace
- AGENTS.md with project notes for AI assistance
- README.devel.md documenting development, testing, and release processes

### Changed

- Extracted recursive image discovery into a separately testable module (`src/imageFiles.ts`)
- ESLint with `typescript-eslint` flat config for source linting
- Updated `engines.vscode` to `^1.91.0` and `@types/vscode` to `^1.91.0`
- Updated `js-yaml` to `^4.3.0`, `typescript` to `^6.0.3`, `@types/node` to `^26.x`
- CI uses `actions/checkout@v5`, `actions/setup-node@v6`, and Node 26

### Fixed

- Register one completion provider per language to prevent duplicate completion items
- Dispose of the text editor selection listener on extension deactivation
- Swallow rejected watcher refresh promises instead of emitting unhandled rejections

## [0.1.2] - 2026-08-18

### Added

- Extension icon and README logo
- README badges for Open VSX
- Open VSX publishing workflow and package homepage

### Changed

- Pointed installation and documentation to Open VSX registry

## [0.1.1] - 2026-08-18

### Added

- Selecting an image from the completion list now closes the opening quote
- Parameter and preset completions after the image path (width, format, quality, preset, etc.)

### Fixed

- Bundle `js-yaml` and `argparse` so the extension activates without a missing module error

## [0.1.0] - 2026-08-16

### Added

- Image filename autocomplete inside `{% imgflow %}` tags in Markdown and Liquid files
- Auto-discovery of `imgflow.originals` from `_config.yml`
- File system watcher that refreshes suggestions when images are added, removed, or renamed
- Configuration settings `jekyllImgFlow.originals` and `jekyllImgFlow.formats`
