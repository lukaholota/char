import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const WORK = "/private/tmp/claude-502/-Users-luka-Documents-code-spells-holota-family/0141b135-eeb1-42c1-a811-e88f5d9dced7/scratchpad/audit/work/verify-04";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: [`${WORK}/*.test.ts`],
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/global-setup-db-lock.ts"],
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
