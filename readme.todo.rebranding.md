# Rebranding: Jekyll ImgFlow → Jekyll TagTools

Analysis only — no code changed. Covers the extension rename, the repo rename to
`Jekyll-TagTools-vscode`, and how to migrate/inform existing users.

## 1. Two namespaces — only one gets renamed

**Must NOT change** (these belong to the upstream Jekyll plugins, not the extension):

- `{% imgflow %}` Liquid tag — regexes in `src/completionProvider.ts`, `IMG_TAG_PATTERN`
  in `src/extension.ts`, test fixture documents
- `imgflow:` config key inside `_config.yml` — parsed in `src/config.ts` (`config.imgflow`)
- Gem/plugin names `jekyll-imgflow`, `jekyll-documents` — fixture `Gemfile`, `_config.yml`
  `plugins:` list, README links to the plugin repos
- Internal identifiers named after the tag (`ImgflowCompletionProvider`, `imgflowConfig`)
  are still accurate — renaming them is optional cosmetic work

**What the rename covers** (extension identity):

- `package.json` `name` (`jekyll-imgflow` → `jekyll-tagtools`) — the Open VSX extension ID
- `displayName` (`Jekyll ImgFlow` → `Jekyll TagTools`)
- Settings section `jekyllImgFlow.*` → `jekyllTagTools.*`
- User-visible strings: `[Jekyll ImgFlow]` log prefixes, status bar `ImgFlow` text/tooltip,
  error messages (note: `workspaceIndexes.ts` already logs `[Jekyll Autocomplete]` — the
  codebase is already drifting toward a generic name)
- Repo name, docs, badges, artwork (`images/logo.png` literally contains "jekyll-imgflow"
  text and "IMAGE OPTIMIZATION FOR JEKYLL" — needs redesign, not just a rename)

## 2. Can users be migrated automatically? — The hard truth

**No.** On Open VSX the extension ID (`publisher.name`) is immutable:

- No rename, no alias, no redirect, no deprecation flag on listings
- `gundestrup/jekyll-imgflow` stays published forever with its install history
- `gundestrup/jekyll-tagtools` starts as a brand-new listing at zero installs
- Installed users are never auto-moved; their editor keeps updating the OLD listing only

So "migration" = making the old listing point users at the new one. There are three
mechanisms, best used together:

### A. Final "pointer" release under the old name (recommended, low effort)

Publish one last `jekyll-imgflow` version (e.g. `0.2.3`) that:

1. Sets `displayName` to `Jekyll ImgFlow (renamed → Jekyll TagTools)` — every user sees it
   in their Extensions view
2. Rewrites the packaged README/description to say the extension moved, with a link to
   `https://open-vsx.org/extension/gundestrup/jekyll-tagtools`
3. Shows a one-time activation notice:

   ```ts
   const choice = await vscode.window.showInformationMessage(
     "Jekyll ImgFlow is now Jekyll TagTools. Install the renamed extension to keep getting updates.",
     "Install Jekyll TagTools",
     "Don't show again"
   );
   if (choice === "Install Jekyll TagTools") {
     vscode.commands.executeCommand(
       "workbench.extensions.installExtension", "gundestrup.jekyll-tagtools"
     );
   }
   ```

   (Command is internal-but-stable, widely used; store dismissal in `context.globalState`.)

This release must ship BEFORE or ALONGSIDE the first `jekyll-tagtools` release — users
can't install what isn't published.

### B. "Alias" extension — dual-publish both names (possible, but has a catch)

You can keep publishing the same code under both IDs (build twice, swapping
`package.json` `name` before each `vsce package`). Users of either listing then get
updates — the closest thing to an alias.

The catch: if a user installs BOTH, both activate and produce duplicate completions.
Guard for it in the old build's `activate()`:

```ts
if (vscode.extensions.getExtension("gundestrup.jekyll-tagtools")) {
  // show migration notice once, then return early without registering providers
}
```

Practical approach: dual-publish for a transition window (e.g. 6 months or N releases),
with the old build carrying the nag + self-disable guard, then stop publishing the old
name. A `legacy/` branch holding the final `0.2.3` keeps this simple — no permanent
dual-build machinery needed.

### C. Settings migration (`jekyllImgFlow.*` → `jekyllTagTools.*`)

User `settings.json` values don't follow a rename. Options:

1. **Dual-read (recommended)**: contribute `jekyllTagTools.originals`/`.formats`, but in
   `workspaceIndexes.ts` read the new section first and fall back to `jekyllImgFlow.*`;
   watch `affectsConfiguration` for BOTH sections. ~10 lines, zero user breakage.
2. **One-time copy**: on activation, if new keys unset and old keys set, copy them via
   `configuration.update(...)` at the inspected target. Nice-to-have, not required.
3. **Do nothing**: users with overrides silently lose them — avoid.

### D. Alternative worth considering: display-name-only rename

Change `displayName` to `Jekyll TagTools` but keep `name: jekyll-imgflow`. Users see the
new brand everywhere; updates keep flowing; zero migration. Cost: the Open VSX URL and
extension ID still say `imgflow`. If install-base continuity matters more than URL
aesthetics, this is the zero-risk option. The full rename is cleaner long-term.

## 3. Repo rename: `jekyll-imgflow-vscode` → `Jekyll-TagTools-vscode`

- GitHub **auto-redirects** old web and git URLs indefinitely — this IS your repo "alias".
  Redirects break only if you create a NEW repo reusing the old name (optionally do that
  later as a stub README pointing to the new repo — but it ends the redirects).
- After renaming: `git remote set-url origin <new-url>` locally (optional; redirects work).
- Update `repository.url`, `bugs.url`, `homepage` in `package.json`.
- **SonarCloud**: project key `gundestrup_jekyll-imgflow-vscode` is fixed at import and
  survives the repo rename — badges keep working; just rename the display name in the UI.
  Re-importing as a new project would lose analysis history — don't.
- **Codecov / CodeFactor / DeepWiki**: all repo-path-based. Update badge URLs in README;
  Codecov usually re-syncs on next upload, CodeFactor/DeepWiki may need a manual
  re-add/re-index.
- **SonarCloud note**: new code in renamed files may count as "new code" — the quality
  gate applies to it.

## 4. Full checklist

### package.json
- [ ] `name`: `jekyll-tagtools` (lowercase-hyphen required by vsce)
- [ ] `displayName`: `Jekyll TagTools`
- [ ] `description`: e.g. "Autocomplete for Jekyll Liquid tags — jekyll-imgflow images, jekyll-documents references"
- [ ] `homepage` → `https://open-vsx.org/extension/gundestrup/jekyll-tagtools`
- [ ] `repository.url`, `bugs.url` → `Jekyll-TagTools-vscode`
- [ ] `keywords`: keep `jekyll`, `imgflow`, `documents`, `liquid`, `autocomplete`; add `tags`, `tagtools`
- [ ] `contributes.configuration.title` → `Jekyll TagTools`; keys → `jekyllTagTools.*`
- [ ] `package-lock.json` name fields (regenerate via `npm install`)

### src/
- [ ] `extension.ts`: log prefixes, error message, status bar text `TagTools` / `$(sync~spin) TagTools ready`, tooltip
- [ ] `workspaceIndexes.ts`: `getConfiguration`/`affectsConfiguration` → `jekyllTagTools` + `jekyllImgFlow` fallback
- [ ] Optional cosmetic: class/file names (`ImgflowCompletionProvider` can stay — it's the imgflow-tag provider)

### test/
- [ ] `integration/index.ts`: `getExtension("gundestrup.jekyll-tagtools")` ×3, `withWorkspaceSetting("jekyllTagTools", ...)`
- [ ] Cosmetic: `jekyll-imgflow-`/`jekyll-documents-` temp-dir prefixes

### CI/CD
- [ ] `publish.yml`: release title `"Jekyll TagTools ${version}"`, glob `jekyll-tagtools-*.vsix`
- [ ] `OVSX_PAT` secret unchanged (per-publisher, not per-extension)

### Artwork & docs
- [ ] `images/logo.png` + `images/icon.png` redesign (current logo says "jekyll-imgflow")
- [ ] README.md: title, ~20 references, Open VSX badges, settings table (`jekyllTagTools.*`), install commands
- [ ] README.devel.md, AGENTS.md header, `.semgrep.yml` comment, CHANGELOG.md entry
- [ ] Root `jekyll-imgflow-*.vsix` artifacts: leave or clean up

### Registry & release order
- [ ] 1. Publish `jekyll-imgflow` **0.2.3** (pointer release: renamed displayName, README pointer, activation nag, self-disable guard if `jekyll-tagtools` present)
- [ ] 2. Rename GitHub repo → `Jekyll-TagTools-vscode` (redirects automatic); update local remote
- [ ] 3. Apply full rename on `main`, verify (`npm run verify` + `npm run test:integration`)
- [ ] 4. Release `jekyll-tagtools` **0.3.0** (continue versioning — don't restart at 0.1.0; makes the lineage obvious and avoids confusion with dual-published builds)
- [ ] 5. Create GitHub release → publish.yml pushes new listing to Open VSX (CHANGELOG gate needs `## [0.3.0]`)
- [ ] 6. Optional: dual-publish old name during transition window (build legacy VSIX via a name-swap script), then stop
- [ ] 7. Update service display names (SonarCloud UI, Codecov/CodeFactor/DeepWiki as needed)

## 5. Risks

- **Lost install base**: unavoidable — new listing starts at zero; the pointer release +
  dual-publish window mitigates it.
- **Two copies installed**: guard in the old build prevents duplicate providers.
- **Settings silently lost**: dual-read prevents it.
- **Namespace squatting**: check `open-vsx.org/extension/gundestrup/jekyll-tagtools` is
  free BEFORE announcing.
- **Timing**: the pointer release must be live before (or with) the new listing, or the
  nag links to a 404.
