import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { CORPUS_TEST_FILES } from "./vitest.corpus-files.mts";

// Звірки з дзеркалом 5etools. Ганяються локально — `bun run test:corpus` — після
// `bun run fetch:5etools`. У CI корпусу немає (див. vitest.corpus-files.mts).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: [...CORPUS_TEST_FILES],
    exclude: [...configDefaults.exclude],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 15000,
  },
});
