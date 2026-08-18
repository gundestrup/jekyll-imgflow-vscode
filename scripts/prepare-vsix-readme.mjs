import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "README.md");
const outputPath = resolve(root, ".vsix-readme", "README.md");
const officialBadge = "https://deepwiki.com/badge.svg";
const packageBadge = "https://img.shields.io/badge/Ask%20DeepWiki-DeepWiki-5b21b6";

const readme = await readFile(sourcePath, "utf8");
const packageReadme = readme.replaceAll(officialBadge, packageBadge);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, packageReadme);
