import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseIconFlowConfig, type IconFlowConfig } from "../src/config";
import { collectIconNames } from "../src/iconFiles";
import { IconIndex } from "../src/iconIndex";
import { cleanupTempDirs, makeTempDir } from "./helpers";

afterEach(cleanupTempDirs);

const DEFAULT_ICON_CONFIG: IconFlowConfig = {
  enabled: true,
  pack: null,
  search: ["custom", "simple", "lucide"],
  customDir: "assets/icons/custom",
  packs: {},
  registry: {},
};

describe("parseIconFlowConfig", () => {
  it("uses the jekyll-icon-flow defaults", () => {
    expect(parseIconFlowConfig({})).toEqual(DEFAULT_ICON_CONFIG);
  });

  it("reads pack, search, packs, custom_dir, enabled and the registry map", () => {
    expect(parseIconFlowConfig({
      icon_flow: {
        enabled: false,
        pack: "simple",
        search: ["fa", "lucide"],
        custom_dir: "icons",
        packs: { fa: "assets/icons/fa" },
        registry: { danger: "lucide:triangle-alert", download: "lucide:download" },
      },
    })).toEqual({
      enabled: false,
      pack: "simple",
      search: ["fa", "lucide"],
      customDir: "icons",
      packs: { fa: "assets/icons/fa" },
      registry: { danger: "lucide:triangle-alert", download: "lucide:download" },
    });
  });

  it("falls back to defaults when icon_flow is not a mapping", () => {
    expect(parseIconFlowConfig({ icon_flow: "nope" })).toEqual(DEFAULT_ICON_CONFIG);
  });
});

describe("collectIconNames", () => {
  it("returns empty for a missing directory", () => {
    expect(collectIconNames(path.join("nonexistent", "dir"))).toEqual([]);
  });

  it("lists svg basenames flat, ignoring other files and subdirectories", async () => {
    const directory = await makeTempDir("jekyll-icons-");
    await writeFile(path.join(directory, "logo.svg"), "<svg/>");
    await writeFile(path.join(directory, "flag.svg"), "<svg/>");
    await writeFile(path.join(directory, "notes.txt"), "text");
    await mkdir(path.join(directory, "nested"));
    await writeFile(path.join(directory, "nested", "deep.svg"), "<svg/>");

    expect(collectIconNames(directory)).toEqual(["flag", "logo"]);
  });
});

describe("IconIndex", () => {
  it("falls back to the bundled pack lists when no gem is installed", () => {
    const index = new IconIndex("/nonexistent-workspace");
    index.refresh(DEFAULT_ICON_CONFIG);

    expect(index.getIcons("lucide")).toContain("search");
    expect(index.getIcons("simple")).toContain("github");
    expect(index.getIcons("custom")).toEqual([]);
    expect(index.getIcons("unknown-pack")).toEqual([]);
  });

  it("indexes custom icons from the configured site directory", async () => {
    const root = await makeTempDir("jekyll-icons-site-");
    const customDir = path.join(root, "assets/icons/custom");
    await mkdir(customDir, { recursive: true });
    await writeFile(path.join(customDir, "logo.svg"), "<svg/>");

    const index = new IconIndex(root);
    index.refresh(DEFAULT_ICON_CONFIG);

    expect(index.getIcons("custom")).toEqual(["logo"]);
    expect(index.getSearchPacks()).toEqual(["custom", "simple", "lucide"]);
  });

  it("indexes named packs and lets icon_flow.pack pin the search", async () => {
    const root = await makeTempDir("jekyll-icons-packs-");
    const faDir = path.join(root, "assets/icons/fa");
    await mkdir(faDir, { recursive: true });
    await writeFile(path.join(faDir, "bars.svg"), "<svg/>");

    const index = new IconIndex(root);
    index.refresh({ ...DEFAULT_ICON_CONFIG, packs: { fa: "assets/icons/fa" } });
    expect(index.getIcons("fa")).toEqual(["bars"]);
    expect(index.getPackNames()).toContain("fa");

    index.refresh({ ...DEFAULT_ICON_CONFIG, pack: "fa", packs: { fa: "assets/icons/fa" } });
    expect(index.getSearchPacks()).toEqual(["fa"]);
  });

  it("uses the bundled pack directory when the workspace is the gem repo", async () => {
    const root = await makeTempDir("jekyll-icons-gem-");
    const lucideDir = path.join(root, "assets/icons/lucide");
    await mkdir(lucideDir, { recursive: true });
    await writeFile(path.join(lucideDir, "only-here.svg"), "<svg/>");

    const index = new IconIndex(root);
    index.refresh(DEFAULT_ICON_CONFIG);

    expect(index.getIcons("lucide")).toEqual(["only-here"]);
  });

  it("uses a vendored gem pack directory when available", async () => {
    const root = await makeTempDir("jekyll-icons-vendored-gem-");
    const lucideDir = path.join(
      root,
      "vendor/bundle/ruby/3.3.0/gems/jekyll-icon-flow-1.0.0/assets/icons/lucide"
    );
    await mkdir(lucideDir, { recursive: true });
    await writeFile(path.join(lucideDir, "vendored-only.svg"), "<svg/>");

    const index = new IconIndex(root);
    index.refresh(DEFAULT_ICON_CONFIG);

    expect(index.getIcons("lucide")).toEqual(["vendored-only"]);
  });

  it("exposes the registry for icon_ref lookups", () => {
    const index = new IconIndex("/nonexistent-workspace");
    index.refresh({ ...DEFAULT_ICON_CONFIG, registry: { danger: "lucide:triangle-alert" } });

    expect(index.getRegistry()).toEqual({ danger: "lucide:triangle-alert" });
  });
});
