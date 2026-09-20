import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { DB_INTEGRATION_TEST_FILES } from "./vitest.db-integration-files.mts";

// Планка міряє `src/rules/` усіма тестами правил, що йдуть без бази. Коли ганялася лише
// `tests/rules/coverage/`, модулі з тестами поруч чи в `tests/rules/` рахувалися як нулі (KR31.11).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/rules/**/*.test.ts", "tests/rules/**/*.test.ts", "tests/rules-2024/**/*.test.ts"],
    exclude: [...configDefaults.exclude, ...DB_INTEGRATION_TEST_FILES],
    coverage: {
      provider: "v8",
      include: ["src/rules/**/*.ts"],
      exclude: ["src/rules/**/*.test.ts"],
      reporter: ["text", "json"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
