import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { loadAllowedExtensions, loadImgflowConfig, type ImgflowConfig } from "./config";
import { collectImageFiles } from "./imageFiles";

export class ImageIndex {
  private images: string[] = [];
  private config: ImgflowConfig | null = null;
  private readonly watchers: vscode.FileSystemWatcher[] = [];

  constructor(private readonly workspaceRoot: string) {}

  async refresh(): Promise<void> {
    const vscodeConfig = vscode.workspace.getConfiguration("jekyllImgFlow");
    const originals = vscodeConfig.get<string | string[] | undefined>("originals");
    const formats = vscodeConfig.get<string[] | undefined>("formats");

    console.log(`[Jekyll ImgFlow] VS Code settings: originals=${JSON.stringify(originals)}, formats=${JSON.stringify(formats)}`);

    this.config = loadImgflowConfig(this.workspaceRoot, originals);
    console.log(`[Jekyll ImgFlow] resolved originals: ${JSON.stringify(this.config?.originals)}`);
    if (!this.config) {
      this.images = [];
      return;
    }

    const extensions = new Set(loadAllowedExtensions(formats).map((ext) => (ext.startsWith(".") ? ext : `.${ext}`)));
    const results: string[] = [];

    for (const relative of this.config.originals) {
      const dir = path.isAbsolute(relative) ? relative : path.join(this.workspaceRoot, relative);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        continue;
      }

      const files = collectImageFiles(dir, extensions);
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
    const vscodeConfig = vscode.workspace.getConfiguration("jekyllImgFlow");
    const originals = vscodeConfig.get<string | string[] | undefined>("originals");
    const config = loadImgflowConfig(this.workspaceRoot, originals);
    if (!config) {
      return;
    }

    for (const relative of config.originals) {
      const dir = path.isAbsolute(relative) ? relative : path.join(this.workspaceRoot, relative);
      const pattern = new vscode.RelativePattern(dir, "**/*");
      const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);

      watcher.onDidChange(() => this.refreshFromWatcher());
      watcher.onDidCreate(() => this.refreshFromWatcher());
      watcher.onDidDelete(() => this.refreshFromWatcher());

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

  private refreshFromWatcher(): void {
    void this.refresh().catch((error: unknown) => {
      console.error("[Jekyll ImgFlow] watcher refresh failed:", error);
    });
  }


}
