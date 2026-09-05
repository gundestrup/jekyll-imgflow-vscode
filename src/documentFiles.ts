import * as path from "node:path";
import type { DocumentsConfig } from "./config";
import { collectFiles } from "./fileCollector";

export interface DocumentEntry {
  title: string;
  category: string;
  categoryPath: string;
  date: string | null;
  extension: string;
  relativePath: string;
  sourcePath: string;
}

interface ParsedFilename {
  title: string;
  date: string | null;
}

function validDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

export function parseDocumentFilename(basename: string, strictFilename: boolean): ParsedFilename | null {
  const match = basename.match(/^(\d{4})-(\d{2})-(\d{2})_(.+)$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (validDate(year, month, day)) {
      return {
        title: (match[4] ?? "").replaceAll("_", " "),
        date: `${match[1]}-${match[2]}-${match[3]}`,
      };
    }
  }

  if (strictFilename) {
    return null;
  }
  return { title: basename.replaceAll("_", " "), date: null };
}

function categoryData(file: string, root: string, config: DocumentsConfig): {
  category: string;
  categoryPath: string;
} {
  const relativeDirectory = path.dirname(path.relative(root, file)).replaceAll("\\", "/");
  const categoryPath = config.categoriesFromPath && relativeDirectory !== "."
    ? relativeDirectory
    : "uncategorized";
  const leaf = categoryPath.split("/").at(-1) ?? "uncategorized";
  const mapped = config.categoryMap[categoryPath] ?? config.categoryMap[leaf];
  return {
    category: mapped ?? leaf.toLowerCase(),
    categoryPath,
  };
}

export function collectDocuments(root: string, config: DocumentsConfig): DocumentEntry[] {
  const extensions = new Set(config.includeExtensions);
  return collectFiles(root).flatMap((file): DocumentEntry[] => {
    const extension = path.extname(file).toLowerCase();
    if (!extensions.has(extension)) {
      return [];
    }
    const sourcePath = path.relative(root, file).replaceAll("\\", "/");
    const parsed = parseDocumentFilename(path.basename(file, path.extname(file)), config.strictFilename);
    if (!parsed) {
      return [];
    }
    const categories = categoryData(file, root, config);
    return [{
      ...parsed,
      ...categories,
      extension,
      relativePath: sourcePath,
      sourcePath,
    }];
  }).sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}
