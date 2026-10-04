# README TODO

## Add a Jekyll ImgFlow demo animation

Create a short animated demonstration for the README, inspired by the Ruby LSP Open VSX listing. The animation should show one complete workflow rather than every feature:

1. Open a Jekyll Markdown or Liquid file.
2. Type `{% imgflow`.
3. Show image filename completions appearing.
4. Select an image.
5. Show parameter or preset completions.
6. End with the completed tag.

Aim for a focused 10–15 second recording at approximately 1000–1200 pixels wide. Keep the cursor and completion list easy to see, avoid unnecessary desktop content, and use a clean fixture workspace.

## Suggested macOS tools

### Screen capture and editing

- **Screen Studio** — preferred for a polished product demo; provides cursor smoothing, zooms, pans, trimming, and clean export.
- **CleanShot X** — convenient capture and basic editing on macOS.
- **OBS Studio** — free and flexible; useful when precise capture settings or a larger recording setup is needed.
- **Kap** — lightweight option for a simple screen recording.

### GIF conversion and optimization

- **gifski** — preferred for high-quality conversion from a recording to GIF.
- **Gifox** or **ezGIF** — GUI alternatives for conversion and optimization.
- **gifsicle** — command-line optimization for reducing GIF size.
- **ImageOptim** — optional final image optimization on macOS.
- **ffmpeg** — useful for trimming, resizing, changing frame rate, or converting the source recording before GIF creation.

Example command-line workflow:

```bash
ffmpeg -i recording.mp4 \
  -vf "fps=12,scale=1200:-1:flags=lanczos" \
  -c:v libx264 demo.mp4

gifski --fps 12 --width 1200 demo.mp4 -o images/jekyll-imgflow-demo.gif

gifsicle --optimize=3 --colors 256 \
  images/jekyll-imgflow-demo.gif \
  -o images/jekyll-imgflow-demo-optimized.gif
```

Use the optimized GIF in `README.md`:

```markdown
![Jekyll ImgFlow demo](images/jekyll-imgflow-demo.gif)
```

Prefer GIF for broad GitHub and Open VSX README compatibility. Before release, verify that the image renders correctly on GitHub and Open VSX and that the final file size is reasonable. Do not add the source recording unless it is intentionally needed for future editing.

## Extension identity — OPEN

This extension is published as `jekyll-imgflow-vscode` but now provides both
ImgFlow image completions and `jekyll-documents` completions (`doc_link`,
`doc_category`, nested categories, duplicate disambiguation, exact `path:`
insertion). The current name no longer reflects the supported feature set.

Options under consideration:

1. **Keep the current name** and document the dual role in the README.
   - Pros: no republish/migration churn; existing users keep updating.
   - Cons: name is misleading for new users looking for document support.
2. **Rename the extension** to a general Jekyll authoring companion
   (e.g. `jekyll-companion`, `jekyll-authoring`).
   - Pros: name reflects actual scope; clearer discovery on Open VSX.
   - Cons: requires a new extension ID, migration notes, and a final release
     under the old ID pointing users to the new one. Open VSX does not allow
     redirecting or overwriting published IDs.
3. **Publish a second extension** under the new name and keep
   `jekyll-imgflow-vscode` as an alias/bridge release that points users to
   the new one.
   - Pros: gradual migration; both names discoverable for a transition period.
   - Cons: two extensions to maintain during the transition; possible user
     confusion about which to install.

No rename has been performed yet. The decision is mirrored in
`jekyll-documents/README.todo.md`.

## Shared contract fixtures — OPEN

This extension mirrors observable behavior from two Ruby gems:

- `jekyll-imgflow` — image discovery, ImgFlow tag syntax, image paths.
- `jekyll-documents` — document filename parsing, `source_path`,
  `category_path`, `category_map`, duplicate disambiguation, exact `path:`
  insertion.

To avoid drift without coupling the extension to the Ruby gems at runtime,
each Ruby gem owns a small, versioned contract fixture set for the behavior
it defines, and this extension pins/copies the relevant fixtures into its own
test tree.

### Ownership model

```text
jekyll-documents (separate repo)
  spec/fixtures/contracts/document-autocomplete/v1/
    basic-documents.yml
    nested-categories.yml
    duplicate-titles.yml
    duplicate-categories.yml
    root-documents.yml
    category-mappings.yml
    path-normalization.yml

jekyll-imgflow (separate repo)
  spec/fixtures/contracts/image-tags/v1/
    ...

jekyll-imgflow-vscode (this repo)
  test/fixtures/jekyll-documents-contract/v1/   # pinned copy
  test/fixtures/jekyll-imgflow-contract/v1/     # pinned copy
  test/fixtures/jekyll-site/                    # combined integration site
```

The combined `jekyll-site/` fixture is owned here because this is the only
project that exercises ImgFlow and Documents together in one workspace. It
should contain a realistic site with `_config.yml`, `assets/images/originals/`,
and `assets/documents/` (including nested and duplicate-title cases), and the
integration tests should verify that both completion providers work in the
same Markdown/Liquid file without interfering with each other.

### Fixture scope

The pinned document-identity fixtures should cover only authoring-visible
behavior (filename parsing, paths, categories, duplicates, `path:` insertion).
They should NOT duplicate PDF extraction, Jekyll rendering, permalink
implementation, or search engine internals.

### Versioning and consumption

- Each fixture set carries a version directory (`v1/`).
- This extension records the source commit/gem version it pins to (for
  example in a `SOURCE.md` next to the copied fixtures).
- Fixtures are copied into this repo's test tree so tests run offline and
  reproducibly — no network fetch during every CI run.
- A future sync script (`npm run sync:jekyll-documents-contract`,
  `npm run sync:jekyll-imgflow-contract`) may automate copying, but is not
  required initially.
- Fixture/schema changes are treated as compatibility changes and updated
  through explicit pull requests in this repo.

### Why not a single shared fixture repository now

A neutral `jekyll-contract-fixtures` repository would add a fourth release
process, another versioning system, cross-repository coordination, and more
CI complexity. It becomes worthwhile only when multiple external consumers
actually need the same fixtures. Until then, each Ruby gem owns its contract
and this extension pins copies.

### Why not live-link fixtures

A live branch dependency or per-run network download would make tests
non-reproducible, dependent on GitHub/network availability, vulnerable to
unexpected fixture changes, and hard to correlate with a released gem version.
