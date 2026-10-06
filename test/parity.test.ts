import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import { BUNDLED_PACK_ICONS } from "../src/iconPackNames";

// Parity with the sibling gem checkouts: every tag/param the gems declare
// in interface.yml must have a completion, and the extension must not
// suggest params the gems do not accept. Set JEKYLL_GEMS_DIR to the
// directory holding the gem repos; defaults to the parent of this repo.
const EXTENSION_ROOT = path.resolve(__dirname, "..");
const GEMS_DIR = process.env.JEKYLL_GEMS_DIR ?? path.resolve(EXTENSION_ROOT, "..");

const GEM_REPOS = {
  "jekyll-imgflow": "jekyll-ImgFlow",
  "jekyll-documents": "jekyll-documents",
  "jekyll-icon-flow": "jekyll-icon-flow",
} as const;

interface InterfaceManifest {
  gem: string;
  version: string;
  tags: Record<string, { params?: string[] }>;
  filters?: string[];
  config?: Record<string, string[]>;
  enums?: Record<string, string[]>;
}

function loadManifest(gem: string): InterfaceManifest | null {
  const file = path.join(GEMS_DIR, GEM_REPOS[gem as keyof typeof GEM_REPOS], "interface.yml");
  return fs.existsSync(file) ? (yaml.load(fs.readFileSync(file, "utf8")) as InterfaceManifest) : null;
}

function src(file: string): string {
  return fs.readFileSync(path.join(EXTENSION_ROOT, "src", file), "utf8");
}

// Completion labels all carry the param key before the first colon:
// `width:400`, `text:"…"`, `markup:direct_url`.
function labelKeys(source: string): string[] {
  return [...source.matchAll(/label:\s*["'`](\w+):/g)].map((m) => m[1]);
}

const manifests = Object.fromEntries(
  Object.keys(GEM_REPOS).map((gem) => [gem, loadManifest(gem)])
);

const missing = Object.keys(GEM_REPOS).filter((gem) => !manifests[gem]);

it("finds the sibling gem checkouts", () => {
  if (missing.length > 0) {
    console.warn(
      `parity tests skipped for ${missing.join(", ")} — no interface.yml under ${GEMS_DIR}. ` +
        "Set JEKYLL_GEMS_DIR or run `rake interface` in the gem."
    );
  }
});

describe.skipIf(!manifests["jekyll-imgflow"])("jekyll-imgflow parity", () => {
  const manifest = manifests["jekyll-imgflow"]!;

  it("covers every imgflow tag param", () => {
    const keys = new Set(labelKeys(src("completionProvider.ts")));
    const declared = manifest.tags["imgflow"].params ?? [];
    expect(declared.filter((p) => !keys.has(p))).toEqual([]);
  });

  it("offers no param the gem does not declare", () => {
    const declared = new Set(manifest.tags["imgflow"].params ?? []);
    const keys = new Set(labelKeys(src("completionProvider.ts")));
    expect([...keys].filter((k) => !declared.has(k))).toEqual([]);
  });

  it("suggests only declared markup formats", () => {
    const declared = new Set(manifest.enums?.markup ?? []);
    const offered = [...src("completionProvider.ts").matchAll(/label:\s*["'`]markup:(\w+)/g)]
      .map((m) => m[1]);
    expect(offered.filter((v) => !declared.has(v))).toEqual([]);
  });
});

describe.skipIf(!manifests["jekyll-documents"])("jekyll-documents parity", () => {
  const manifest = manifests["jekyll-documents"]!;
  const source = src("documentsCompletionProvider.ts");

  it("handles every declared tag", () => {
    for (const tag of Object.keys(manifest.tags)) {
      expect(source, `tag ${tag}`).toContain(`"${tag}"`);
    }
  });

  it("covers every declared param per tag", () => {
    for (const [tag, spec] of Object.entries(manifest.tags)) {
      const block = source.match(new RegExp(`${tag}:\\s*\\[([^\\]]*)\\]`, "s"));
      expect(block, `${tag} PARAM_COMPLETIONS block`).toBeTruthy();
      const keys = new Set(labelKeys(block![1]));
      const declared = spec.params ?? [];
      expect(declared.filter((p) => !keys.has(p)), `${tag} missing params`).toEqual([]);
    }
  });

  it("offers no param the gem does not declare", () => {
    for (const [tag, spec] of Object.entries(manifest.tags)) {
      const block = source.match(new RegExp(`${tag}:\\s*\\[([^\\]]*)\\]`, "s"));
      const declared = new Set(spec.params ?? []);
      const keys = new Set(labelKeys(block?.[1] ?? ""));
      expect([...keys].filter((k) => !declared.has(k)), `${tag} phantom params`).toEqual([]);
    }
  });
});

describe.skipIf(!manifests["jekyll-icon-flow"])("jekyll-icon-flow parity", () => {
  const manifest = manifests["jekyll-icon-flow"]!;
  const source = src("iconsCompletionProvider.ts");

  it("handles every declared tag", () => {
    for (const tag of Object.keys(manifest.tags)) {
      expect(source, `tag ${tag}`).toContain(tag);
    }
  });

  it("covers every declared param per tag", () => {
    const keys = new Set(labelKeys(source));
    for (const [tag, spec] of Object.entries(manifest.tags)) {
      const declared = spec.params ?? [];
      expect(declared.filter((p) => !keys.has(p)), `${tag} missing params`).toEqual([]);
    }
  });

  it("offers only declared named sizes", () => {
    const declared = new Set(manifest.enums?.sizes ?? []);
    const block = source.match(/NAMED_SIZES[^=]*=\s*\[([\s\S]*?)\];/);
    expect(block, "NAMED_SIZES literal").toBeTruthy();
    const offered = [...block![1].matchAll(/\[\s*"(\w+)"/g)].map((m) => m[1]);
    expect(offered.filter((v) => !declared.has(v))).toEqual([]);
    expect([...declared].filter((v) => !offered.includes(v))).toEqual([]);
  });

  it("binds only declared packs", () => {
    const declared = new Set(manifest.enums?.packs ?? []);
    const bound = [...source.matchAll(/\b(\w+):\s*"(\w+)"/g)]
      .filter((m) => m[1].startsWith("icon_") || m[1].endsWith("_icon"))
      .map((m) => m[2]);
    expect(bound.filter((v) => !declared.has(v))).toEqual([]);
  });

  it("mirrors the gem's vendored icon names", () => {
    const repo = path.join(GEMS_DIR, GEM_REPOS["jekyll-icon-flow"]);
    for (const pack of manifest.enums?.packs ?? []) {
      const dir = path.join(repo, "assets", "icons", pack);
      if (!fs.existsSync(dir)) {
        continue; // site-provided packs have no vendored dir
      }
      const vendored = fs.readdirSync(dir)
        .filter((f) => f.endsWith(".svg"))
        .map((f) => f.slice(0, -".svg".length))
        .sort();
      expect(BUNDLED_PACK_ICONS[pack]?.sort() ?? [], `${pack} fallback list`).toEqual(vendored);
    }
  });
});
