import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildSpecSchema, type BuildSpec } from "./build-spec";
import { buildBuildId, compileBuildSpec, findBlockedSpecProblems } from "./build-spec-compiler";
import { parseArticleDocument } from "./document";
import { findReadyPresetProblems } from "./preset-diagnostics";
import { readyPresetSchema } from "./ready-preset";
import { buildRecipeSchema } from "./schema";

const ROOT = "data/rpgbot";
const content = findCharacterCreationOptions("RULES_2014");
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const listSlugs = (directory: string) => readdirSync(`${ROOT}/${directory}`).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5)).sort();
const readDocument = (articleSlug: string) => parseArticleDocument(readJson(`${ROOT}/uk/rpgbot-${articleSlug}.json`));
const serialize = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const presetSlugs = listSlugs("ready-builds");
const specSlugs = existsSync(`${ROOT}/build-specs`) ? listSlugs("build-specs") : [];
const readSpec = (slug: string): BuildSpec => buildSpecSchema.parse(readJson(`${ROOT}/build-specs/${slug}.json`));

describe("every shipped ready preset", () => {
  it.each(presetSlugs)("%s passes the author checks against the current catalog and article", (slug) => {
    const preset = readyPresetSchema.parse(readJson(`${ROOT}/ready-builds/${slug}.json`));
    const recipe = buildRecipeSchema.parse(readJson(`${ROOT}/builds/${preset.buildId}.json`));
    const report = findReadyPresetProblems({ recipe, preset, content, document: readDocument(preset.articleSlug) });
    expect(report.errors).toEqual([]);
  });

  it("does not repeat a build id and keeps the slug and article consistent", () => {
    const presets = presetSlugs.map((slug) => ({ slug, ...readyPresetSchema.parse(readJson(`${ROOT}/ready-builds/${slug}.json`)) }));
    expect(new Set(presets.map((preset) => preset.buildId)).size).toBe(presets.length);
    for (const preset of presets) expect(existsSync(`${ROOT}/uk/rpgbot-${preset.articleSlug}.json`), preset.slug).toBe(true);
  });
});

describe("build specs", () => {
  it.each(specSlugs.filter((slug) => readSpec(slug).status === "ready"))("%s is in the builds.json index, byte for byte", (slug) => {
    const index: unknown[] = readJson(`${ROOT}/builds.json`);
    expect(index).toContainEqual(readJson(`${ROOT}/builds/${buildBuildId(slug)}.json`));
  });

  it.each(specSlugs)("%s matches the files compiled from it", (slug) => {
    const spec = readSpec(slug);
    if (spec.status === "blocked") {
      expect(findBlockedSpecProblems(spec, readDocument(spec.articleSlug))).toEqual([]);
      expect(presetSlugs, "blocked spec must not have a preset").not.toContain(slug);
      return;
    }
    const { recipe, preset } = compileBuildSpec({ slug, spec, document: readDocument(spec.articleSlug), content });
    const recompile = `bun scripts/rpgbot/compile-build.ts ${slug}`;
    expect(readFileSync(`${ROOT}/builds/${buildBuildId(slug)}.json`, "utf8"), `recipe is stale: run ${recompile}`).toBe(serialize(recipe));
    expect(readFileSync(`${ROOT}/ready-builds/${slug}.json`, "utf8"), `preset is stale: run ${recompile}`).toBe(serialize(preset));
  });
});
