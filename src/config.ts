import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";

export type JekyllConfig = Record<string, unknown>;

export interface ConfigFileResult {
  config: JekyllConfig;
  error: Error | null;
}

export interface ImgflowConfig {
  originals: string[];
}

export interface DocumentsConfig {
  root: string;
  includeExtensions: string[];
  strictFilename: boolean;
  categoriesFromPath: boolean;
  categoryMap: Record<string, string>;
}

const DEFAULT_ORIGINALS = "assets/images/originals";
const DEFAULT_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "tiff", "svg"];
const DEFAULT_DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".pptx", ".xlsx", ".odt", ".ods", ".odp"];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function normalizeOriginals(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return [value];
  }
  return [DEFAULT_ORIGINALS];
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter((item): item is string => typeof item === "string");
}

function stringMap(value: unknown): Record<string, string> {
  const record = asRecord(value);
  if (!record) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

export function parseJekyllConfig(content: string): JekyllConfig {
  return asRecord(yaml.load(content)) ?? {};
}

export function loadJekyllConfigFile(workspaceRoot: string): ConfigFileResult {
  const configPath = path.join(workspaceRoot, "_config.yml");
  if (!fs.existsSync(configPath)) {
    return { config: {}, error: null };
  }

  try {
    return { config: parseJekyllConfig(fs.readFileSync(configPath, "utf8")), error: null };
  } catch (error) {
    return {
      config: {},
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function parseImgflowConfig(content: string): ImgflowConfig {
  return resolveImgflowConfig(parseJekyllConfig(content));
}

export function resolveImgflowConfig(
  config: JekyllConfig,
  vscodeOriginals?: string | string[] | undefined
): ImgflowConfig {
  const imgflow = asRecord(config.imgflow);
  const originals = vscodeOriginals === undefined || vscodeOriginals === ""
    ? normalizeOriginals(imgflow?.originals)
    : normalizeOriginals(vscodeOriginals);
  return { originals };
}

export function loadImgflowConfig(
  workspaceRoot: string,
  vscodeOriginals?: string | string[] | undefined
): ImgflowConfig {
  return resolveImgflowConfig(loadJekyllConfigFile(workspaceRoot).config, vscodeOriginals);
}

export function parseDocumentsConfig(config: JekyllConfig): DocumentsConfig {
  const documents = asRecord(config.documents);
  return {
    root: typeof documents?.root === "string" ? documents.root : "assets/documents",
    includeExtensions: stringArray(documents?.include_extensions, DEFAULT_DOCUMENT_EXTENSIONS),
    strictFilename: typeof documents?.strict_filename === "boolean" ? documents.strict_filename : true,
    categoriesFromPath: typeof documents?.categories_from_path === "boolean"
      ? documents.categories_from_path
      : true,
    categoryMap: stringMap(documents?.category_map),
  };
}

export function loadAllowedExtensions(
  vscodeFormats?: string[] | undefined
): string[] {
  if (vscodeFormats && vscodeFormats.length > 0) {
    return vscodeFormats;
  }
  return DEFAULT_IMAGE_EXTENSIONS;
}
