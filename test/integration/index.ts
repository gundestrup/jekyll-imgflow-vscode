import * as path from "node:path";
import { rename, unlink, writeFile } from "node:fs/promises";
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
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Completion "${label}" did not become ${expected ? "present" : "absent"}`);
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

    test("suggests document titles with metadata after doc_link", async () => {
      const document = await openDocument("index.md");
      const position = findPosition(document, "{% doc_link \"Annual");
      const completions = await getCompletions(document, position);
      const annualReports = completions.items.filter((item) => item.label.toString() === "Annual Report");

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
      const document = await openDocument("index.md");
      const position = findPosition(document, "{% doc_category \"mi");
      const completions = await getCompletions(document, position);
      const minutes = completions.items.find((item) => item.label.toString() === "minutes");

      assert.ok(minutes, "Mapped minutes category should be suggested");
      assert.equal(minutes.insertText?.toString(), "minutes\"");
    });

    test("suggests nested documents using the final mapped category", async () => {
      const document = await openDocument("index.md");
      const position = findPosition(document, "{% doc_link \"Year");
      const completions = await getCompletions(document, position);
      const accounts = completions.items.find((item) => item.label.toString() === "Year End Accounts");

      assert.ok(accounts, "Nested document should be suggested");
      assert.equal(accounts.insertText?.toString(), "Year End Accounts\"");
      assert.ok(accounts.detail?.includes("yearly"), "Detail should include the mapped nested category");
      assert.ok(accounts.detail?.includes("XLSX"), "Detail should include the file type");
      assert.equal(
        accounts.documentation?.toString(),
        "Archive/Annual/2025-12-15_Year_End_Accounts.xlsx"
      );

      const categoryPosition = findPosition(document, "{% doc_category \"year");
      const categoryCompletions = await getCompletions(document, categoryPosition);
      assert.ok(
        categoryCompletions.items.some((item) => item.label.toString() === "yearly"),
        "Nested mapped category should be suggested"
      );
    });

    test("suggests doc_link documents from the root and several directories deep", async () => {
      const document = await openDocument("index.md");
      const rootPosition = findPosition(document, "{% doc_link \"Root");
      const rootCompletions = await getCompletions(document, rootPosition);
      const rootPolicy = rootCompletions.items.find((item) => item.label.toString() === "Root Policy");

      assert.ok(rootPolicy, "Document directly in documents.root should be suggested");
      assert.ok(rootPolicy.detail?.includes("uncategorized"), "Root document should use uncategorized");
      assert.equal(rootPolicy.documentation?.toString(), "2026-01-10_Root_Policy.pdf");

      const deepPosition = findPosition(document, "{% doc_link \"Regional");
      const deepCompletions = await getCompletions(document, deepPosition);
      const regionalResearch = deepCompletions.items.filter(
        (item) => item.label.toString() === "Regional Research"
      );

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
      const document = await openDocument("index.md");
      const sharedPosition = findPosition(document, "{% doc_category \"re");
      const sharedCompletions = await getCompletions(document, sharedPosition);
      const sharedLabels = sharedCompletions.items.map((item) => item.label.toString());

      assert.deepEqual(sharedLabels, ["reports", "research", "research"]);
      const researchCompletions = sharedCompletions.items.filter(
        (item) => item.label.toString() === "research"
      );
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

      const refinedPosition = findPosition(document, "{% doc_category \"rese");
      const refinedCompletions = await getCompletions(document, refinedPosition);
      const refinedLabels = refinedCompletions.items.map((item) => item.label.toString());

      assert.deepEqual(refinedLabels, ["research", "research"]);
    });

    test("quotes bare doc_link completion values containing spaces", async () => {
      const document = await openDocument("index.md");
      const position = findPosition(document, "{% doc_link Board");
      const completions = await getCompletions(document, position);
      const minutes = completions.items.find((item) => item.label.toString() === "Board Minutes");

      assert.ok(minutes, "Board Minutes should be suggested for a bare prefix");
      assert.equal(minutes.insertText?.toString(), "\"Board Minutes\"");
    });

    test("filters document titles by typed prefix", async () => {
      const document = await openDocument("index.md");
      const position = findPosition(document, "{% doc_link \"Year");
      const completions = await getCompletions(document, position);
      const labels = completions.items.map((item) => item.label.toString());

      assert.deepEqual(labels, ["Year End Accounts"]);
    });

    test("refreshes document completions after create, rename, and delete", async () => {
      const createdFile = path.join(
        FIXTURE_ROOT,
        "assets",
        "documents",
        "Board",
        "2026-03-04_Watcher_Created.pdf"
      );
      const renamedFile = path.join(
        FIXTURE_ROOT,
        "assets",
        "documents",
        "Board",
        "2026-03-04_Watcher_Renamed.pdf"
      );
      const document = await vscode.workspace.openTextDocument({
        language: "markdown",
        content: "{% doc_link \"Watcher",
      });

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
      const document = await openDocument("page.liquid");
      const imagePosition = findPosition(document, "{% imgflow ");
      const imageCompletions = await getCompletions(document, imagePosition);
      const imageLabels = imageCompletions.items.map((item) => item.label.toString());

      assert.ok(imageLabels.includes("diagram.webp"), "Liquid image completions should include diagram.webp");

      const documentPosition = findPosition(document, "{% doc_link \"Board");
      const documentCompletions = await getCompletions(document, documentPosition);
      const documentLabels = documentCompletions.items.map((item) => item.label.toString());

      assert.ok(documentLabels.includes("Board Minutes"), "Liquid document completions should include Board Minutes");
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
