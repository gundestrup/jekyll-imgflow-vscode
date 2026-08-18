import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadAllowedExtensions, loadImgflowConfig, parseImgflowConfig } from "../src/config";
import { collectImageFiles } from "../src/imageFiles";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("parseImgflowConfig", () => {
  it("reads a scalar originals path", () => {
    expect(parseImgflowConfig("imgflow:\n  originals: assets/images/originals\n")).toEqual({
      originals: ["assets/images/originals"],
    });
  });

  it("reads multiple originals paths", () => {
    expect(parseImgflowConfig("imgflow:\n  originals:\n    - images/originals\n    - uploads\n")).toEqual({
      originals: ["images/originals", "uploads"],
    });
  });

  it("uses the default path when originals is missing", () => {
    expect(parseImgflowConfig("imgflow:\n  formats: [jpg, png]\n")).toEqual({
      originals: ["assets/images/originals"],
    });
  });
});

describe("loadImgflowConfig", () => {
  it("prefers the VS Code setting over _config.yml", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "jekyll-imgflow-"));
    temporaryDirectories.push(directory);
    await writeFile(path.join(directory, "_config.yml"), "imgflow:\n  originals: from-config\n");

    expect(loadImgflowConfig(directory, "from-settings")).toEqual({
      originals: ["from-settings"],
    });
  });

  it("loads _config.yml when no override is configured", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "jekyll-imgflow-"));
    temporaryDirectories.push(directory);
    await writeFile(path.join(directory, "_config.yml"), "imgflow:\n  originals: from-config\n");

    expect(loadImgflowConfig(directory)).toEqual({
      originals: ["from-config"],
    });
  });

  it("falls back when _config.yml is absent", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "jekyll-imgflow-"));
    temporaryDirectories.push(directory);

    expect(loadImgflowConfig(directory)).toEqual({
      originals: ["assets/images/originals"],
    });
  });
});

describe("collectImageFiles", () => {
  it("recursively finds configured image formats and ignores other files", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "jekyll-imgflow-"));
    temporaryDirectories.push(directory);
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
