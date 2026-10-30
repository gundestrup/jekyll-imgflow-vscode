import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["node_modules/**", ".vscode-test/**", "out/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "cobertura", "lcov"],
      include: ["src/**/*.ts"],
      // Regression floor only: unit tests target the pure-logic modules;
      // the VS Code-bound files (providers, extension, workspaceIndexes)
      // are exercised by the integration suite, and Codecov merges both
      // reports. Raise these as unit coverage grows.
      thresholds: {
        lines: 30,
        statements: 30,
        branches: 38,
        functions: 40,
      },
    },
  },
});
