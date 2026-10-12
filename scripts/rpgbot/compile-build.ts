import { parseArgs } from "node:util";
import { findCharacterCreationOptions } from "../../src/lib/content/creator-content";
import { BuildSpecError, compileBuildSpec, findBlockedSpecProblems, findProtectedRecipeProblem, findShrunkLevelsWarning } from "../../src/lib/optimization/build-spec-compiler";
import type { BlockedBuildSpec, ReadyBuildSpec } from "../../src/lib/optimization/build-spec";
import type { BuildRecipe } from "../../src/lib/optimization/types";
import type { ReadyPreset } from "../../src/lib/optimization/ready-preset";
import { findReadyPresetProblems } from "../../src/lib/optimization/preset-diagnostics";
import { findStoredBuildDifferences, listBuildSpecSlugs, readArticleDocument, readBuildSpec, readStoredRecipe, writeBuildFiles } from "./build-spec-files";

type Mode = "write" | "dry-run" | "verify";
type CommandLine = { slugs: string[]; mode: Mode; discardLevels: boolean };
type Outcome = { slug: string; ok: boolean };

const content = findCharacterCreationOptions("RULES_2014");

function main(): void {
  const { slugs, mode, discardLevels } = readCommandLine();
  const outcomes = slugs.map((slug) => compileOne(slug, mode, discardLevels));
  const failed = outcomes.filter((outcome) => !outcome.ok);
  console.log(`\nГотово: ${outcomes.length - failed.length} з ${outcomes.length}${failed.length ? `; з помилками: ${failed.map((outcome) => outcome.slug).join(", ")}` : ""}`);
  process.exit(failed.length ? 1 : 0);
}

function readCommandLine(): CommandLine {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { all: { type: "boolean" }, "dry-run": { type: "boolean" }, verify: { type: "boolean" }, "discard-levels": { type: "boolean" } } });
  const slugs = values.all ? listBuildSpecSlugs() : positionals;
  if (!slugs.length) {
    console.error("Вкажіть slug специфікації або --all: bun scripts/rpgbot/compile-build.ts <slug> [--dry-run | --verify | --discard-levels]");
    process.exit(2);
  }
  return { slugs, mode: values.verify ? "verify" : values["dry-run"] ? "dry-run" : "write", discardLevels: values["discard-levels"] ?? false };
}

function compileOne(slug: string, mode: Mode, discardLevels: boolean): Outcome {
  try {
    const spec = readBuildSpec(slug);
    return spec.status === "blocked" ? checkBlocked(slug, spec) : compileReady(slug, spec, mode, discardLevels);
  } catch (error) {
    return reportFailure(slug, error);
  }
}

function checkBlocked(slug: string, spec: BlockedBuildSpec): Outcome {
  const problems = findBlockedSpecProblems(spec, readArticleDocument(spec.articleSlug));
  if (problems.length) return reportFailure(slug, new BuildSpecError(problems));
  console.log(`${slug}: blocked (${spec.reasonCode}) — файли не створюються`);
  return { slug, ok: true };
}

function compileReady(slug: string, spec: ReadyBuildSpec, mode: Mode, discardLevels: boolean): Outcome {
  const document = readArticleDocument(spec.articleSlug);
  const storedRecipe = readStoredRecipe(slug);
  const protectedProblem = findProtectedRecipeProblem(spec, storedRecipe, { discardLevels });
  if (protectedProblem) return reportFailure(slug, new BuildSpecError([protectedProblem]));
  const { recipe, preset, warnings } = compileBuildSpec({ slug, spec, document, content });
  const report = findReadyPresetProblems({ recipe, preset, content, document });
  if (report.errors.length) return reportFailure(slug, new BuildSpecError(report.errors));
  const shrunk = findShrunkLevelsWarning(storedRecipe, recipe);
  printWarnings(slug, [...warnings, ...report.warnings, ...(shrunk ? [shrunk] : [])]);
  if (mode === "verify") return verifyStored(slug, recipe, preset);
  if (mode === "write") writeBuildFiles(slug, recipe, preset);
  console.log(`${slug}: ${mode === "write" ? "записано" : "перевірено (dry-run)"} ${recipe.buildId}`);
  return { slug, ok: true };
}

function verifyStored(slug: string, recipe: BuildRecipe, preset: ReadyPreset): Outcome {
  const differences = findStoredBuildDifferences(slug, recipe, preset);
  console.log(`${slug}: ${differences.length ? "файли на диску ВІДРІЗНЯЮТЬСЯ від компіляції специфікації" : "файли збігаються з компіляцією"}`);
  for (const difference of differences) console.log(`  - ${difference}`);
  return { slug, ok: differences.length === 0 };
}

function printWarnings(slug: string, warnings: string[]): void {
  for (const warning of warnings) console.warn(`${slug}: УВАГА ${warning}`);
}

function reportFailure(slug: string, error: unknown): Outcome {
  const problems = error instanceof BuildSpecError ? error.problems : [error instanceof Error ? error.message : String(error)];
  console.error(`${slug}: ПОМИЛКА, файли не змінено`);
  for (const problem of problems) console.error(`  - ${problem}`);
  return { slug, ok: false };
}

main();
