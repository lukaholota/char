import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Ці файли лежать під глобами нижче, але бʼють по базі — вони належать
// vitest.integration.config.mts, інакше DB-запити конкурують за зʼєднання з
// іншими 50+ паралельними файлами й падають по 5000ms таймауту (флейково, не завжди).
//
// Відколи CI бази не має (Р32), цей перелік ще й тримає межу «набір іде без бази».
// Перевіряється прогоном із завідомо мертвою адресою, а не оком: `bun run test:no-db`.
const DB_INTEGRATION_TEST_FILES = [
  "tests/content/ruleset-server-filter.test.ts",
  "tests/content/creator-content-parity.test.ts",
  "tests/content/ruleset-2024-isolation.test.ts",
  "tests/content/ruleset-2024-creator.test.ts",
  "tests/content/choice-option-integrity.test.ts",
  "tests/content/species-choices-2024.test.ts",
  "tests/logic/multiclass-resolver.test.ts",
  "tests/rules/class-progression.test.ts",
  "tests/rules-2024/acceptance-ten.test.ts",
  "tests/rules-2024/multiclass-fifteen.test.ts",
];

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
    exclude: [...configDefaults.exclude, ...DB_INTEGRATION_TEST_FILES],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: true,
  },
});


