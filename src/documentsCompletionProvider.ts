import * as vscode from "vscode";
import type { DocumentEntry } from "./documentFiles";
import { DocumentIndex } from "./documentIndex";

interface ArgumentMatch {
  typed: string;
  quote: string;
  closeQuotePresent: boolean;
  range: vscode.Range;
  wholeRange: vscode.Range;
}

function argumentMatch(
  textBefore: string,
  position: vscode.Position,
  tag: "doc_link" | "doc_category"
): ArgumentMatch | null {
  const quoted = textBefore.match(new RegExp(`\\{%\\s*${tag}\\s+(["'])([^"']*)(\\1)?$`));
  if (quoted) {
    const typed = quoted[2] ?? "";
    const closeQuotePresent = Boolean(quoted[3]);
    const endCharacter = position.character - (closeQuotePresent ? 1 : 0);
    const openingQuoteOffset = quoted[0].indexOf(quoted[1] ?? "\"");
    const argumentStart = (quoted.index ?? 0) + openingQuoteOffset;
    return {
      typed,
      quote: quoted[1] ?? "\"",
      closeQuotePresent,
      range: new vscode.Range(position.line, endCharacter - typed.length, position.line, endCharacter),
      wholeRange: new vscode.Range(position.line, argumentStart, position.line, position.character),
    };
  }

  const bare = textBefore.match(new RegExp(`\\{%\\s*${tag}\\s+([^\\s%}]*)$`));
  if (!bare) {
    return null;
  }
  const typed = bare[1] ?? "";
  const argumentStart = position.character - typed.length;
  return {
    typed,
    quote: "",
    closeQuotePresent: false,
    range: new vscode.Range(position.line, argumentStart, position.line, position.character),
    wholeRange: new vscode.Range(position.line, argumentStart, position.line, position.character),
  };
}

function insertedValue(value: string, match: ArgumentMatch): string {
  if (match.quote) {
    return value + (match.closeQuotePresent ? "" : match.quote);
  }
  const quote = value.includes("\"") && !value.includes("'") ? "'" : "\"";
  return `${quote}${value}${quote}`;
}

function pathValue(prefix: string, value: string): string {
  return `${prefix}:"${value}"`;
}

export class DocumentsCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly index: DocumentIndex) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    const textBefore = document.lineAt(position).text.slice(0, position.character);
    const linkMatch = argumentMatch(textBefore, position, "doc_link");
    if (linkMatch) {
      return this.documentCompletions(linkMatch);
    }

    const categoryMatch = argumentMatch(textBefore, position, "doc_category");
    if (categoryMatch) {
      return this.categoryCompletions(categoryMatch);
    }
    return [];
  }

  private documentCompletions(match: ArgumentMatch): vscode.CompletionItem[] {
    const documents = this.index.getDocuments();
    const titleCounts = new Map<string, number>();
    for (const entry of documents) {
      const key = entry.title.toLowerCase();
      titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
    }

    return documents
      .filter((entry) => entry.title.toLowerCase().startsWith(match.typed.toLowerCase()))
      .filter((entry) => !match.quote || !entry.title.includes(match.quote))
      .map((entry) => this.documentCompletion(
        entry,
        match,
        (titleCounts.get(entry.title.toLowerCase()) ?? 0) > 1
      ));
  }

  private documentCompletion(
    entry: DocumentEntry,
    match: ArgumentMatch,
    duplicate: boolean
  ): vscode.CompletionItem {
    const item = new vscode.CompletionItem(entry.title, vscode.CompletionItemKind.Reference);
    const metadata = [entry.category, entry.date, entry.extension.slice(1).toUpperCase()]
      .filter(Boolean)
      .join(" · ");
    item.insertText = duplicate
      ? pathValue("path", entry.sourcePath)
      : insertedValue(entry.title, match);
    item.range = duplicate ? match.wholeRange : match.range;
    item.detail = `Jekyll document · ${metadata}${duplicate ? " · path reference" : ""}`;
    item.documentation = entry.sourcePath;
    item.sortText = `${entry.title.toLowerCase()}\u0000${entry.sourcePath.toLowerCase()}`;
    return item;
  }

  private categoryCompletions(match: ArgumentMatch): vscode.CompletionItem[] {
    const categories = this.index.getCategories();
    const categoryCounts = new Map<string, number>();
    for (const category of categories) {
      const key = category.name.toLowerCase();
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }

    return categories
      .filter((category) => category.name.toLowerCase().startsWith(match.typed.toLowerCase()))
      .filter((category) => !match.quote || !category.name.includes(match.quote))
      .map((category) => {
        const duplicate = (categoryCounts.get(category.name.toLowerCase()) ?? 0) > 1;
        const item = new vscode.CompletionItem(category.name, vscode.CompletionItemKind.Folder);
        item.insertText = duplicate
          ? pathValue("path", category.path)
          : insertedValue(category.name, match);
        item.range = duplicate ? match.wholeRange : match.range;
        item.detail = duplicate
          ? `Jekyll document category · path reference`
          : "Jekyll document category";
        item.documentation = category.path;
        item.sortText = `${category.name.toLowerCase()}\u0000${category.path.toLowerCase()}`;
        return item;
      });
  }
}
