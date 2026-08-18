# Changelog


## [Unreleased]

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
- Image filename autocomplete inside `{% imgflow ` tags in Markdown and Liquid files
- Auto-discovery of `imgflow.originals` from `_config.yml`
- File system watcher that refreshes suggestions when images are added, removed, or renamed
- Configuration settings `jekyllImgFlow.originals` and `jekyllImgFlow.formats`
