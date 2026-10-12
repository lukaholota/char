import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { findCharacterCreationOptions } from "../../src/lib/content/creator-content";
import { findReadyPresetProblems } from "../../src/lib/optimization/preset-diagnostics";
import type { CreatorContent } from "../../src/server/db/creator-content-query";
import { listReadyPresetSlugs, readArticleDocument, readStoredBuild } from "./build-spec-files";

async function main(): Promise<void> {
  const { slugs, useDatabase } = readCommandLine();
  const content = useDatabase ? await loadTestDatabaseContent() : findCharacterCreationOptions("RULES_2014");
  const failed = slugs.filter((slug) => !checkOne(slug, content));
  console.log(`\nПеревірено ${slugs.length}, з помилками ${failed.length}${failed.length ? `: ${failed.join(", ")}` : ""}`);
  process.exit(failed.length ? 1 : 0);
}

function readCommandLine(): { slugs: string[]; useDatabase: boolean } {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { all: { type: "boolean" }, db: { type: "boolean" } } });
  const slugs = values.all ? listReadyPresetSlugs() : positionals;
  if (!slugs.length) {
    console.error("Вкажіть slug пресета або --all: bun scripts/rpgbot/check-build.ts <slug> [--db]");
    process.exit(2);
  }
  return { slugs, useDatabase: Boolean(values.db) };
}

function checkOne(slug: string, content: CreatorContent): boolean {
  const stored = readStoredBuild(slug);
  if (!stored) {
    console.error(`${slug}: ПОМИЛКА немає ready-builds/${slug}.json або його рецепта`);
    return false;
  }
  const document = readArticleDocument(stored.preset.articleSlug);
  const report = findReadyPresetProblems({ ...stored, content, document });
  for (const line of report.summary) console.log(`${slug}: ${line}`);
  for (const warning of report.warnings) console.warn(`${slug}: УВАГА ${warning}`);
  for (const problem of report.errors) console.error(`${slug}: ПОМИЛКА ${problem}`);
  if (!report.errors.length) console.log(`${slug}: OK`);
  return report.errors.length === 0;
}

async function loadTestDatabaseContent(): Promise<CreatorContent> {
  process.env.DATABASE_URL = readTestDatabaseUrl();
  const { prisma } = await import("../../src/lib/prisma");
  const { findCreatorContent } = await import("../../src/server/db/creator-content-query");
  const { buildCharacterCreationOptions } = await import("../../src/lib/content/creator-content");
  try {
    return buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
  } finally {
    await prisma.$disconnect();
  }
}

function readTestDatabaseUrl(): string {
  const line = readFileSync(new URL("../../.env.test", import.meta.url), "utf8").split("\n").find((entry) => entry.startsWith("DATABASE_URL="));
  const url = line?.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
  if (!url || !/@127\.0\.0\.1:5433\/spells_test(\?|$)/.test(url)) throw new Error("--db читає лише локальну тестову базу 127.0.0.1:5433/spells_test з .env.test");
  return url;
}

void main();
