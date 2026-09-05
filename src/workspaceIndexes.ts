import * as path from "node:path";
import * as vscode from "vscode";
import {
  loadJekyllConfigFile,
  parseDocumentsConfig,
  resolveImgflowConfig,
} from "./config";
import { DocumentIndex } from "./documentIndex";
import { ImageIndex } from "./imageIndex";

export class WorkspaceIndexes implements vscode.Disposable {
  readonly images: ImageIndex;
  readonly documents: DocumentIndex;
  private readonly disposables: vscode.Disposable[] = [];
  private rootWatchers: vscode.FileSystemWatcher[] = [];
  private refreshTimer: NodeJS.Timeout | undefined;
  private rebuildWatchersOnRefresh = false;
  private configError: string | null = null;

  constructor(private readonly workspaceRoot: string) {
    this.images = new ImageIndex(workspaceRoot);
    this.documents = new DocumentIndex(workspaceRoot);
  }

  async initialize(): Promise<void> {
    await this.refresh(true);
    const configWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, "_config.yml")
    );
    configWatcher.onDidChange(() => this.scheduleRefresh(true));
    configWatcher.onDidCreate(() => this.scheduleRefresh(true));
    configWatcher.onDidDelete(() => this.scheduleRefresh(true));
    this.disposables.push(
      configWatcher,
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("jekyllImgFlow")) {
          this.scheduleRefresh(true);
        }
      })
    );
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.disposeRootWatchers();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private async refresh(rebuildWatchers: boolean): Promise<void> {
    const loaded = loadJekyllConfigFile(this.workspaceRoot);
    if (loaded.error) {
      if (this.configError !== loaded.error.message) {
        this.configError = loaded.error.message;
        void vscode.window.showWarningMessage(`Jekyll autocomplete could not read _config.yml: ${loaded.error.message}`);
      }
      return;
    }
    this.configError = null;

    const vscodeConfig = vscode.workspace.getConfiguration("jekyllImgFlow");
    const originals = vscodeConfig.get<string | string[] | undefined>("originals");
    const formats = vscodeConfig.get<string[] | undefined>("formats");
    const imgflowConfig = resolveImgflowConfig(loaded.config, originals);
    const documentsConfig = parseDocumentsConfig(loaded.config);

    this.images.refresh(imgflowConfig, formats);
    this.documents.refresh(documentsConfig);

    if (rebuildWatchers) {
      this.rebuildRootWatchers([
        ...imgflowConfig.originals.map((root) => this.resolveRoot(root)),
        this.documents.getRoot(),
      ]);
    }

    console.log(
      `[Jekyll Autocomplete] indexed ${this.images.getImages().length} images and ` +
      `${this.documents.getDocuments().length} documents`
    );
  }

  private resolveRoot(root: string): string {
    return path.isAbsolute(root) ? root : path.join(this.workspaceRoot, root);
  }

  private rebuildRootWatchers(roots: Array<string | null>): void {
    this.disposeRootWatchers();
    const uniqueRoots = [...new Set(roots.filter((root): root is string => root !== null))];
    this.rootWatchers = uniqueRoots.map((root) => {
      const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, "**/*"));
      watcher.onDidChange(() => this.scheduleRefresh(false));
      watcher.onDidCreate(() => this.scheduleRefresh(false));
      watcher.onDidDelete(() => this.scheduleRefresh(false));
      return watcher;
    });
  }

  private disposeRootWatchers(): void {
    for (const watcher of this.rootWatchers) {
      watcher.dispose();
    }
    this.rootWatchers = [];
  }

  private scheduleRefresh(rebuildWatchers: boolean): void {
    this.rebuildWatchersOnRefresh ||= rebuildWatchers;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      const shouldRebuildWatchers = this.rebuildWatchersOnRefresh;
      this.rebuildWatchersOnRefresh = false;
      void this.refresh(shouldRebuildWatchers).catch((error: unknown) => {
        console.error("[Jekyll Autocomplete] refresh failed:", error);
      });
    }, 100);
  }
}
