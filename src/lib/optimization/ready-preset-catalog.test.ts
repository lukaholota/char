import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildCreationAbilityScores } from "@/rules/character-creation";
import { buildReadyPresetDraft, readyPresetSchema } from "./ready-preset";
import { buildRecipeSchema } from "./schema";
import { collectSliceCatalog, readSliceArticle, readSliceRecipes } from "./slice-reader";
import { validateCorpus } from "./validation";
import { generateIndices } from "./indices";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const listShippedPresetSlugs = () => readdirSync("data/rpgbot/ready-builds").filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5)).sort();
const expectedStarts = [
  { slug: "monk-shadow-2014", characterClass: "MONK_2014", skills: 5, expertise: 0, scores: [8, 16, 15, 8, 16, 8] },
  { slug: "monk-open-hand-2014", characterClass: "MONK_2014", skills: 5, expertise: 0, scores: [8, 16, 16, 8, 16, 8] },
  { slug: "fighter-champion-shield-2014", characterClass: "FIGHTER_2014", skills: 5, expertise: 0, scores: [17, 10, 16, 10, 9, 12] },
  { slug: "fighter-champion-greataxe-2014", characterClass: "FIGHTER_2014", skills: 5, expertise: 0, scores: [17, 10, 16, 10, 9, 12] },
  { slug: "barbarian-berserker-2014", characterClass: "BARBARIAN_2014", skills: 5, expertise: 0, scores: [16, 14, 16, 8, 10, 10] },
  { slug: "rogue-thief-2014", characterClass: "ROGUE_2014", skills: 6, expertise: 2, scores: [8, 16, 14, 12, 12, 14] },
  { slug: "wizard-evocation-2014", characterClass: "WIZARD_2014", skills: 5, expertise: 0, scores: [8, 16, 14, 16, 12, 8] },
  { slug: "cleric-life-2014", characterClass: "CLERIC_2014", skills: 4, expertise: 0, scores: [14, 8, 16, 8, 16, 12] },
  { slug: "druid-land-2014", characterClass: "DRUID_2014", skills: 4, expertise: 0, scores: [8, 14, 16, 12, 16, 8] },
  { slug: "warlock-fiend-2014", characterClass: "WARLOCK_2014", skills: 4, expertise: 0, scores: [8, 14, 14, 12, 11, 16] },
  { slug: "sorcerer-draconic-2014", characterClass: "SORCERER_2014", skills: 4, expertise: 0, scores: [10, 14, 14, 12, 8, 16] },
  { slug: "bard-lore-2014", characterClass: "BARD_2014", skills: 7, expertise: 0, scores: [8, 16, 14, 8, 12, 17] },
  { slug: "paladin-devotion-2014", characterClass: "PALADIN_2014", skills: 4, expertise: 0, scores: [17, 8, 15, 8, 8, 16] },
  { slug: "ranger-hunter-2014", characterClass: "RANGER_2014", skills: 5, expertise: 0, scores: [10, 16, 14, 12, 16, 9] },
  { slug: "artificer-alchemist-2014", characterClass: "ARTIFICER_2014", skills: 4, expertise: 0, scores: [8, 14, 16, 16, 12, 8] },
];

describe("ready preset catalog", () => {
  it("validates every expanded recipe against exact private source revisions and catalog keys", async () => {
    const recipes = await readSliceRecipes("RULES_2014");
    expect(recipes.map((recipe) => recipe.buildId).sort()).toEqual(listShippedPresetSlugs().map((slug) => readJson(`data/rpgbot/ready-builds/${slug}.json`).buildId).sort());
    const slugs = [...new Set(recipes.map((recipe) => recipe.sourceRefs[0].articleId.replace(/^rpgbot-/, "")))];
    const documents = await Promise.all(slugs.map((slug) => readSliceArticle(slug, "RULES_2014")));
    const corpus = { schemaVersion: 1, sources: documents.flatMap((document) => document!.sources), sourceRevisions: documents.flatMap((document) => document!.sourceRevisions), articles: documents.map((document) => document!.article), translations: documents.flatMap((document) => document!.translations), ratings: documents.flatMap((document) => document!.ratings), bindings: [], recipes };
    expect(validateCorpus(corpus, collectSliceCatalog("RULES_2014")).issues).toEqual([]);
    expect(generateIndices(corpus, collectSliceCatalog("RULES_2014"))).toEqual({ articles: [], bindings: [], search: [] });
  });
  it.each(expectedStarts)("assembles the source-backed level-one $slug", (expected) => {
    const preset = readyPresetSchema.parse(readJson(`data/rpgbot/ready-builds/${expected.slug}.json`));
    const recipe = buildRecipeSchema.parse(readJson(`data/rpgbot/builds/${preset.buildId}.json`));
    const content = findCharacterCreationOptions("RULES_2014");
    const draft = buildReadyPresetDraft(recipe, preset, content);
    const characterClass = content.classes.find((entry) => entry.classId === draft.classId)!;
    const race = content.races.find((entry) => entry.raceId === draft.raceId)!;
    const variant = race.raceVariants.find((entry) => entry.raceVariantId === draft.raceVariantId);
    const subrace = race.subraces.find((entry) => entry.subraceId === draft.subraceId);
    const feat = content.feats.find((entry) => entry.featId === draft.featId);
    const scores = buildCreationAbilityScores({ ruleset: "RULES_2014", asiSystem: draft.asiSystem, pointBuy: draft.asi, simple: [], isDefaultASI: true, raceASI: race.ASI, variantASI: variant?.overridesRaceASI, subraceASI: subrace?.additionalASI, subraceReplacesASI: subrace?.replacesASI ?? false, racialChoices: draft.racialBonusChoiceSchema, feats: feat ? [{ source: feat, chosenOptionIds: Object.values(draft.featChoiceSelections).flat() }] : [] }).scores;
    expect(characterClass.name).toBe(expected.characterClass);
    expect(Object.values(scores)).toEqual(expected.scores);
    expect(draft.skills).toHaveLength(expected.skills);
    expect(draft.expertiseSchema?.expertises ?? []).toHaveLength(expected.expertise);
    expect(draft.skills).toEqual(expect.arrayContaining(draft.expertiseSchema?.expertises ?? []));
    expect(draft.subclassId === undefined).toBe(characterClass.subclassLevel !== 1);
    expect(draft.levelUpPath).toBeUndefined();
    const favoredEnemyLanguageCount = preset.classOptions.includes("Favored Enemy") ? 1 : 0;
    expect(draft.languagesSchema?.languages).toHaveLength(race.languagesToChooseCount + (subrace?.languagesToChooseCount ?? 0) + (content.backgrounds.find((entry) => entry.backgroundId === draft.backgroundId)?.languagesToChooseCount ?? 0) + favoredEnemyLanguageCount);
    const selections = draft.equipmentSchema!;
    const groups = new Set(characterClass.startingEquipmentOption.map((row) => String(row.choiceGroup)));
    expect(Object.keys(selections.choiceGroupToId).sort()).toEqual([...groups].sort());
    for (const group of groups) {
      const rows = characterClass.startingEquipmentOption.filter((row) => row.choiceGroup === Number(group));
      const selectedIds = selections.choiceGroupToId[group];
      const chosen = rows.filter((row) => selectedIds.includes(row.optionId));
      expect(chosen.length).toBeGreaterThan(0);
      expect(selectedIds.sort()).toEqual(rows.filter((row) => row.option === chosen[0].option).map((row) => row.optionId).sort());
      const anyWeapon = chosen.find((row) => row.chooseAnyWeapon);
      expect(selections.anyWeaponSelection[group] ?? []).toHaveLength(anyWeapon?.weaponCount ?? 0);
    }
    const styleNames = characterClass.classChoiceOptions.filter((option) => Object.values(draft.classChoiceSelections).flat().includes(option.choiceOptionId)).map((option) => option.choiceOption.optionNameEng);
    expect(styleNames).toEqual(preset.classOptions);
    const document = readJson(`data/rpgbot/uk/rpgbot-${preset.articleSlug}.json`);
    const translation = document.translations.find((entry: { translationRevisionId: string }) => entry.translationRevisionId === recipe.sourceRefs[0].translationRevisionId);
    expect(translation.sourceRevisionId).toBe(recipe.sourceRefs[0].sourceRevisionId);
    expect(translation.sections.map((section: { sectionId: string }) => section.sectionId)).toEqual(expect.arrayContaining([preset.skillSection, preset.equipmentSection, ...preset.featSection ? [preset.featSection] : []]));
  });

  it("checks every shipped preset, with distinct build IDs and two variants from one guide", () => {
    const slugs = listShippedPresetSlugs();
    expect(slugs).toEqual(expect.arrayContaining(expectedStarts.map((entry) => entry.slug)));
    const presets = slugs.map((slug) => readJson(`data/rpgbot/ready-builds/${slug}.json`));
    expect(new Set(presets.map((entry) => entry.buildId)).size).toBe(presets.length);
    expect(presets.filter((entry) => entry.articleSlug === "fighter-2014").length).toBeGreaterThanOrEqual(2);
  });
});
