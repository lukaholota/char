import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { assertTestDatabaseUrl } from "./tests/helpers/assert-test-database-url";

config({ path: ".env.test", quiet: true });

// `.env` (the app's normal `bun dev` config) points DATABASE_URL at the PRODUCTION database —
// see docs/o2-characterization/kr2.5-... / CLAUDE.md. Playwright must never inherit that.
// This override forces the dev server it launches onto the same guarded test DB Vitest uses.
const testDatabaseUrl = assertTestDatabaseUrl(process.env.DATABASE_URL);

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bunx next dev --turbopack -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      // .env.local несе ключі робочого R2: без підміни e2e-завантаження мап падали б у бакет сайту.
      R2_MEDIA_ACCOUNT_ID: "e2e-no-media-store",
      R2_MEDIA_SECRET_ACCESS_KEY: "e2e-no-media-store",
      NEXT_PUBLIC_MEDIA_URL: `http://127.0.0.1:${PORT}`,
    },
  },
});
