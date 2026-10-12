import { readFileSync } from "node:fs";
import { findCharacterCreationOptions, findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { buildSpecSchema, type ReadyBuildSpec } from "./build-spec";
import { compileBuildSpec } from "./build-spec-compiler";
import type { SpecLevel } from "./build-spec-progression";
import { parseArticleDocument } from "./document";
import { findReadyPresetProblems } from "./preset-diagnostics";
import { buildWalkEnvironment, walkProgression } from "./progression-walk";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";

const creationContent = findCharacterCreationOptions("RULES_2014");
const fullContent = findCharacterCreatorOptions("RULES_2014");

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

export function readReadySpec(slug: string): ReadyBuildSpec {
  const spec = buildSpecSchema.parse(readJson(`data/rpgbot/build-specs/${slug}.json`));
  if (spec.status !== "ready") throw new Error(`${slug} must be a ready spec`);
  return spec;
}

export function compileSpecWithLevels(slug: string, levels: SpecLevel[] | undefined) {
  const spec = { ...structuredClone(readReadySpec(slug)), levels };
  const document = parseArticleDocument(readJson(`data/rpgbot/uk/rpgbot-${spec.articleSlug}.json`));
  const { recipe, preset } = compileBuildSpec({ slug, spec, document, content: creationContent });
  return { recipe, preset, report: findReadyPresetProblems({ recipe, preset, content: creationContent, document }) };
}

export function walkSpecLevels(slug: string, levels: SpecLevel[]) {
  const { recipe, preset: compiledPreset } = compileSpecWithLevels(slug, levels);
  const preset = readyPresetSchema.parse(compiledPreset);
  const draft = buildReadyPresetDraft(recipe, preset, creationContent);
  return walkProgression(buildWalkEnvironment({ recipe, preset, content: fullContent }), draft);
}
