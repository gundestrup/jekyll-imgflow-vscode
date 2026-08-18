import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";
import * as path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const fixtureRoot = path.resolve(repoRoot, "test", "fixtures", "jekyll-site");

async function main(): Promise<void> {
  // ELECTRON_RUN_AS_NODE=1 makes the VS Code Electron binary behave as plain Node.js,
  // which prevents integration tests from launching. Unset it for this process.
  delete process.env.ELECTRON_RUN_AS_NODE;

  const vscodeVersion = process.env.VSCODE_VERSION ?? "1.91.0";
  const vscodeExecutablePath = await downloadAndUnzipVSCode(vscodeVersion);

  await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath: repoRoot,
    extensionTestsPath: path.resolve(repoRoot, "out", "test", "integration", "index.js"),
    launchArgs: [fixtureRoot],
  });
}

main().catch((error) => {
  console.error("Integration tests failed:", error);
  process.exit(1);
});
