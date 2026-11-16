import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "README.md");
const outputPath = resolve(root, ".vsix-readme", "README.md");
const officialBadge = /<img src="https:\/\/devin\.ai\/assets\/askdeepwiki\.png"[^>]*\/>/;
const packageBadge = "![Ask DeepWiki](https://img.shields.io/badge/Ask%20DeepWiki-DeepWiki-5b21b6)";

const readme = await readFile(sourcePath, "utf8");
const packageReadme = readme
  .replace(officialBadge, packageBadge)
  .replace(
    /<a href="https:\/\/gundestrup\.github\.io\/flow\/"><img[^>]*><\/a>/,
    "[Part of Flow software](https://gundestrup.github.io/flow/)",
  );

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, packageReadme);
