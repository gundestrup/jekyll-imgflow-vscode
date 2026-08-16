import * as vscode from "vscode";
import { ImageIndex } from "./imageIndex";

export class ImgflowCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly index: ImageIndex) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    const line = document.lineAt(position).text;
    const textBefore = line.slice(0, position.character);

    const match = textBefore.match(/\{%\s*imgflow\s+([^\s%]*)$/);
    if (!match) {
      return [];
    }

    const typed = match[1] ?? "";
    const images = this.index.getImages();

    return images
      .filter((image) => image.toLowerCase().startsWith(typed.toLowerCase()))
      .map((image) => {
        const item = new vscode.CompletionItem(image, vscode.CompletionItemKind.File);
        item.insertText = image;
        item.sortText = image.toLowerCase();
        item.detail = "ImgFlow original";
        return item;
      });
  }
}
