import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DocumentsConfig } from "../src/config";
import { DocumentIndex } from "../src/documentIndex";
import { ImageIndex } from "../src/imageIndex";

const temporaryDirectories: string[] = [];

const DOCUMENTS_CONFIG: DocumentsConfig = {
  root: "assets/documents",
  includeExtensions: [".pdf"],
  strictFilename: true,
  categoriesFromPath: true,
  categoryMap: {},
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("DocumentIndex", () => {
  it("reports no root before refresh", () => {
    expect(new DocumentIndex("/tmp/anything").getRoot()).toBeNull();
  });

  it("indexes nothing when the root directory is missing", () => {
    const index = new DocumentIndex("/tmp/anything");
    index.refresh(DOCUMENTS_CONFIG);

    expect(index.getDocuments()).toEqual([]);
    expect(index.getRoot()).toBe(path.join("/tmp/anything", "assets/documents"));
  });

  it("supports an absolute document root", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "jekyll-documents-"));
    temporaryDirectories.push(directory);
    await writeFile(path.join(directory, "2026-01-01_Notes.pdf"), "fixture");

    const index = new DocumentIndex("/unrelated");
    index.refresh({ ...DOCUMENTS_CONFIG, root: directory });

    expect(index.getRoot()).toBe(directory);
    expect(index.getDocuments().map((document) => document.title)).toEqual(["Notes"]);
  });

  it("lists categories sorted by path", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "jekyll-documents-"));
    temporaryDirectories.push(directory);
    await mkdir(path.join(directory, "Zeta"), { recursive: true });
    await mkdir(path.join(directory, "Alpha"), { recursive: true });
    await writeFile(path.join(directory, "Zeta", "2026-01-02_Last.pdf"), "fixture");
    await writeFile(path.join(directory, "Alpha", "2026-01-01_First.pdf"), "fixture");

    const index = new DocumentIndex("/unrelated");
    index.refresh({ ...DOCUMENTS_CONFIG, root: directory });

    expect(index.getCategories()).toEqual([
      { name: "alpha", path: "Alpha" },
      { name: "zeta", path: "Zeta" },
    ]);
  });
});

describe("ImageIndex", () => {
  it("reports no config before refresh", () => {
    expect(new ImageIndex("/tmp/anything").getConfig()).toBeNull();
  });

  it("skips originals directories that do not exist", () => {
    const index = new ImageIndex("/tmp/anything");
    index.refresh({ originals: ["does-not-exist"] });

    expect(index.getImages()).toEqual([]);
  });

  it("supports absolute originals paths and dotted formats", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "jekyll-imgflow-"));
    temporaryDirectories.push(directory);
    await writeFile(path.join(directory, "hero.png"), "image");
    await writeFile(path.join(directory, "hero.jpg"), "image");

    const index = new ImageIndex("/unrelated");
    index.refresh({ originals: [directory] }, [".png"]);

    expect(index.getImages()).toEqual(["hero.png"]);
    expect(index.getConfig()?.originals).toEqual([directory]);
  });
});
