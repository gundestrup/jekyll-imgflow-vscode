import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseDocumentsConfig } from "../src/config";
import { collectDocuments, parseDocumentFilename } from "../src/documentFiles";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("parseDocumentsConfig", () => {
  it("uses the jekyll-documents defaults", () => {
    expect(parseDocumentsConfig({})).toEqual({
      root: "assets/documents",
      includeExtensions: [".pdf", ".docx", ".pptx", ".xlsx", ".odt", ".ods", ".odp"],
      strictFilename: true,
      categoriesFromPath: true,
      categoryMap: {},
    });
  });

  it("reads document indexing options", () => {
    expect(parseDocumentsConfig({
      documents: {
        root: "downloads",
        include_extensions: [".pdf"],
        strict_filename: false,
        categories_from_path: false,
        category_map: { Board: "Minutes" },
      },
    })).toEqual({
      root: "downloads",
      includeExtensions: [".pdf"],
      strictFilename: false,
      categoriesFromPath: false,
      categoryMap: { Board: "Minutes" },
    });
  });
});

describe("parseDocumentFilename", () => {
  it("derives a title and date from a valid filename", () => {
    expect(parseDocumentFilename("2026-03-01_Board_Meeting", true)).toEqual({
      title: "Board Meeting",
      date: "2026-03-01",
    });
  });

  it("rejects invalid calendar dates in strict mode", () => {
    expect(parseDocumentFilename("2026-13-99_Invalid_Date", true)).toBeNull();
  });

  it("uses the complete filename as a title in non-strict mode", () => {
    expect(parseDocumentFilename("Board_Meeting", false)).toEqual({
      title: "Board Meeting",
      date: null,
    });
    expect(parseDocumentFilename("2026-13-99_Invalid_Date", false)).toEqual({
      title: "2026-13-99 Invalid Date",
      date: null,
    });
  });
});

describe("collectDocuments", () => {
  it("indexes configured extensions and applies nested category mapping", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "jekyll-documents-"));
    temporaryDirectories.push(directory);
    await mkdir(path.join(directory, "Board", "Meetings"), { recursive: true });
    await writeFile(path.join(directory, "Board", "Meetings", "2026-03-01_Annual_Report.PDF"), "fixture");
    await writeFile(path.join(directory, "Board", "Meetings", "notes.txt"), "fixture");

    const documents = collectDocuments(directory, {
      root: "assets/documents",
      includeExtensions: [".pdf"],
      strictFilename: true,
      categoriesFromPath: true,
      categoryMap: { Meetings: "Reports" },
    });

    expect(documents).toEqual([{
      title: "Annual Report",
      category: "Reports",
      categoryPath: "Board/Meetings",
      date: "2026-03-01",
      extension: ".pdf",
      relativePath: "Board/Meetings/2026-03-01_Annual_Report.PDF",
      sourcePath: "Board/Meetings/2026-03-01_Annual_Report.PDF",
    }]);
  });

  it("uses uncategorized when path categories are disabled", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "jekyll-documents-"));
    temporaryDirectories.push(directory);
    await mkdir(path.join(directory, "Board"), { recursive: true });
    await writeFile(path.join(directory, "Board", "Board_Meeting.pdf"), "fixture");

    const documents = collectDocuments(directory, {
      root: "assets/documents",
      includeExtensions: [".pdf"],
      strictFilename: false,
      categoriesFromPath: false,
      categoryMap: { uncategorized: "General" },
    });

    expect(documents[0]?.category).toBe("General");
    expect(documents[0]?.title).toBe("Board Meeting");
  });
});
