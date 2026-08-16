import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { loadAllowedExtensions, loadImgflowConfig, type ImgflowConfig } from "./config";

export class ImageIndex {
  private images: string[] = [];
  private config: ImgflowConfig | null = null;
  private readonly watchers: vscode.FileSystemWatcher[] = [];

  constructor(private readonly workspaceRoot: string) {}

  async refresh(): Promise<void> {
    this.config = loadImgflowConfig(this.workspaceRoot);
    if (!this.config) {
      this.images = [];
      return;
    }

    const extensions = new Set(loadAllowedExtensions().map((ext) => (ext.startsWith(".") ? ext : `.${ext}`)));
    const results: string[] = [];

    for (const relative of this.config.originals) {
      const dir = path.isAbsolute(relative) ? relative : path.join(this.workspaceRoot, relative);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        continue;
      }

      const files = this.collectFiles(dir, extensions);
      for (const file of files) {
        results.push(path.relative(dir, file).replace(/\\/g, "/"));
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

  registerWatchers(context: vscode.ExtensionContext): void {
    const config = loadImgflowConfig(this.workspaceRoot);
    if (!config) {
      return;
    }

    for (const relative of config.originals) {
      const dir = path.isAbsolute(relative) ? relative : path.join(this.workspaceRoot, relative);
      const pattern = new vscode.RelativePattern(dir, "**/*");
      const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);

      watcher.onDidChange(() => this.refresh());
      watcher.onDidCreate(() => this.refresh());
      watcher.onDidDelete(() => this.refresh());

      this.watchers.push(watcher);
      context.subscriptions.push(watcher);
    }
  }

  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers.length = 0;
  }

  private collectFiles(dir: string, extensions: Set<string>): string[] {
    const results: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.collectFiles(fullPath, extensions));
      } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }

    return results;
  }
}
