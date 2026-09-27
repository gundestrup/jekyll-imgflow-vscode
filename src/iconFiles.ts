import * as fs from "node:fs";

// Icon packs are flat directories of *.svg files (the gem's custom adapter
// uses Dir.children, not a recursive scan).
export function collectIconNames(dir: string): string[] {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".svg"))
    .map((entry) => entry.name.slice(0, -".svg".length))
    .sort((a, b) => a.localeCompare(b));
}
