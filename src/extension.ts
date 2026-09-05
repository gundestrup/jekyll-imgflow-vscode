import * as vscode from "vscode";
import { ImgflowCompletionProvider } from "./completionProvider";
import { DocumentsCompletionProvider } from "./documentsCompletionProvider";
import { WorkspaceIndexes } from "./workspaceIndexes";

const IMG_TAG_PATTERN = /\{%\s*imgflow\s/;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log("[Jekyll ImgFlow] activate() started");

  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage("Jekyll ImgFlow: no workspace folder open.");
    console.log("[Jekyll ImgFlow] no workspace folder");
    return;
  }

  console.log(`[Jekyll ImgFlow] workspace root: ${workspaceRoot}`);

  const indexes = new WorkspaceIndexes(workspaceRoot);
  context.subscriptions.push(indexes);
  try {
    await indexes.initialize();
  } catch (error) {
    console.error("[Jekyll Autocomplete] refresh failed:", error);
    vscode.window.showErrorMessage(`Jekyll autocomplete refresh failed: ${error}`);
  }

  const provider = new ImgflowCompletionProvider(indexes.images);
  const documentsProvider = new DocumentsCompletionProvider(indexes.documents);

  // Also trigger on common image-name characters so the list refines as the user types
  const triggerChars = [
    " ",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    ".", "-", "_", "/", "\"", "'", ",", ":",
  ];

  const markdownProvider = vscode.languages.registerCompletionItemProvider(
    { language: "markdown" },
    provider,
    ...triggerChars
  );

  const liquidProvider = vscode.languages.registerCompletionItemProvider(
    { language: "liquid", scheme: "file" },
    provider,
    ...triggerChars
  );
  const markdownDocumentsProvider = vscode.languages.registerCompletionItemProvider(
    { language: "markdown" },
    documentsProvider,
    ...triggerChars
  );
  const liquidDocumentsProvider = vscode.languages.registerCompletionItemProvider(
    { language: "liquid", scheme: "file" },
    documentsProvider,
    ...triggerChars
  );

  context.subscriptions.push(
    markdownProvider,
    liquidProvider,
    markdownDocumentsProvider,
    liquidDocumentsProvider
  );

  // Optional: show a status item when inside an imgflow tag
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.text = "ImgFlow";
  status.tooltip = "Jekyll ImgFlow image suggestions";
  status.command = undefined;
  context.subscriptions.push(status);

  const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
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
  context.subscriptions.push(selectionListener);
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
