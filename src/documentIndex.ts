import * as fs from "node:fs";
import * as path from "node:path";
import type { DocumentsConfig } from "./config";
import { collectDocuments, type DocumentEntry } from "./documentFiles";

export interface CategoryEntry {
  name: string;
  path: string;
}

export class DocumentIndex {
  private documents: DocumentEntry[] = [];
  private config: DocumentsConfig | null = null;

  constructor(private readonly workspaceRoot: string) {}

  refresh(config: DocumentsConfig): void {
    this.config = config;
    const root = this.getRoot();
    this.documents = root && fs.existsSync(root) && fs.statSync(root).isDirectory()
      ? collectDocuments(root, config)
      : [];
  }

  getDocuments(): DocumentEntry[] {
    return this.documents;
  }

  getCategories(): CategoryEntry[] {
    const categories = new Map<string, CategoryEntry>();
    for (const document of this.documents) {
      categories.set(document.categoryPath, {
        name: document.category,
        path: document.categoryPath,
      });
    }
    return [...categories.values()].sort((left, right) =>
      left.path.localeCompare(right.path)
    );
  }

  getRoot(): string | null {
    if (!this.config) {
      return null;
    }
    return path.isAbsolute(this.config.root)
      ? this.config.root
      : path.join(this.workspaceRoot, this.config.root);
  }
}
