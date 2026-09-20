import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { QUARANTINE_TEST_FILES } from "./vitest.quarantine-files.mts";

// Тести з карантину — `bun run test:quarantine`. Окремий конфіг, а не фільтр по юніт-набору:
// там вони в `exclude`, і прогін за іменем файлу віддав би «файлів не знайдено».
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: [...QUARANTINE_TEST_FILES],
    exclude: [...configDefaults.exclude],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 15000,
  },
});
