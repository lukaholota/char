import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { DB_INTEGRATION_TEST_FILES } from "./vitest.db-integration-files.mts";
import { CORPUS_TEST_FILES } from "./vitest.corpus-files.mts";
import { QUARANTINE_TEST_FILES } from "./vitest.quarantine-files.mts";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "tests/rules/**/*.test.ts",
      "tests/rules-2024/**/*.test.ts",
      "tests/logic/**/*.test.ts",
      "tests/golden/levelup/**/*.test.ts",
      "tests/content/**/*.test.ts",
      "tests/components/**/*.test.tsx",
      "tests/routes/**/*.test.ts",
    ],
    exclude: [
      ...configDefaults.exclude,
      ...DB_INTEGRATION_TEST_FILES,
      ...CORPUS_TEST_FILES,
      ...QUARANTINE_TEST_FILES,
    ],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: true,
    // Дефолтні 5 с дають фальшиві таймаути на content-тестах, коли поруч іде lint, next dev
    // чи прогін іншої сесії: term-card.test.ts сам по собі 1,6 с, під навантаженням — 9 с.
    testTimeout: 15000,
  },
});


