import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["node_modules/**", ".vscode-test/**", "out/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "cobertura"],
      include: ["src/**/*.ts"],
    },
  },
});
