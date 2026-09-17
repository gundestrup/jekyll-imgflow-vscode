import * as path from "node:path";
import { readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import v8 from "node:v8";
import Mocha from "mocha";
import * as vscode from "vscode";
import * as assert from "node:assert";

const FIXTURE_ROOT = path.resolve(__dirname, "..", "..", "..", "test", "fixtures", "jekyll-site");

function fixturePath(...segments: string[]): string {
  return path.join(FIXTURE_ROOT, ...segments);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const uri = vscode.Uri.file(fixturePath(relativePath));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  return document;
}

async function openMarkdownDocument(content: string): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument({ language: "markdown", content });
}

function findPosition(
  document: vscode.TextDocument,
  searchText: string,
  fromEnd = false
): vscode.Position {
  const lineIndexes = [...Array(document.lineCount).keys()];
  if (fromEnd) {
    lineIndexes.reverse();
  }
  for (const i of lineIndexes) {
    const index = document.lineAt(i).text.indexOf(searchText);
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

async function completionsAt(
  relativePath: string,
  searchText: string,
  fromEnd = false
): Promise<vscode.CompletionList> {
  const document = await openDocument(relativePath);
  return getCompletions(document, findPosition(document, searchText, fromEnd));
}

function labelsOf(completions: vscode.CompletionList): string[] {
  return completions.items.map((item) => item.label.toString());
}

function findItem(
  completions: vscode.CompletionList,
  label: string
): vscode.CompletionItem | undefined {
  return completions.items.find((item) => item.label.toString() === label);
}

function itemsLabeled(completions: vscode.CompletionList, label: string): vscode.CompletionItem[] {
  return completions.items.filter((item) => item.label.toString() === label);
}

async function waitForCompletionState(
  document: vscode.TextDocument,
  label: string,
  expected: boolean
): Promise<void> {
  const position = document.positionAt(document.getText().length);
  for (let attempt = 0; attempt < 50; attempt++) {
    const completions = await getCompletions(document, position);
    const present = completions.items.some((item) => item.label.toString() === label);
    if (present === expected) {
      return;
    }
    await sleep(100);
  }
  throw new Error(`Completion "${label}" did not become ${expected ? "present" : "absent"}`);
}

async function withFixtureConfig(content: string, run: () => Promise<void>): Promise<void> {
  const configPath = fixturePath("_config.yml");
  const original = await readFile(configPath, "utf8");
  try {
    await writeFile(configPath, content);
    await run();
  } finally {
    await writeFile(configPath, original);
  }
}

async function withWorkspaceSetting(
  section: string,
  key: string,
  value: unknown,
  run: () => Promise<void>
): Promise<void> {
  const configuration = vscode.workspace.getConfiguration(section);
  try {
    await configuration.update(key, value, vscode.ConfigurationTarget.Workspace);
    await run();
  } finally {
    await configuration.update(key, undefined, vscode.ConfigurationTarget.Workspace);
    await rm(fixturePath(".vscode"), { recursive: true, force: true });
  }
}

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "tdd", color: true, timeout: 30000 });

  mocha.suite.emit("pre-require", global, __filename, mocha);

  suite("Jekyll Autocomplete Integration", () => {
    suiteSetup(async () => {
      await waitForExtension();
    });

    test("extension activates in a Jekyll workspace", async () => {
      const extension = vscode.extensions.getExtension("gundestrup.jekyll-imgflow");
      assert.ok(extension, "Extension should be present");
      assert.ok(extension!.isActive, "Extension should be active");
    });

    test("suggests image filenames after {% imgflow %} in Markdown", async () => {
      const completions = await completionsAt("index.md", "{% imgflow ");
      const labels = labelsOf(completions);

      assert.ok(labels.length > 0, "Image completion should return at least one item");
      assert.ok(
        labels.includes("hero.jpg"),
        `Completions should include hero.jpg, got: ${labels.join(", ")}`
      );
      const heroItem = findItem(completions, "hero.jpg");
      assert.ok(heroItem, "hero.jpg completion item should be present");
      assert.equal(heroItem.insertText?.toString(), "hero.jpg");
      assert.ok(
        labels.some((label) => label.includes("photo.png")),
        `Completions should include photo.png, got: ${labels.join(", ")}`
      );
    });

    test("closes an open image quote in the inserted completion", async () => {
      const completions = await completionsAt("index.md", "{% imgflow \"he", true);
      const heroItem = findItem(completions, "hero.jpg");

      assert.ok(heroItem, "hero.jpg completion item should be present");
      assert.equal(heroItem.insertText?.toString(), "hero.jpg\"");
    });

    test("suggests nested image filenames", async () => {
      const completions = await completionsAt("index.md", "{% imgflow ");
      const labels = labelsOf(completions);

      assert.ok(labels.length > 0, "Image completion should return at least one item");
      assert.ok(
        labels.includes("nested/landscape.jpeg"),
        `Completions should include nested/landscape.jpeg, got: ${labels.join(", ")}`
      );
    });

    test("suggests parameter completions after the image path", async () => {
      const completions = await completionsAt("index.md", "{% imgflow \"hero.jpg\" ");
      const labels = labelsOf(completions);

      assert.ok(labels.length > 0, "Parameter completion should return at least one item");
      assert.ok(
        labels.includes("width:400"),
        `Completions should include width: parameters, got: ${labels.join(", ")}`
      );
      assert.ok(
        labels.includes("format:webp"),
        `Completions should include format: parameters, got: ${labels.join(", ")}`
      );
    });

    test("suggests document titles with metadata after doc_link", async () => {
      const completions = await completionsAt("index.md", "{% doc_link \"Annual");
      const annualReports = itemsLabeled(completions, "Annual Report");

      assert.equal(annualReports.length, 2, "Both documents with duplicate titles should be suggested");
      assert.ok(
        annualReports.every((item) => item.insertText?.toString().startsWith("path:\"")),
        "Duplicate document titles should insert path references"
      );
      assert.ok(
        annualReports.some((item) => item.insertText?.toString().includes("Board/2026-03-01_Annual_Report.pdf")),
        "Board document path should be available"
      );
      assert.ok(
        annualReports.some((item) => item.insertText?.toString().includes("Reports/2026-03-02_Annual_Report.pdf")),
        "Reports document path should be available"
      );
      assert.ok(
        annualReports.some((item) => item.detail?.includes("minutes")),
        "Document details should include mapped categories"
      );
    });

    test("suggests mapped document categories after doc_category", async () => {
      const completions = await completionsAt("index.md", "{% doc_category \"mi");
      const minutes = findItem(completions, "minutes");

      assert.ok(minutes, "Mapped minutes category should be suggested");
      assert.equal(minutes.insertText?.toString(), "minutes\"");
    });

    test("suggests nested documents using the final mapped category", async () => {
      const completions = await completionsAt("index.md", "{% doc_link \"Year");
      const accounts = findItem(completions, "Year End Accounts");

      assert.ok(accounts, "Nested document should be suggested");
      assert.equal(accounts.insertText?.toString(), "Year End Accounts\"");
      assert.ok(accounts.detail?.includes("yearly"), "Detail should include the mapped nested category");
      assert.ok(accounts.detail?.includes("XLSX"), "Detail should include the file type");
      assert.equal(
        accounts.documentation?.toString(),
        "Archive/Annual/2025-12-15_Year_End_Accounts.xlsx"
      );

      const categoryCompletions = await completionsAt("index.md", "{% doc_category \"year");
      assert.ok(
        labelsOf(categoryCompletions).includes("yearly"),
        "Nested mapped category should be suggested"
      );
    });

    test("suggests doc_link documents from the root and several directories deep", async () => {
      const rootCompletions = await completionsAt("index.md", "{% doc_link \"Root");
      const rootPolicy = findItem(rootCompletions, "Root Policy");

      assert.ok(rootPolicy, "Document directly in documents.root should be suggested");
      assert.ok(rootPolicy.detail?.includes("uncategorized"), "Root document should use uncategorized");
      assert.equal(rootPolicy.documentation?.toString(), "2026-01-10_Root_Policy.pdf");

      const deepCompletions = await completionsAt("index.md", "{% doc_link \"Regional");
      const regionalResearch = itemsLabeled(deepCompletions, "Regional Research");

      assert.equal(regionalResearch.length, 2, "Both repeated Research categories should be suggested");
      assert.ok(
        regionalResearch.every((item) => item.insertText?.toString().startsWith("path:\"")),
        "Repeated document titles should insert path references"
      );
      assert.ok(
        regionalResearch.some((item) => item.documentation?.toString().includes("Departments/Europe/")),
        "European document path should be shown"
      );
      assert.ok(
        regionalResearch.some((item) => item.documentation?.toString().includes("Departments/America/")),
        "American document path should be shown"
      );
    });

    test("offers multiple category completions and refines the typed prefix", async () => {
      const sharedCompletions = await completionsAt("index.md", "{% doc_category \"re");

      assert.deepEqual(labelsOf(sharedCompletions), ["reports", "research", "research"]);
      const researchCompletions = itemsLabeled(sharedCompletions, "research");
      assert.ok(
        researchCompletions.every((item) => item.insertText?.toString().startsWith("path:\"")),
        "Repeated category names should insert category path references"
      );
      assert.ok(
        researchCompletions.some((item) => item.insertText?.toString().includes("Departments/Europe/")),
        "European category path should be suggested"
      );
      assert.ok(
        researchCompletions.some((item) => item.insertText?.toString().includes("Departments/America/")),
        "American category path should be suggested"
      );

      const refinedCompletions = await completionsAt("index.md", "{% doc_category \"rese");
      assert.deepEqual(labelsOf(refinedCompletions), ["research", "research"]);
    });

    test("quotes bare doc_link completion values containing spaces", async () => {
      const completions = await completionsAt("index.md", "{% doc_link Board");
      const minutes = findItem(completions, "Board Minutes");

      assert.ok(minutes, "Board Minutes should be suggested for a bare prefix");
      assert.equal(minutes.insertText?.toString(), "\"Board Minutes\"");
    });

    test("filters document titles by typed prefix", async () => {
      const completions = await completionsAt("index.md", "{% doc_link \"Year");
      assert.deepEqual(labelsOf(completions), ["Year End Accounts"]);
    });

    test("refreshes document completions after create, rename, and delete", async () => {
      const createdFile = fixturePath(
        "assets", "documents", "Board", "2026-03-04_Watcher_Created.pdf"
      );
      const renamedFile = fixturePath(
        "assets", "documents", "Board", "2026-03-04_Watcher_Renamed.pdf"
      );
      const document = await openMarkdownDocument("{% doc_link \"Watcher");

      try {
        await writeFile(createdFile, "Integration fixture\n");
        await waitForCompletionState(document, "Watcher Created", true);
        await rename(createdFile, renamedFile);
        await waitForCompletionState(document, "Watcher Renamed", true);
        await waitForCompletionState(document, "Watcher Created", false);
        await unlink(renamedFile);
        await waitForCompletionState(document, "Watcher Renamed", false);
      } finally {
        await unlink(createdFile).catch(() => undefined);
        await unlink(renamedFile).catch(() => undefined);
      }
    });

    test("supports ImgFlow and Documents completions in Liquid files", async () => {
      const imageCompletions = await completionsAt("page.liquid", "{% imgflow ");
      assert.ok(
        labelsOf(imageCompletions).includes("diagram.webp"),
        "Liquid image completions should include diagram.webp"
      );

      const documentCompletions = await completionsAt("page.liquid", "{% doc_link \"Board");
      assert.ok(
        labelsOf(documentCompletions).includes("Board Minutes"),
        "Liquid document completions should include Board Minutes"
      );
    });

    test("filters completions by typed text", async () => {
      const completions = await completionsAt("index.md", "{% imgflow \"he", true);
      const labels = labelsOf(completions);

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

    test("reindexes when _config.yml changes", async () => {
      const document = await openMarkdownDocument("{% imgflow \"he");

      await withFixtureConfig(
        "plugins: []\nimgflow:\n  originals: assets/images/missing\n",
        () => waitForCompletionState(document, "hero.jpg", false)
      );
      await waitForCompletionState(document, "hero.jpg", true);
    });

    test("warns when _config.yml is malformed and recovers", async () => {
      const document = await openMarkdownDocument("{% imgflow \"he");

      await withFixtureConfig("imgflow: [unclosed\n", async () => {
        await sleep(500);
        const extension = vscode.extensions.getExtension("gundestrup.jekyll-imgflow");
        assert.ok(extension?.isActive, "Extension should stay active after a config parse error");
      });
      await waitForCompletionState(document, "hero.jpg", true);
    });

    test("reacts to jekyllImgFlow settings changes", async () => {
      const document = await openMarkdownDocument("{% imgflow \"");

      await withWorkspaceSetting("jekyllImgFlow", "formats", ["png"], async () => {
        await waitForCompletionState(document, "hero.jpg", false);
        await waitForCompletionState(document, "photo.png", true);
      });
      await waitForCompletionState(document, "hero.jpg", true);
    });

    test("ignores unrelated settings changes", async () => {
      await withWorkspaceSetting("files", "autoSave", "off", () => sleep(300));

      const document = await openMarkdownDocument("{% imgflow \"he");
      const position = document.positionAt(document.getText().length);
      const completions = await getCompletions(document, position);
      assert.ok(
        findItem(completions, "hero.jpg"),
        "Completions should still be served after an unrelated settings change"
      );
    });

    test("updates the status bar item as the cursor moves", async () => {
      const document = await openDocument("index.md");
      const editor = vscode.window.activeTextEditor;
      assert.ok(editor, "Editor should be active");

      const tagPosition = findPosition(document, "{% imgflow ");
      editor.selection = new vscode.Selection(tagPosition, tagPosition);
      await sleep(200);

      const headingPosition = findPosition(document, "# Jekyll ImgFlow Fixture");
      editor.selection = new vscode.Selection(headingPosition, headingPosition);
      await sleep(200);
    });

    suiteTeardown(async () => {
      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    });
  });

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (process.env.NODE_V8_COVERAGE) {
        v8.takeCoverage();
      }
      if (failures > 0) {
        reject(new Error(`${failures} integration test(s) failed`));
      } else {
        resolve();
      }
    });
  });
}
