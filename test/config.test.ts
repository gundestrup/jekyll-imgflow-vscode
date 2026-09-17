import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadAllowedExtensions,
  loadImgflowConfig,
  loadJekyllConfigFile,
  parseImgflowConfig,
  parseJekyllConfig,
} from "../src/config";
import { collectImageFiles } from "../src/imageFiles";
import { cleanupTempDirs, makeTempDir, writeJekyllConfig } from "./helpers";

afterEach(cleanupTempDirs);

const IMGFLOW_CONFIG = "imgflow:\n  originals: from-config\n";

describe("parseImgflowConfig", () => {
  it.each([
    {
      name: "filters non-string originals entries",
      yaml: "imgflow:\n  originals: [one, 2, three]\n",
      originals: ["one", "three"],
    },
    {
      name: "reads a scalar originals path",
      yaml: "imgflow:\n  originals: assets/images/originals\n",
      originals: ["assets/images/originals"],
    },
    {
      name: "reads multiple originals paths",
      yaml: "imgflow:\n  originals:\n    - images/originals\n    - uploads\n",
      originals: ["images/originals", "uploads"],
    },
    {
      name: "uses the default path when originals is missing",
      yaml: "imgflow:\n  formats: [jpg, png]\n",
      originals: ["assets/images/originals"],
    },
  ])("$name", ({ yaml, originals }) => {
    expect(parseImgflowConfig(yaml)).toEqual({ originals });
  });
});

describe("parseJekyllConfig", () => {
  it("returns an empty object for non-mapping YAML", () => {
    expect(parseJekyllConfig("- just\n- a\n- list\n")).toEqual({});
  });
});

describe("loadJekyllConfigFile", () => {
  it("returns an error result for malformed YAML", async () => {
    const directory = await makeTempDir("jekyll-imgflow-");
    await writeJekyllConfig(directory, "imgflow: [unclosed\n  bad: {");

    const result = loadJekyllConfigFile(directory);
    expect(result.config).toEqual({});
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe("loadImgflowConfig", () => {
  const cases: {
    name: string;
    config: string | null;
    setting: string | null | undefined;
    originals: string[];
  }[] = [
    {
      name: "prefers the VS Code setting over _config.yml",
      config: IMGFLOW_CONFIG,
      setting: "from-settings",
      originals: ["from-settings"],
    },
    {
      name: "loads _config.yml when no override is configured",
      config: IMGFLOW_CONFIG,
      setting: undefined,
      originals: ["from-config"],
    },
    {
      name: "falls back when _config.yml is absent",
      config: null,
      setting: undefined,
      originals: ["assets/images/originals"],
    },
    {
      name: "treats an empty VS Code setting as unset",
      config: IMGFLOW_CONFIG,
      setting: "",
      originals: ["from-config"],
    },
    {
      name: "treats a null VS Code setting as unset",
      config: IMGFLOW_CONFIG,
      setting: null,
      originals: ["from-config"],
    },
  ];

  it.each(cases)("$name", async ({ config, setting, originals }) => {
    const directory = await makeTempDir("jekyll-imgflow-");
    if (config !== null) {
      await writeJekyllConfig(directory, config);
    }

    expect(loadImgflowConfig(directory, setting)).toEqual({ originals });
  });
});

describe("collectImageFiles", () => {
  it("recursively finds configured image formats and ignores other files", async () => {
    const directory = await makeTempDir("jekyll-imgflow-");
    await mkdir(path.join(directory, "nested"), { recursive: true });
    await writeFile(path.join(directory, "photo.JPG"), "image");
    await writeFile(path.join(directory, "nested", "diagram.png"), "image");
    await writeFile(path.join(directory, "notes.txt"), "text");

    expect(collectImageFiles(directory, new Set([".jpg", ".png"]))).toEqual([
      path.join(directory, "nested", "diagram.png"),
      path.join(directory, "photo.JPG"),
    ]);
  });
});

describe("loadAllowedExtensions", () => {
  it("uses configured extensions", () => {
    expect(loadAllowedExtensions(["jpg", ".png"])).toEqual(["jpg", ".png"]);
  });

  it("uses the default image extensions", () => {
    expect(loadAllowedExtensions()).toContain("webp");
  });
});
