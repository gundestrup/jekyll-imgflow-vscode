import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";

export interface ImgflowConfig {
  originals: string[];
}

const DEFAULT_ORIGINALS = "assets/images/originals";
const DEFAULT_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "tiff", "svg"];

function normalizeOriginals(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return [value];
  }
  return [DEFAULT_ORIGINALS];
}

export function parseImgflowConfig(content: string): ImgflowConfig {
  const parsed = yaml.load(content) as Record<string, unknown> | undefined;
  const imgflow = parsed?.imgflow as Record<string, unknown> | undefined;

  return {
    originals: normalizeOriginals(imgflow?.originals),
  };
}

export function loadImgflowConfig(
  workspaceRoot: string,
  vscodeOriginals?: string | string[] | undefined
): ImgflowConfig {
  const fileConfig = loadImgflowConfigFile(workspaceRoot);
  const originals = vscodeOriginals === undefined || vscodeOriginals === ""
    ? (fileConfig?.originals ?? [DEFAULT_ORIGINALS])
    : normalizeOriginals(vscodeOriginals);

  return { originals };
}

function loadImgflowConfigFile(workspaceRoot: string): ImgflowConfig | null {
  const configPath = path.join(workspaceRoot, "_config.yml");
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, "utf8");
    return parseImgflowConfig(content);
  } catch {
    return null;
  }
}

export function loadAllowedExtensions(
  vscodeFormats?: string[] | undefined
): string[] {
  if (vscodeFormats && vscodeFormats.length > 0) {
    return vscodeFormats;
  }
  return DEFAULT_EXTENSIONS;
}
