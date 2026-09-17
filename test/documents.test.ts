import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseDocumentsConfig, type DocumentsConfig } from "../src/config";
import { collectDocuments, parseDocumentFilename } from "../src/documentFiles";
import { cleanupTempDirs, DEFAULT_DOCUMENTS_CONFIG, makeTempDir } from "./helpers";

afterEach(cleanupTempDirs);

const COLLECT_CONFIG: DocumentsConfig = {
  ...DEFAULT_DOCUMENTS_CONFIG,
  includeExtensions: [".pdf"],
};

describe("parseDocumentsConfig", () => {
  it("uses the jekyll-documents defaults", () => {
    expect(parseDocumentsConfig({})).toEqual(DEFAULT_DOCUMENTS_CONFIG);
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

  it("falls back to defaults when documents is not a mapping", () => {
    expect(parseDocumentsConfig({ documents: "nope" })).toEqual(DEFAULT_DOCUMENTS_CONFIG);
  });

  it("drops non-string category map values and non-array extensions", () => {
    const config = parseDocumentsConfig({
      documents: {
        category_map: { Board: "minutes", Bad: 5 },
        include_extensions: "pdf",
      },
    });

    expect(config.categoryMap).toEqual({ Board: "minutes" });
    expect(config.includeExtensions).toEqual(DEFAULT_DOCUMENTS_CONFIG.includeExtensions);
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

  it("rejects impossible days for the given month", () => {
    expect(parseDocumentFilename("2026-04-31_Short_Month", true)).toBeNull();
    expect(parseDocumentFilename("2026-01-00_Zero_Day", true)).toBeNull();
  });

  it("handles leap years correctly", () => {
    expect(parseDocumentFilename("2023-02-29_Not_Leap", true)).toBeNull();
    expect(parseDocumentFilename("1900-02-29_Century", true)).toBeNull();
    expect(parseDocumentFilename("2024-02-29_Leap", true)?.date).toBe("2024-02-29");
    expect(parseDocumentFilename("2000-02-29_Leap_Century", true)?.date).toBe("2000-02-29");
  });

  it("rejects filenames without a date prefix in strict mode", () => {
    expect(parseDocumentFilename("Board_Meeting", true)).toBeNull();
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
    const directory = await makeTempDir("jekyll-documents-");
    await mkdir(path.join(directory, "Board", "Meetings"), { recursive: true });
    await writeFile(path.join(directory, "Board", "Meetings", "2026-03-01_Annual_Report.PDF"), "fixture");
    await writeFile(path.join(directory, "Board", "Meetings", "notes.txt"), "fixture");

    const documents = collectDocuments(directory, {
      ...COLLECT_CONFIG,
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

  it("excludes files that fail strict filename parsing", async () => {
    const directory = await makeTempDir("jekyll-documents-");
    await writeFile(path.join(directory, "2026-13-40_Bad_Date.pdf"), "fixture");
    await writeFile(path.join(directory, "No_Date.pdf"), "fixture");
    await writeFile(path.join(directory, "2026-03-01_Valid.pdf"), "fixture");

    const documents = collectDocuments(directory, COLLECT_CONFIG);

    expect(documents.map((document) => document.title)).toEqual(["Valid"]);
  });

  it("uses uncategorized when path categories are disabled", async () => {
    const directory = await makeTempDir("jekyll-documents-");
    await mkdir(path.join(directory, "Board"), { recursive: true });
    await writeFile(path.join(directory, "Board", "Board_Meeting.pdf"), "fixture");

    const documents = collectDocuments(directory, {
      ...COLLECT_CONFIG,
      strictFilename: false,
      categoriesFromPath: false,
      categoryMap: { uncategorized: "General" },
    });

    expect(documents[0]?.category).toBe("General");
    expect(documents[0]?.title).toBe("Board Meeting");
  });
});
