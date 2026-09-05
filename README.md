# Jekyll ImgFlow — VS Code companion

![Jekyll ImgFlow logo](images/logo.png)

[![Version](https://img.shields.io/open-vsx/v/gundestrup/jekyll-imgflow)](https://open-vsx.org/extension/gundestrup/jekyll-imgflow)
[![Installs](https://img.shields.io/open-vsx/dt/gundestrup/jekyll-imgflow)](https://open-vsx.org/extension/gundestrup/jekyll-imgflow)
[![License](https://img.shields.io/github/license/gundestrup/jekyll-imgflow-vscode)](LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/gundestrup/jekyll-imgflow-vscode)

A Visual Studio Code companion for [jekyll-imgflow](https://github.com/gundestrup/jekyll-imgflow) and [jekyll-documents](https://github.com/gundestrup/jekyll-documents). It provides autocomplete for ImgFlow images and document references inside Liquid tags in Markdown and Liquid files.

## Installation

Install from [Open VSX](https://open-vsx.org/extension/gundestrup/jekyll-imgflow) (for [VSCodium](https://vscodium.com/) or any Open VSX-compatible editor) or download the latest `.vsix` from [GitHub Releases](https://github.com/gundestrup/jekyll-imgflow-vscode/releases) and run:

```bash
code --install-extension jekyll-imgflow-0.1.4.vsix
```

## Features

- Auto-discovers ImgFlow and Documents paths from `_config.yml`
- Suggests image names as you type after an `{% imgflow %}` tag
- Suggests document titles in `{% doc_link %}` and mapped categories in `{% doc_category %}`
- Inserts exact `path:` references when duplicate document titles or category names need disambiguation
- Watches configured source directories and refreshes when files or configuration change
- Works alongside any Liquid/Jekyll syntax extension

## Usage

```liquid
{% imgflow photo.jpg resize width:800 %}
{% doc_link "Annual Report" %}
{% doc_category "minutes" %}
```

Place the cursor in the first argument of a supported tag. ImgFlow suggestions come from `imgflow.originals`; document titles and categories come from the configured `documents.root` source tree.

## Configuration

|Setting|Description|
|---|---|
| `jekyllImgFlow.originals` | Override the `imgflow.originals` directory. Can be a string or an array of strings. |
| `jekyllImgFlow.formats` | File extensions to include in suggestions. |

## Requirements

- A Jekyll site using [jekyll-imgflow](https://github.com/gundestrup/jekyll-imgflow), [jekyll-documents](https://github.com/gundestrup/jekyll-documents), or both
- An `_config.yml`; omitted plugin options use the gems' default source paths

## License

AGPL-3.0-or-later — see [LICENSE](LICENSE).
