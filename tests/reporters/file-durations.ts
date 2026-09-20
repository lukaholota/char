import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import type { Reporter, TestModule } from "vitest/node";

/**
 * Пише повний час кожного файлу — тести разом із хуками — у JSON для
 * scripts/check-test-file-durations.ts. Убудований `--reporter=json` рахує лише тіла тестів
 * і не бачить `beforeAll`, де матриця будує персонажів.
 */
export default class FileDurationsReporter implements Reporter {
  private readonly outputPath: string;

  constructor(options: { outputPath?: string } = {}) {
    this.outputPath = options.outputPath ?? ".vitest/file-durations.json";
  }

  onTestRunEnd(testModules: ReadonlyArray<TestModule>): void {
    const rows = testModules.map((testModule) => ({
      file: relative(process.cwd(), testModule.moduleId),
      seconds: testModule.diagnostic().duration / 1000,
    }));
    mkdirSync(dirname(this.outputPath), { recursive: true });
    writeFileSync(this.outputPath, JSON.stringify(rows, null, 2));
  }
}
