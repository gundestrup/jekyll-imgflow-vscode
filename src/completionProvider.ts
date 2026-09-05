import * as vscode from "vscode";
import { ImageIndex } from "./imageIndex";

interface ParamCompletion {
  label: string;
  insertText: string;
  detail: string;
  kind?: vscode.CompletionItemKind;
}

// Common ImgFlow operations and presets after the image path
const PARAM_COMPLETIONS: ParamCompletion[] = [
  // Default sizes
  { label: "width:400", insertText: "width:400", detail: "Default size sm (400px)" },
  { label: "width:800", insertText: "width:800", detail: "Default size md (800px)" },
  { label: "width:1200", insertText: "width:1200", detail: "Default size lg (1200px)" },
  { label: "width:2000", insertText: "width:2000", detail: "Default size xl (2000px)" },
  { label: "height:", insertText: "height:", detail: "Set height in pixels" },

  // Output formats
  { label: "format:webp", insertText: "format:webp", detail: "Output as WebP" },
  { label: "format:avif", insertText: "format:avif", detail: "Output as AVIF" },
  { label: "format:jpg", insertText: "format:jpg", detail: "Output as JPEG" },
  { label: "format:png", insertText: "format:png", detail: "Output as PNG" },
  { label: "formats:", insertText: "formats:", detail: "Comma-separated output formats" },

  // Quality & optimization
  { label: "quality:85", insertText: "quality:85", detail: "Compression quality (0-100)" },
  { label: "level:medium", insertText: "level:medium", detail: "Optimization level" },
  { label: "optimize:", insertText: "optimize:", detail: "Enable optimization" },

  // Presets
  { label: "preset:hero", insertText: "preset:hero", detail: "Hero image preset" },
  { label: "preset:thumbnail", insertText: "preset:thumbnail", detail: "Thumbnail preset" },
  { label: "preset:gallery", insertText: "preset:gallery", detail: "Gallery preset" },

  // Crop, watermark and positioning
  { label: "ratio:1:1", insertText: "ratio:1:1", detail: "Square aspect ratio" },
  { label: "ratio:16:9", insertText: "ratio:16:9", detail: "Widescreen aspect ratio" },
  { label: "keep:true", insertText: "keep:true", detail: "Maintain aspect ratio while resizing" },
  { label: "watermark:", insertText: "watermark:", detail: "Path to watermark image" },
  { label: "opacity:0.7", insertText: "opacity:0.7", detail: "Watermark opacity (0.0-1.0)" },
  { label: "position:bottom_right", insertText: "position:bottom_right", detail: "Watermark / crop position" },

  // HTML attributes
  { label: "alt:", insertText: "alt:", detail: "Image alt text" },
  { label: "class:", insertText: "class:", detail: "CSS class(es)" },
  { label: "title:", insertText: "title:", detail: "Image title" },
  { label: "loading:lazy", insertText: "loading:lazy", detail: "Lazy load the image" },
  { label: "loading:eager", insertText: "loading:eager", detail: "Eager load the image" },
];

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

    // 1. Image path completion: {% imgflow "partial
    const pathMatch = textBefore.match(/\{%\s*imgflow\s+(["']?)([^%"']*)(\1)?$/);
    if (pathMatch) {
      const openQuote = pathMatch[1];
      const typed = pathMatch[2] ?? "";
      const closeQuotePresent = pathMatch[3];
      const images = this.index.getImages();

      const endChar = position.character - (closeQuotePresent ? 1 : 0);
      const startChar = endChar - typed.length;
      const range = new vscode.Range(position.line, startChar, position.line, endChar);

      return images
        .filter((image) => image.toLowerCase().startsWith(typed.toLowerCase()))
        .map((image) => {
          const item = new vscode.CompletionItem(image, vscode.CompletionItemKind.File);
          // Close the opening quote; don't add a closing quote if one is already typed
          item.insertText = image + (closeQuotePresent ? "" : (openQuote || ""));
          item.range = range;
          item.sortText = image.toLowerCase();
          item.detail = "ImgFlow original";
          return item;
        });
    }

    // 2. Parameter completion: {% imgflow "..." <partial
    const paramMatch = textBefore.match(/\{%\s*imgflow\s+(?:["'][^"']+["'])\s+([^%}]*)$/);
    if (paramMatch) {
      const tail = paramMatch[1] ?? "";
      const parts = tail.split(/\s+/);
      const typed = parts[parts.length - 1] ?? "";
      const startChar = position.character - typed.length;
      const range = new vscode.Range(position.line, startChar, position.line, position.character);

      return PARAM_COMPLETIONS.filter((param) =>
        param.label.toLowerCase().startsWith(typed.toLowerCase())
      ).map((param) => {
        const item = new vscode.CompletionItem(param.label, param.kind ?? vscode.CompletionItemKind.Property);
        item.insertText = param.insertText;
        item.detail = param.detail;
        item.range = range;
        item.sortText = param.label.toLowerCase();
        return item;
      });
    }

    return [];
  }
}
