# Changelog

## [Unreleased]

### Added
- CHANGELOG gate in publish workflow — fails if `CHANGELOG.md` has no `## [<version>]` entry for the tagged version
- `npm outdated` as a non-blocking CI step to surface outdated dependencies

### Changed
- Aligned AGENTS.md header to the open convention with "Single source of truth" note

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
