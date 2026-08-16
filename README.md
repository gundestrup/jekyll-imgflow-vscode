# Jekyll ImgFlow — VS Code companion

[![Version](https://img.shields.io/visual-studio-marketplace/v/gundestrup.jekyll-imgflow)](https://marketplace.visualstudio.com/items?itemName=gundestrup.jekyll-imgflow)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/gundestrup.jekyll-imgflow)](https://marketplace.visualstudio.com/items?itemName=gundestrup.jekyll-imgflow)
[![License](https://img.shields.io/github/license/gundestrup/jekyll-imgflow-vscode)](LICENSE)

A Visual Studio Code companion for [jekyll-imgflow](https://github.com/gundestrup/jekyll-imgflow). It provides image filename autocomplete inside `{% imgflow %}` Liquid tags in Markdown and Liquid files.

## Features

- Auto-discovers the `imgflow.originals` path from `_config.yml`
- Suggests image names as you type `{% imgflow ` ...
- Watches the originals directory for new, deleted, or renamed files
- Works alongside any Liquid/Jekyll syntax extension

## Usage

```liquid
{% imgflow photo.jpg resize width:800 %}
```

Place the cursor after `{% imgflow ` and VS Code will suggest available image names from your `imgflow.originals` directory.

## Configuration

| Setting | Description |
|---|---|
| `jekyllImgFlow.originals` | Override the `imgflow.originals` directory. Can be a string or an array of strings. |
| `jekyllImgFlow.formats` | File extensions to include in suggestions. |

## Requirements

- A Jekyll site using [jekyll-imgflow](https://github.com/gundestrup/jekyll-imgflow)
- `_config.yml` containing an `imgflow:` block with `originals:`

## License

AGPL-3.0-or-later — see [LICENSE](LICENSE).
