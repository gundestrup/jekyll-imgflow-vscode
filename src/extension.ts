import * as vscode from "vscode";
import { ImageIndex } from "./imageIndex";
import { ImgflowCompletionProvider } from "./completionProvider";

const IMG_TAG_PATTERN = /\{%\s*imgflow\s/;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const index = new ImageIndex(workspaceRoot);
  await index.refresh();
  index.registerWatchers(context);

  const provider = new ImgflowCompletionProvider(index);

  const markdownProvider = vscode.languages.registerCompletionItemProvider(
    { language: "markdown" },
    provider,
    " "
  );

  const liquidProvider = vscode.languages.registerCompletionItemProvider(
    { language: "liquid", scheme: "file" },
    provider,
    " "
  );

  context.subscriptions.push(markdownProvider, liquidProvider);

  // Also trigger on common image-name characters so the list refines as the user types
  const triggerChars = [
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    ".", "-", "_", "/",
  ];

  for (const char of triggerChars) {
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider({ language: "markdown" }, provider, char)
    );
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider({ language: "liquid", scheme: "file" }, provider, char)
    );
  }

  // Optional: show a status item when inside an imgflow tag
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.text = "ImgFlow";
  status.tooltip = "Jekyll ImgFlow image suggestions";
  status.command = undefined;
  context.subscriptions.push(status);

  vscode.window.onDidChangeTextEditorSelection((event) => {
    if (!event.textEditor) {
      status.hide();
      return;
    }
    const doc = event.textEditor.document;
    const pos = event.textEditor.selection.active;
    const line = doc.lineAt(pos).text;
    status.text = IMG_TAG_PATTERN.test(line) ? "$(sync~spin) ImgFlow ready" : "ImgFlow";
    status.show();
  });
}

export function deactivate(): void {
  // No explicit teardown required; all disposables are managed by context
}

function getWorkspaceRoot(): string | null {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return null;
  }
  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}
