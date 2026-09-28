import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { IconFlowConfig } from "./config";
import { collectIconNames } from "./iconFiles";
import { BUNDLED_PACK_ICONS } from "./iconPackNames";

const BUNDLED_PACKS = ["lucide", "simple"];
const GEM_NAME = "jekyll-icon-flow";

export class IconIndex {
  private icons: Record<string, string[]> = {};
  private config: IconFlowConfig | null = null;
  // undefined = not resolved yet; null = resolution failed
  private gemRoot: string | null | undefined;

  constructor(private readonly workspaceRoot: string) {}

  refresh(config: IconFlowConfig): void {
    this.config = config;
    const packs: Record<string, string[]> = {};

    for (const pack of BUNDLED_PACKS) {
      const dir = this.findPackDir(pack);
      packs[pack] = dir ? collectIconNames(dir) : (BUNDLED_PACK_ICONS[pack] ?? []);
    }
    const customDir = path.isAbsolute(config.customDir)
      ? config.customDir
      : path.join(this.workspaceRoot, config.customDir);
    packs.custom = collectIconNames(customDir);

    for (const [name, dir] of Object.entries(config.packs)) {
      const resolved = path.isAbsolute(dir) ? dir : path.join(this.workspaceRoot, dir);
      packs[name] = collectIconNames(resolved);
    }

    this.icons = packs;
  }

  getIcons(pack: string): string[] {
    return this.icons[pack] ?? [];
  }

  // Packs the generic {% icon %} tag resolves, in order: a configured
  // icon_flow.pack pins to that pack only; otherwise the search chain.
  getSearchPacks(): string[] {
    if (!this.config) {
      return [];
    }
    return this.config.pack ? [this.config.pack] : this.config.search;
  }

  // Every pack name the site could reference, for pack: completions
  getPackNames(): string[] {
    return [...BUNDLED_PACKS, "custom", ...Object.keys(this.config?.packs ?? {})];
  }

  getRegistry(): Record<string, string> {
    return this.config?.registry ?? {};
  }

  getConfig(): IconFlowConfig | null {
    return this.config;
  }

  private findPackDir(pack: string): string | null {
    // The workspace itself may be the gem repo or a site vendoring it
    const candidates = [
      path.join(this.workspaceRoot, "assets", "icons", pack),
      path.join(this.findVendoredGem() ?? "", "assets", "icons", pack),
      path.join(this.resolveGemRoot() ?? "", "assets", "icons", pack),
    ];
    return candidates.find((candidate) => isDirectory(candidate)) ?? null;
  }

  private findVendoredGem(): string | null {
    return findDirNamed(path.join(this.workspaceRoot, "vendor", "bundle"), GEM_NAME, 5);
  }

  private resolveGemRoot(): string | null {
    if (this.gemRoot !== undefined) {
      return this.gemRoot;
    }
    try {
      const output = execFileSync("bundle", ["show", "jekyll-icon-flow"], {
        cwd: this.workspaceRoot,
        encoding: "utf8",
        timeout: 5000,
        stdio: ["ignore", "pipe", "ignore"],
      });
      this.gemRoot = output.trim() || null;
    } catch {
      this.gemRoot = null;
    }
    return this.gemRoot;
  }
}

function isDirectory(candidate: string): boolean {
  return candidate.length > 0 && fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
}

function findDirNamed(root: string, name: string, depth: number): string | null {
  if (depth < 0 || !isDirectory(root)) {
    return null;
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const fullPath = path.join(root, entry.name);
    if (entry.name === name || entry.name.startsWith(`${name}-`)) {
      return fullPath;
    }
    const nested = findDirNamed(fullPath, name, depth - 1);
    if (nested) {
      return nested;
    }
  }
  return null;
}
