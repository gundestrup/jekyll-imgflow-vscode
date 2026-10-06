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

type DocTag = "doc_link" | "doc_category" | "document_icon" | "latest_documents";

interface ParamCompletion {
  label: string;
  insertText?: string | vscode.SnippetString;
  detail: string;
}

const QUOTED_PATTERNS: Partial<Record<DocTag, RegExp>> = {
  doc_link: /\{%\s*doc_link\s+(["'])([^"']*)(\1)?$/,
  doc_category: /\{%\s*doc_category\s+(["'])([^"']*)(\1)?$/,
};

const BARE_PATTERNS: Partial<Record<DocTag, RegExp>> = {
  doc_link: /\{%\s*doc_link\s+([^\s%}]*)$/,
  doc_category: /\{%\s*doc_category\s+([^\s%}]*)$/,
  // document_icon takes a Liquid expression (page, doc, include.x), not
  // a title — complete the common variables instead of document names.
  document_icon: /\{%\s*document_icon\s+([^\s%}]*)$/,
};

// Parameter phase: the first argument is complete (closed quote or a
// bare token followed by whitespace) and the cursor sits in key:value
// territory. latest_documents has no positional argument — straight
// to params. Sequential anchored matches + slice instead of an
// alternation with a greedy tail (SonarCloud S8786: no backtracking).
const TAG_HEADS: Record<DocTag, RegExp> = {
  doc_link: /\{%\s*doc_link\s+/g,
  doc_category: /\{%\s*doc_category\s+/g,
  document_icon: /\{%\s*document_icon\s+/g,
  latest_documents: /\{%\s*latest_documents\s+/g,
};

// Everything after the tag's first positional argument and its trailing
// whitespace; null when that boundary is not crossed or the tail closes
// the tag. Each {% occurrence is tried in order, matching the original
// end-anchored regex's leftmost-wins behaviour.
function paramTail(textBefore: string, tag: DocTag): string | null {
  for (const head of textBefore.matchAll(TAG_HEADS[tag])) {
    const rest = textBefore.slice((head.index ?? 0) + head[0].length);
    const tail = tag === "latest_documents" ? rest : afterFirstArgument(tag, rest);
    if (tail !== null && !/[%}]/.test(tail)) {
      return tail;
    }
  }
  return null;
}

// Consumes the positional argument (closed quote or bare token) plus the
// whitespace after it; returns the remaining tail, or null when the
// argument is still being typed.
function afterFirstArgument(tag: DocTag, rest: string): string | null {
  const argumentEnd =
    (tag !== "document_icon"
      ? rest.match(/^"[^"]*"\s/) ?? rest.match(/^'[^']*'\s/)
      : null) ?? rest.match(/^[^\s%}]+\s/);
  return argumentEnd ? rest.slice(argumentEnd[0].length) : null;
}

const DOC_ICON_EXPRESSIONS = ["page", "doc", "include.doc", "include.document"];

const PARAM_COMPLETIONS: Record<DocTag, ParamCompletion[]> = {
  doc_link: [
    { label: 'text:"…"', insertText: new vscode.SnippetString('text:"$1"'), detail: "Link text (default: document title)" },
    { label: "icon:false", detail: "Hide the file-type icon" },
    { label: "size:false", detail: "Hide the file size" },
    { label: "path:", detail: "Exact source path — disambiguates duplicate titles; completes real paths" },
  ],
  doc_category: [
    { label: "list:true", detail: "Render the category's document list" },
    { label: "limit:", insertText: new vscode.SnippetString("limit:$1"), detail: "Cap the list at N documents" },
    { label: 'text:"…"', insertText: new vscode.SnippetString('text:"$1"'), detail: "Link text (default: category name)" },
    { label: "path:", detail: "Exact category path (e.g. Departments/Europe/Reports); completes real paths" },
    { label: "aggregate:true", detail: "With list:true — merge repeated short category names" },
  ],
  document_icon: [
    { label: 'alt:"…"', insertText: new vscode.SnippetString('alt:"$1"'), detail: "Alt text (default: '<TYPE> file')" },
    { label: "class:", insertText: new vscode.SnippetString('class:"$1"'), detail: "CSS class (default: document-file-icon)" },
  ],
  latest_documents: [
    { label: "count:", insertText: new vscode.SnippetString("count:$1"), detail: "How many documents (default: latest_default_count or 5)" },
    { label: "category:", detail: "Restrict to one category — completes category names" },
  ],
};

// Params whose value completes against the workspace index.
const VALUE_COMPLETION_PARAMS: Partial<Record<DocTag, Record<string, "document" | "category" | "categoryPath">>> = {
  doc_link: { "path:": "document" },
  doc_category: { "path:": "categoryPath" },
  latest_documents: { "category:": "category" },
};

function argumentMatch(
  textBefore: string,
  position: vscode.Position,
  tag: DocTag
): ArgumentMatch | null {
  const quotedRe = QUOTED_PATTERNS[tag];
  const quoted = quotedRe ? textBefore.match(quotedRe) : null;
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

  const bareRe = BARE_PATTERNS[tag];
  const bare = bareRe ? textBefore.match(bareRe) : null;
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

    const iconMatch = argumentMatch(textBefore, position, "document_icon");
    if (iconMatch) {
      return this.expressionCompletions(iconMatch);
    }

    // Parameter phase: key:value after the positional argument (or
    // immediately for latest_documents, which has none).
    for (const tag of Object.keys(TAG_HEADS) as DocTag[]) {
      const tail = paramTail(textBefore, tag);
      if (tail !== null) {
        return this.paramCompletions(tag, tail, position);
      }
    }
    return [];
  }

  private paramCompletions(
    tag: DocTag,
    tail: string,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const tokens = tail.split(/\s+/);
    const typed = tokens[tokens.length - 1] ?? "";
    const range = new vscode.Range(
      position.line,
      position.character - typed.length,
      position.line,
      position.character
    );

    // key:value completion — path:/category: resolve real index values
    const colon = typed.indexOf(":");
    if (colon > 0) {
      const key = typed.slice(0, colon + 1);
      const partial = typed.slice(colon + 1).replace(/^["']/, "");
      const source = VALUE_COMPLETION_PARAMS[tag]?.[key];
      if (source) {
        return this.valueCompletions(key, source, partial, range);
      }
    }

    return PARAM_COMPLETIONS[tag]
      .filter((param) => param.label.toLowerCase().startsWith(typed.toLowerCase()))
      .map((param) => {
        const item = new vscode.CompletionItem(param.label, vscode.CompletionItemKind.Property);
        item.insertText = param.insertText ?? param.label;
        item.detail = param.detail;
        item.range = range;
        item.sortText = param.label.toLowerCase();
        return item;
      });
  }

  private valueCompletions(
    key: string,
    source: "document" | "category" | "categoryPath",
    partial: string,
    range: vscode.Range
  ): vscode.CompletionItem[] {
    const categories = this.index.getCategories();
    const values = source === "document"
      ? this.index.getDocuments().map((entry) => entry.sourcePath)
      : source === "categoryPath"
        ? categories.map((category) => category.path)
        : categories.map((category) => category.name);

    return values
      .filter((value) => value.toLowerCase().startsWith(partial.toLowerCase()))
      .map((value) => {
        const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
        const quote = value.includes("\"") && !value.includes("'") ? "'" : "\"";
        item.insertText = `${key}${quote}${value}${quote}`;
        item.detail = source === "document" ? "Document source path" : "Document category";
        item.range = range;
        item.sortText = value.toLowerCase();
        return item;
      });
  }

  private expressionCompletions(match: ArgumentMatch): vscode.CompletionItem[] {
    return DOC_ICON_EXPRESSIONS
      .filter((expression) => expression.startsWith(match.typed))
      .map((expression) => {
        const item = new vscode.CompletionItem(expression, vscode.CompletionItemKind.Variable);
        item.insertText = expression;
        item.detail = "Document expression";
        item.range = match.range;
        item.sortText = expression;
        return item;
      });
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
