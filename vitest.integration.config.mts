import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: [
      "tests/database.test.ts",
      "tests/content/ruleset-server-filter.test.ts",
      "tests/content/ruleset-2024-isolation.test.ts",
      "tests/content/ruleset-2024-creator.test.ts",
      "tests/content/choice-option-integrity.test.ts",
      "tests/logic/multiclass-resolver.test.ts",
      "tests/rules/class-progression.test.ts",
      "tests/actions/**/*.test.ts",
      "tests/db/**/*.test.ts",
    ],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
