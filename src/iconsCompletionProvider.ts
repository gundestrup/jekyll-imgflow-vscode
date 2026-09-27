import * as vscode from "vscode";
import { IconIndex } from "./iconIndex";

// {% icon %} (config default pack), per-pack {% icon_<pack> %} and
// {% <pack>_icon %} alias tags, plus {% icon_ref %} registry lookups.
const TAG_PATTERN = /\{%\s*(icon_ref|icon_(?:lucide|simple|custom)|(?:lucide|simple|custom)_icon|icon)(?=[\s%}]|$)/;
const BOUND_PACKS: Record<string, string> = {
  icon_lucide: "lucide", lucide_icon: "lucide",
  icon_simple: "simple", simple_icon: "simple",
  icon_custom: "custom", custom_icon: "custom",
};

// Bare tokens that look like Liquid variable paths (include.name,
// page.icon[0]) are not icon names — leave them to other providers.
const VAR_PATH = /^[A-Za-z_]\S*[.[\]]/;

// Named sizes supported by the gem's adapter (all relative to the
// surrounding text; m = 1em is the line-height default).
const NAMED_SIZES: Array<[string, string]> = [
  ["xxs", "0.5em"], ["xs", "0.75em"], ["s", "0.875em"],
  ["m", "1em — default, fits the line height"],
  ["l", "1.25em"], ["xl", "1.5em"], ["xxl", "2em"],
];

export class IconsCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly index: IconIndex) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    const config = this.index.getConfig();
    if (!config || !config.enabled) {
      return [];
    }

    const textBefore = document.lineAt(position).text.slice(0, position.character);
    const tagMatch = textBefore.match(TAG_PATTERN);
    if (!tagMatch) {
      return [];
    }
    const tag = tagMatch[1];
    const rest = textBefore.slice((tagMatch.index ?? 0) + tagMatch[0].length);

    // Name position: nothing, a partial quoted name, or a bare partial
    const quoted = rest.match(/^\s+(["'])([^"']*)$/);
    if (quoted) {
      return this.nameCompletions(tag, config.pack, quoted[2] ?? "", quoted[1], position);
    }
    const bare = rest.match(/^\s*([^\s%}"']*)$/);
    if (bare) {
      const typed = bare[1] ?? "";
      if (VAR_PATH.test(typed)) {
        return [];
      }
      return this.nameCompletions(tag, config.pack, typed, "", position);
    }

    // Parameter position: first token complete, cursor in later markup
    const paramZone = rest.match(/^\s+(?:["'][^"']*["']|[^\s]+)\s+([\s\S]*)$/);
    if (paramZone) {
      const tail = paramZone[1] ?? "";
      const typed = tail.split(/\s+/).pop() ?? "";
      const startChar = position.character - typed.length;
      const range = new vscode.Range(position.line, startChar, position.line, position.character);
      return this.paramCompletions(tag, typed, range);
    }

    return [];
  }

  private nameCompletions(
    tag: string,
    defaultPack: string,
    typed: string,
    quote: string,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const range = new vscode.Range(
      position.line, position.character - typed.length, position.line, position.character
    );

    if (tag === "icon_ref") {
      return Object.entries(this.index.getRegistry())
        .filter(([key]) => key.startsWith(typed))
        .map(([key, target]) => {
          const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.EnumMember);
          item.insertText = key + quote;
          item.range = range;
          item.detail = `icon_flow registry · ${target}`;
          item.sortText = key;
          return item;
        });
    }

    const pack = tag === "icon" ? defaultPack : BOUND_PACKS[tag];
    return this.index.getIcons(pack)
      .filter((name) => name.startsWith(typed))
      .map((name) => {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Value);
        item.insertText = name + quote;
        item.range = range;
        item.detail = `icon_flow · ${pack} pack`;
        item.sortText = name;
        return item;
      });
  }

  private paramCompletions(
    tag: string,
    typed: string,
    range: vscode.Range
  ): vscode.CompletionItem[] {
    const candidates: Array<{ label: string; detail: string; insertText?: string | vscode.SnippetString }> = [
      ...NAMED_SIZES.map(([name, em]): { label: string; detail: string } => ({
        label: `size:${name}`, detail: `Named size · ${em}`,
      })),
      { label: "size:", detail: "Custom CSS size — e.g. 1.5em, 24px" },
      { label: "class:", detail: "CSS classes merged onto the <svg>", insertText: new vscode.SnippetString('class:"$1"') },
      { label: "title:", detail: "Accessible label — renders <title> inside the SVG", insertText: new vscode.SnippetString('title:"$1"') },
    ];
    if (tag === "icon") {
      for (const pack of ["lucide", "simple", "custom"]) {
        candidates.push({ label: `pack:${pack}`, detail: "Render via this pack adapter" });
      }
    }

    return candidates
      .filter((candidate) => candidate.label.startsWith(typed))
      .map((candidate) => {
        const item = new vscode.CompletionItem(candidate.label, vscode.CompletionItemKind.Property);
        item.insertText = candidate.insertText ?? candidate.label;
        item.detail = candidate.detail;
        item.range = range;
        item.sortText = candidate.label;
        return item;
      });
  }
}
