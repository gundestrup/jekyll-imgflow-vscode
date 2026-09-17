import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { DocumentsConfig } from "../src/config";

const temporaryDirectories: string[] = [];

export const DEFAULT_DOCUMENTS_CONFIG: DocumentsConfig = {
  root: "assets/documents",
  includeExtensions: [".pdf", ".docx", ".pptx", ".xlsx", ".odt", ".ods", ".odp"],
  strictFilename: true,
  categoriesFromPath: true,
  categoryMap: {},
};

export async function makeTempDir(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

export async function cleanupTempDirs(): Promise<void> {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
}

export async function writeJekyllConfig(directory: string, content: string): Promise<void> {
  await writeFile(path.join(directory, "_config.yml"), content);
}
