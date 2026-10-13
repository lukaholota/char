import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassStartingEquipmentOption } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { buildCharacterCreationOptions } from "@/lib/content/creator-content";
import { findCreatorContent, type CreatorContent } from "@/server/db/creator-content-query";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { buildPresetAbilitySources } from "@/lib/optimization/ready-preset-abilities";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildCreationAbilityScores, getInitialHitPoints, getInitialSpellSlots } from "@/rules/character-creation";
import { hasUnarmedStrikeFromStart } from "@/rules/martial-arts";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { disconnectDatabase, resetUserData } from "../user-data";
import { correctStaleWizardEquipmentSeed } from "./stale-wizard-seed";

export const READY_PRESET_SHARD_COUNT = 4;
const READY_BUILDS_DIRECTORY = "data/rpgbot/ready-builds";

export function listReadyPresetSlugs(): string[] {
  return readdirSync(READY_BUILDS_DIRECTORY).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5)).sort();
}

export function listShardSlugs(slugs: readonly string[], shardIndex: number, shardCount: number): string[] {
  return slugs.filter((_slug, position) => position % shardCount === shardIndex);
}

export function registerShardCoverageCheck(): void {
  describe("ready preset shards", () => {
    it("has one test file per shard, so every preset is created exactly once", () => {
      const shardFiles = readdirSync("tests/actions").filter((name) => /^rpgbot-ready-presets-all\.shard-\d+\.test\.ts$/.test(name));
      expect(shardFiles.sort()).toEqual(Array.from({ length: READY_PRESET_SHARD_COUNT }, (_unused, index) => `rpgbot-ready-presets-all.shard-${index + 1}.test.ts`));
    });
  });
}

export function registerReadyPresetShard(shardIndex: number, shardCount: number = READY_PRESET_SHARD_COUNT): void {
  const slugs = listShardSlugs(listReadyPresetSlugs(), shardIndex, shardCount);
  afterAll(disconnectDatabase);
  correctStaleWizardEquipmentSeed();
  beforeEach(async () => {
    await resetUserData();
    const owner = await prisma.user.create({ data: { email: `rpgbot-all-${shardIndex}@actions.test` } });
    vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
  });
  describe(`2014 ready presets in the database, shard ${shardIndex + 1}/${shardCount}`, () => {
    it.each(slugs)("creates %s exactly as the preset describes", async (slug) => {
      const content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
      const draft = { ...buildPresetDraft(slug, content), name: `Перевірка ${slug}` };
      const created = await createCharacter(draft);
      if ("error" in created) throw new Error(created.error);
      await expectCharacterMatchesDraft(created.persId, draft, content);
      expect(await prisma.pers.count()).toBe(1);
    });
  });
}

export function registerSensitivityCheck(): void {
  const [slug] = listReadyPresetSlugs();
  afterAll(disconnectDatabase);
  beforeEach(async () => {
    await resetUserData();
    const owner = await prisma.user.create({ data: { email: "rpgbot-sensitivity@actions.test" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
  });
  describe("ready preset invariants", () => {
    it.each([
      ["a skill that was not created", (draft: PersFormData) => ({ ...draft, skills: (draft.skills ?? []).slice(1) })],
      ["another ability score", (draft: PersFormData) => ({ ...draft, asi: (draft.asi ?? []).map((entry) => (entry.ability === "STR" ? { ...entry, value: entry.value - 1 } : entry)) })],
      ["weapons from groups that were not chosen", (draft: PersFormData) => ({ ...draft, equipmentSchema: { choiceGroupToId: {}, anyWeaponSelection: {} } })],
      ["a spell that was not learned", (draft: PersFormData) => ({ ...draft, classSpells: { cantripIds: [1], preparedIds: [], spellbookIds: [] } })],
      ["another background", (draft: PersFormData) => ({ ...draft, backgroundId: draft.backgroundId + 1 })],
    ])("fail when the character is compared with %s", async (_label, changeExpectation) => {
      const content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
      const draft = { ...buildPresetDraft(slug, content), name: "Перевірка чутливості" };
      const created = await createCharacter(draft);
      if ("error" in created) throw new Error(created.error);
      await expect(expectCharacterMatchesDraft(created.persId, changeExpectation(draft), content)).rejects.toThrow();
    });
  });
}

function buildPresetDraft(slug: string, content: CreatorContent): PersFormData {
  const preset = readyPresetSchema.parse(JSON.parse(readFileSync(`${READY_BUILDS_DIRECTORY}/${slug}.json`, "utf8")));
  const recipe = buildRecipeSchema.parse(JSON.parse(readFileSync(`data/rpgbot/builds/${preset.buildId}.json`, "utf8")));
  return buildReadyPresetDraft(recipe, preset, content);
}

export async function expectCharacterMatchesDraft(persId: number, draft: PersFormData, content: CreatorContent): Promise<void> {
  const character = await loadCharacter(persId);
  expectIdentity(character, draft);
  expectAbilityScoresAndHitPoints(character, draft, content);
  expectSkills(character, draft, content);
  expectLanguages(character, draft);
  expectChoices(character, draft);
  expectSpellSlots(character);
  expectSpells(character, draft);
  await expectWeaponsAndArmor(character, draft);
}

type Character = Awaited<ReturnType<typeof loadCharacter>>;
const loadCharacter = (persId: number) => prisma.pers.findUniqueOrThrow({
  where: { persId },
  include: { skills: true, weapons: { include: { weapon: true } }, armors: true, feats: true, features: true, choiceOptions: true, raceVariants: true, raceChoiceOptions: true, persSpells: true, class: true },
});

function expectIdentity(character: Character, draft: PersFormData): void {
  expect(character).toMatchObject({ level: 1, ruleset: "RULES_2014", classId: draft.classId, raceId: draft.raceId, backgroundId: draft.backgroundId, name: draft.name });
  expect(character.subraceId ?? undefined).toBe(draft.subraceId ?? undefined);
  expect(character.subclassId ?? undefined).toBe(draft.subclassId ?? undefined);
  expect(character.raceVariants.map((variant) => variant.raceVariantId)).toEqual(draft.raceVariantId ? [draft.raceVariantId] : []);
  expect(character.feats.map((feat) => feat.featId)).toEqual(draft.featId ? [draft.featId] : []);
  expect(character.features.length).toBeGreaterThan(0);
}

function expectAbilityScoresAndHitPoints(character: Character, draft: PersFormData, content: CreatorContent): void {
  const scores = findExpectedAbilityScores(draft, content);
  expect([character.str, character.dex, character.con, character.int, character.wis, character.cha]).toEqual([scores.STR, scores.DEX, scores.CON, scores.INT, scores.WIS, scores.CHA]);
  const hasTough = content.feats.find((feat) => feat.featId === draft.featId)?.name === "TOUGH";
  expect(character.maxHp).toBeGreaterThanOrEqual(getInitialHitPoints(character.class.hitDie, scores.CON, hasTough));
  expect(character.maxHp).toBeGreaterThan(0);
  expect(character.currentHp).toBe(character.maxHp);
}

export function findExpectedAbilityScores(draft: PersFormData, content: CreatorContent) {
  const race = content.races.find((entry) => entry.raceId === draft.raceId)!;
  const pickedRaceOptions = Object.values(draft.raceChoiceSelections);
  return buildCreationAbilityScores({
    ...buildPresetAbilitySources(draft, content),
    ruleset: "RULES_2014", asiSystem: "POINT_BUY", pointBuy: draft.asi ?? [], simple: [], isDefaultASI: draft.isDefaultASI ?? true,
    racialChoices: draft.racialBonusChoiceSchema,
    raceChoiceAbilityBonuses: race.raceChoiceOptions.filter((option) => pickedRaceOptions.includes(option.optionId)).map((option) => ({ ASI: option.ASI })),
  }).scores;
}

function listExpertiseFromSubclassChoices(draft: PersFormData, content: CreatorContent): string[] {
  const chosenIds = Object.values(draft.subclassChoiceSelections).flat();
  const subclass = content.classes.flatMap((entry) => entry.subclasses).find((entry) => entry.subclassId === draft.subclassId);
  return (subclass?.subclassChoiceOptions ?? [])
    .filter((entry) => chosenIds.includes(entry.choiceOptionId) && entry.choiceOption.effectKind === "SKILL_EXPERTISE")
    .map((entry) => String(entry.choiceOption.effectSkill));
}

function expectSkills(character: Character, draft: PersFormData, content: CreatorContent): void {
  const trained = character.skills.filter((skill) => ["PROFICIENT", "EXPERTISE"].includes(skill.proficiencyType)).map((skill) => skill.name).sort();
  expect(trained).toEqual([...(draft.skills ?? [])].sort());
  const expertise = character.skills.filter((skill) => skill.proficiencyType === "EXPERTISE").map((skill) => skill.name).sort();
  expect(expertise).toEqual([...(draft.expertiseSchema?.expertises ?? []), ...listExpertiseFromSubclassChoices(draft, content)].sort());
}

function expectLanguages(character: Character, draft: PersFormData): void {
  const known = character.customLanguagesKnown.split("\n");
  expect(known).toEqual(expect.arrayContaining((draft.languagesSchema?.languages ?? []).map((language) => translateValue(language))));
}

function expectChoices(character: Character, draft: PersFormData): void {
  const chosen = [...Object.values(draft.classChoiceSelections), ...Object.values(draft.subclassChoiceSelections)].flat();
  expect(character.choiceOptions.map((option) => option.choiceOptionId)).toEqual(expect.arrayContaining(chosen));
  expect(character.raceChoiceOptions.map((option) => option.optionId).sort()).toEqual(Object.values(draft.raceChoiceSelections).sort());
}

function expectSpellSlots(character: Character): void {
  const expected = getInitialSpellSlots({ ruleset: "RULES_2014", className: character.class.name, spellcastingType: character.class.spellcastingType,
    standardProgression: SPELL_SLOT_PROGRESSION.FULL, pactProgression: SPELL_SLOT_PROGRESSION.PACT });
  expect(character.currentSpellSlots).toEqual(expected.currentSpellSlots);
  expect(character.currentPactSlots).toBe(expected.currentPactSlots);
}

function expectSpells(character: Character, draft: PersFormData): void {
  const chosenClassSpells = [...(draft.classSpells?.cantripIds ?? []), ...(draft.classSpells?.preparedIds ?? []), ...(draft.classSpells?.spellbookIds ?? [])].sort((left, right) => left - right);
  const spellIdsBy = (origin: string) => character.persSpells.filter((entry) => entry.origin === origin).map((entry) => entry.spellId).sort((left, right) => left - right);
  const classSpellIds = spellIdsBy("CLASS");
  if (character.class.spellcastingType === "NONE") expect(classSpellIds).toEqual([]);
  expect(classSpellIds).toEqual(expect.arrayContaining(chosenClassSpells));
  expect(spellIdsBy("RACE")).toEqual(expect.arrayContaining([...(draft.raceSpellIds ?? [])]));
  const initiallyPrepared = draft.initialPreparedSpellIds ?? [];
  if (!initiallyPrepared.length) return;
  const preparedFromBook = character.persSpells.filter((entry) => entry.origin === "CLASS" && entry.isPrepared).map((entry) => entry.spellId);
  expect(initiallyPrepared.every((spellId) => preparedFromBook.includes(spellId))).toBe(true);
}

async function expectWeaponsAndArmor(character: Character, draft: PersFormData): Promise<void> {
  const selections = draft.equipmentSchema!;
  const optionIds = Object.values(selections.choiceGroupToId).flat();
  const rows = await prisma.classStartingEquipmentOption.findMany({ where: { optionId: { in: optionIds } }, include: { weapon: true, armor: true } });
  const anyWeaponIds = Object.values(selections.anyWeaponSelection).flat();
  const anyWeapons = await prisma.weapon.findMany({ where: { weaponId: { in: anyWeaponIds } } });
  const expectedWeapons = new Set([
    ...rows.flatMap((row) => (row.weapon ? [row.weapon.name] : [])),
    ...anyWeapons.map((weapon) => weapon.name),
    ...(hasUnarmedStrikeFromStart(character.class.name) ? ["UNARMED_STRIKE"] : []),
  ]);
  expect([...new Set(character.weapons.map((entry) => entry.weapon.name))].sort()).toEqual([...expectedWeapons].sort());
  expectChosenGroupsCoverWeapons(rows, selections);
  const armorRows = rows.flatMap((row) => (row.armor ? [row.armor] : []));
  expect(character.armors.map((armor) => armor.armorId)).toEqual(expect.arrayContaining(armorRows.filter((armor) => armor.armorType !== "SHIELD").map((armor) => armor.armorId)));
  expect(character.wearsShield).toBe(armorRows.some((armor) => armor.armorType === "SHIELD"));
}

function expectChosenGroupsCoverWeapons(rows: ClassStartingEquipmentOption[], selections: NonNullable<PersFormData["equipmentSchema"]>): void {
  for (const [group, weaponIds] of Object.entries(selections.anyWeaponSelection)) {
    const anyWeaponRow = rows.find((row) => selections.choiceGroupToId[group]?.includes(row.optionId) && row.chooseAnyWeapon);
    expect(weaponIds, `група ${group}: кількість вибраної зброї`).toHaveLength(anyWeaponRow?.weaponCount ?? 0);
  }
}
