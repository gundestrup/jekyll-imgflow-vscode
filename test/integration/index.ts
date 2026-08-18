import * as path from "node:path";
import Mocha from "mocha";
import * as vscode from "vscode";
import * as assert from "node:assert";

const FIXTURE_ROOT = path.resolve(__dirname, "..", "..", "..", "test", "fixtures", "jekyll-site");

async function waitForExtension(): Promise<void> {
  const extension = vscode.extensions.getExtension("gundestrup.jekyll-imgflow");
  if (!extension) {
    throw new Error("Extension gundestrup.jekyll-imgflow not found");
  }
  if (!extension.isActive) {
    await extension.activate();
  }
}

async function openDocument(relativePath: string): Promise<vscode.TextDocument> {
  const uri = vscode.Uri.file(path.join(FIXTURE_ROOT, relativePath));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  return document;
}

function findPosition(document: vscode.TextDocument, searchText: string): vscode.Position {
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const index = line.text.indexOf(searchText);
    if (index !== -1) {
      return new vscode.Position(i, index + searchText.length);
    }
  }
  throw new Error(`Text "${searchText}" not found in document`);
}

function findLastPosition(document: vscode.TextDocument, searchText: string): vscode.Position {
  for (let i = document.lineCount - 1; i >= 0; i--) {
    const line = document.lineAt(i);
    const index = line.text.indexOf(searchText);
    if (index !== -1) {
      return new vscode.Position(i, index + searchText.length);
    }
  }
  throw new Error(`Text "${searchText}" not found in document`);
}

async function getCompletions(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.CompletionList> {
  return vscode.commands.executeCommand<vscode.CompletionList>(
    "vscode.executeCompletionItemProvider",
    document.uri,
    position
  );
}

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "tdd", color: true, timeout: 30000 });

  mocha.suite.emit("pre-require", global, __filename, mocha);

  suite("Jekyll ImgFlow Integration", () => {
    suiteSetup(async () => {
      await waitForExtension();
    });

    test("extension activates in a Jekyll workspace", async () => {
      const extension = vscode.extensions.getExtension("gundestrup.jekyll-imgflow");
      assert.ok(extension, "Extension should be present");
      assert.ok(extension!.isActive, "Extension should be active");
    });

    test("suggests image filenames after {% imgflow %} in Markdown", async () => {
      const document = await openDocument("index.md");
      const position = findPosition(document, "{% imgflow ");
      const completions = await getCompletions(document, position);

      const labels = completions.items.map((item) => item.label);
      assert.ok(labels.length > 0, "Image completion should return at least one item");
      assert.ok(
        labels.some((label) => label.toString() === "hero.jpg"),
        `Completions should include hero.jpg, got: ${labels.join(", ")}`
      );
      const heroItem = completions.items.find((item) => item.label.toString() === "hero.jpg");
      assert.ok(heroItem, "hero.jpg completion item should be present");
      assert.equal(heroItem.insertText?.toString(), "hero.jpg");
      assert.ok(
        labels.some((label) => label.toString().includes("photo.png")),
        `Completions should include photo.png, got: ${labels.join(", ")}`
      );
    });

    test("closes an open image quote in the inserted completion", async () => {
      const document = await openDocument("index.md");
      const position = findLastPosition(document, "{% imgflow \"he");
      const completions = await getCompletions(document, position);
      const heroItem = completions.items.find((item) => item.label.toString() === "hero.jpg");

      assert.ok(heroItem, "hero.jpg completion item should be present");
      assert.equal(heroItem.insertText?.toString(), "hero.jpg\"");
    });

    test("suggests nested image filenames", async () => {
      const document = await openDocument("index.md");
      const position = findPosition(document, "{% imgflow ");
      const completions = await getCompletions(document, position);

      const labels = completions.items.map((item) => item.label);
      assert.ok(labels.length > 0, "Image completion should return at least one item");
      assert.ok(
        labels.some((label) => label.toString() === "nested/landscape.jpeg"),
        `Completions should include nested/landscape.jpeg, got: ${labels.join(", ")}`
      );
    });

    test("suggests parameter completions after the image path", async () => {
      const document = await openDocument("index.md");
      const position = findPosition(document, "{% imgflow \"hero.jpg\" ");
      const completions = await getCompletions(document, position);

      const labels = completions.items.map((item) => item.label);
      assert.ok(labels.length > 0, "Parameter completion should return at least one item");
      assert.ok(
        labels.some((label) => label.toString() === "width:400"),
        `Completions should include width: parameters, got: ${labels.join(", ")}`
      );
      assert.ok(
        labels.some((label) => label.toString() === "format:webp"),
        `Completions should include format: parameters, got: ${labels.join(", ")}`
      );
    });

    test("works in Liquid files", async () => {
      const document = await openDocument("page.liquid");
      const position = findPosition(document, "{% imgflow ");
      const completions = await getCompletions(document, position);

      const labels = completions.items.map((item) => item.label);
      assert.ok(labels.length > 0, "Liquid completion should return at least one item");
      assert.ok(
        labels.some((label) => label.toString() === "diagram.webp"),
        `Completions should include diagram.webp in Liquid files, got: ${labels.join(", ")}`
      );
    });

    test("filters completions by typed text", async () => {
      const document = await openDocument("index.md");
      const position = findLastPosition(document, "{% imgflow \"he");
      const completions = await getCompletions(document, position);
      const labels = completions.items
        .map((item) => item.label)
        .filter((label): label is string => typeof label === "string");
      assert.ok(labels.length > 0, "Filtered completion should return at least one item");
      assert.ok(labels.includes("hero.jpg"), "Filtered completion should include hero.jpg");
      assert.equal(new Set(labels).size, labels.length, "Filtered completions should not be duplicated");

      for (const label of labels) {
        assert.ok(
          label.toLowerCase().startsWith("he"),
          `Completion "${label}" should start with "he" when filtering, got: ${labels.join(", ")}`
        );
      }
    });

    suiteTeardown(async () => {
      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    });
  });

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} integration test(s) failed`));
      } else {
        resolve();
      }
    });
  });
}
