import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { parseArticleDocument } from "./document";
import { findReadyPresetProblems } from "./preset-diagnostics";
import { readyPresetSchema, type ReadyPreset } from "./ready-preset";
import { buildRecipeSchema } from "./schema";

const content = findCharacterCreationOptions("RULES_2014");

function loadPreset(slug: string) {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`data/rpgbot/ready-builds/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  const document = parseArticleDocument(JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${preset.articleSlug}.json`, "utf8")));
  return { recipe, preset, document };
}

function diagnose(slug: string, change: (preset: ReadyPreset) => void): string {
  const { recipe, preset, document } = loadPreset(slug);
  const changed = structuredClone(preset);
  change(changed);
  return findReadyPresetProblems({ recipe, preset: changed, content, document }).errors.join("\n");
}

describe("findReadyPresetProblems", () => {
  it.each(["fighter-champion-shield-2014", "rogue-thief-2014", "monk-open-hand-2014", "wizard-evocation-2014"])("finds nothing wrong with %s", (slug) => {
    const { recipe, preset, document } = loadPreset(slug);
    const report = findReadyPresetProblems({ recipe, preset, content, document });
    expect(report.errors).toEqual([]);
    expect(report.summary.length).toBeGreaterThan(3);
  });

  it("names the missing fighting style and lists the options", () => {
    const message = diagnose("fighter-champion-shield-2014", (preset) => { preset.classOptions = []; });
    expect(message).toContain("Бракує вибору «");
    expect(message).toContain("Dueling");
  });

  it("rejects an unknown class option", () => {
    expect(diagnose("fighter-champion-shield-2014", (preset) => { preset.classOptions = ["Duelling"]; })).toContain("Невідомий вибір «Duelling» у classOptions");
  });

  it("rejects expertise outside the character's skills", () => {
    expect(diagnose("rogue-thief-2014", (preset) => { preset.expertise = ["ARCANA", "STEALTH"]; })).toContain("Експертиза не з навичок персонажа: ARCANA");
  });

  it("rejects the wrong expertise count", () => {
    expect(diagnose("rogue-thief-2014", (preset) => { preset.expertise = ["STEALTH"]; })).toContain("Експертиза: клас дає 2, а в пресеті 1");
  });

  it("reports an equipment option that the group does not have", () => {
    const message = diagnose("rogue-thief-2014", (preset) => { preset.equipment[1].option = "c"; });
    expect(message).toContain("Група спорядження 2 не має варіанта c");
  });

  it("reports a missing equipment group", () => {
    expect(diagnose("rogue-thief-2014", (preset) => { preset.equipment = preset.equipment.slice(1); })).toContain("Група спорядження 1");
  });

  it("reports weapons that the chosen option does not offer", () => {
    const message = diagnose("fighter-champion-shield-2014", (preset) => { preset.equipment[1].weapons = ["DAGGER"]; });
    expect(message).toContain("Зброя DAGGER недоступна у групі 2/a");
  });

  it("reports the wrong number of weapons for a free weapon choice", () => {
    expect(diagnose("fighter-champion-greataxe-2014", (preset) => { preset.equipment[1].weapons = ["GREATAXE"]; })).toContain("потребує 2 видів зброї");
  });

  it("explains a background replacement that is missing or not needed", () => {
    expect(diagnose("fighter-champion-shield-2014", (preset) => { preset.skills.background = []; })).toContain("Передісторія дублює");
    expect(diagnose("rogue-thief-2014", (preset) => { preset.skills.background = ["INSIGHT", "HISTORY"]; })).toContain("skills.background");
  });

  it("rejects a class skill that the class list does not offer", () => {
    expect(diagnose("fighter-champion-shield-2014", (preset) => { preset.skills.selectedClass = ["ARCANA", "PERCEPTION"]; })).toContain("skills.selectedClass: ARCANA недоступна");
  });

  it("rejects languages that are already known or wrongly counted", () => {
    expect(diagnose("monk-open-hand-2014", (preset) => { preset.languages = ["COMMON"]; })).toContain("COMMON");
    expect(diagnose("monk-open-hand-2014", (preset) => { preset.languages = []; })).toContain("Мови: персонаж обирає 1, а в пресеті 0");
  });

  it("reports the wrong number of racial ability choices", () => {
    expect(diagnose("monk-open-hand-2014", (preset) => { preset.racialAbilities = ["DEX"]; })).toContain("дає вибір 2 підвищень характеристик");
  });

  it("reports a feat option that the feat does not have", () => {
    expect(diagnose("monk-open-hand-2014", (preset) => { preset.featOptionName = "Nope"; })).toContain("featOptionName «Nope» не належить риси");
  });

  it("rejects a recipe of another edition and a revision mismatch", () => {
    const { recipe, preset, document } = loadPreset("fighter-champion-shield-2014");
    const edition = findReadyPresetProblems({ recipe: { ...recipe, ruleset: "RULES_2024" }, preset, content, document }).errors.join("\n");
    expect(edition).toContain("RULES_2014");
    const revision = findReadyPresetProblems({ recipe: { ...recipe, revisionId: "other" }, preset, content, document }).errors.join("\n");
    expect(revision).toContain("revisionId пресета");
  });

  it("reports a section that the article no longer has", () => {
    expect(diagnose("fighter-champion-shield-2014", (preset) => { preset.equipmentSection = "section-gone"; })).toContain("Розділу «section-gone» немає в статті");
  });

  it("reports a recipe built from a missing article revision", () => {
    const { recipe, preset, document } = loadPreset("fighter-champion-shield-2014");
    const moved = { ...document, translations: document.translations.map((entry) => ({ ...entry, translationRevisionId: "translation-new" })) };
    expect(findReadyPresetProblems({ recipe, preset, content, document: moved }).errors.join("\n")).toContain("якого немає в статті");
  });
});
