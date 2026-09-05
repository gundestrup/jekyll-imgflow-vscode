import * as fs from "node:fs";
import * as path from "node:path";
import { loadAllowedExtensions, type ImgflowConfig } from "./config";
import { collectImageFiles } from "./imageFiles";

export class ImageIndex {
  private images: string[] = [];
  private config: ImgflowConfig | null = null;

  constructor(private readonly workspaceRoot: string) {}

  refresh(config: ImgflowConfig, formats?: string[]): void {
    this.config = config;
    const extensions = new Set(
      loadAllowedExtensions(formats).map((extension) => extension.startsWith(".") ? extension : `.${extension}`)
    );
    const results: string[] = [];

    for (const relative of config.originals) {
      const dir = path.isAbsolute(relative) ? relative : path.join(this.workspaceRoot, relative);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        continue;
      }
      for (const file of collectImageFiles(dir, extensions)) {
        results.push(path.relative(dir, file).replaceAll("\\", "/"));
      }
    }

    this.images = [...new Set(results)].sort();
  }

  getImages(): string[] {
    return this.images;
  }

  getConfig(): ImgflowConfig | null {
    return this.config;
  }
}
