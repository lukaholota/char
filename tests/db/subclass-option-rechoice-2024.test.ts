/**
 * KR37.4 — перевибір землі Кола землі з листа: рядки старої землі зникають, нової — приходять за
 * поточним рівнем друїда; та сама земля — без змін; чужа опція й чужа група відхиляються.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { findCreatorContent, type CreatorContent } from "@/server/db/creator-content-query";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/content/creator-content", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/content/creator-content")>(),
  findCharacterCreatorOptions: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { loadSubclassOptionRechoice, saveSubclassOptionRechoice } from "@/lib/actions/subclass-option-rechoice";
import { getCharacterFeaturesGrouped } from "@/lib/actions/pers";

const GROUP = "Коло землі";
const POLAR = "Circle of the Land: Polar (2024)";
const TEMPERATE = "Circle of the Land: Temperate (2024)";

let content: CreatorContent;
let persId: number;
let ids: Record<string, number>;

beforeAll(async () => {
  content = await findCreatorContent(prisma, "RULES_2024");
  vi.mocked(findCharacterCreatorOptions).mockReturnValue(content);
  await resetUserData();
  persId = await createLandDruidAtFive();
});
afterAll(disconnectDatabase);
beforeEach(async () => {
  await saveSubclassOptionRechoice(persId, { groupName: GROUP, toOptionId: ids[POLAR] });
});

function druid() {
  return content.classes.find((candidate) => candidate.name === "DRUID_2024")!;
}

async function createLandDruidAtFive() {
  const user = await prisma.user.create({ data: { email: "land-rechoice@holota.family", name: "land-rechoice" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const characterClass = druid();
  const subclass = characterClass.subclasses.find((candidate) => candidate.name === "CIRCLE_OF_THE_LAND")!;
  ids = Object.fromEntries(subclass.subclassChoiceOptions.map((link) => [link.choiceOption.optionNameEng, link.choiceOptionId as number]));
  const magician = characterClass.classChoiceOptions.find((link) => link.choiceOption.optionNameEng === "Primal Order: Magician (2024)")!;

  const created = await createCharacter(await withCreationSpells(minimalForm({
    classId: characterClass.classId,
    raceId: content.races.find((candidate) => candidate.name === "DWARF_2024")!.raceId,
    backgroundId: content.backgrounds.find((candidate) => candidate.name === "SOLDIER_2024")!.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "STR", plusOne: "CON" },
    languagesSchema: { languages: ["DWARVISH", "ELVISH"] },
    classChoiceSelections: { "Первісний орден": magician.choiceOptionId },
  })));
  if ("error" in created && created.error) throw new Error(created.error);
  const id = created.persId!;

  await prisma.pers.update({ where: { persId: id }, data: { level: 2 } });
  await levelUp(id, { subclassId: subclass.subclassId, subclassChoiceSelections: { [GROUP]: ids[POLAR] } });
  await levelUp(id);
  await levelUp(id);
  return id;
}

async function levelUp(id: number, form: Partial<Parameters<typeof minimalLevelUpForm>[0]> = {}) {
  const result = await levelUpCharacter(id, await withLevelUpSpells(id, minimalLevelUpForm({ classId: druid().classId, ...form })));
  if ("error" in result && result.error) throw new Error(result.error);
}

async function listSpellsFrom(sourceName: string) {
  const rows = await prisma.persSpell.findMany({ where: { persId, sourceName }, select: { learnedAtLevel: true, spell: { select: { engName: true } } } });
  return rows.map((row) => row.spell.engName).sort();
}

async function listOptionFeatureIds() {
  const pers = await prisma.pers.findUniqueOrThrow({
    where: { persId },
    select: { choiceOptions: { where: { groupName: GROUP }, select: { optionNameEng: true, features: { select: { featureId: true } } } } },
  });
  const rows = await prisma.persFeature.findMany({ where: { persId }, select: { featureId: true } });
  return { options: pers.choiceOptions.map((option) => option.optionNameEng), persFeatureIds: rows.map((row) => row.featureId), optionFeatureIds: pers.choiceOptions.flatMap((option) => option.features.map((entry) => entry.featureId)) };
}

describe("KR37.4 — перевибір землі з листа", () => {
  it("пропозиція: чотири землі, поточна — Полярна; риса на листі позначена як перевибірна", async () => {
    const offer = await loadSubclassOptionRechoice(persId, GROUP);
    if (!offer.ok) throw new Error(offer.error);
    expect(offer.offer.currentOptionId).toBe(ids[POLAR]);
    expect(offer.offer.options.map((option) => option.optionName).sort()).toEqual(["Полярна земля", "Помірна земля", "Посушлива земля", "Тропічна земля"].sort());

    const grouped = await getCharacterFeaturesGrouped(persId);
    const land = Object.values(grouped ?? {}).flat().find((item) => item.name === "Полярна земля");
    expect(land?.rechoosableGroupName).toBe(GROUP);
    expect(Object.values(grouped ?? {}).flat().filter((item) => item.rechoosableGroupName)).toHaveLength(1);
  });

  it("Полярна → Помірна на 5-му: Полярні рядки зникають, Помірна дає 3-й і 5-й рядки, риса й опція міняються", async () => {
    expect(await listSpellsFrom(POLAR)).toEqual(["Fog Cloud", "Hold Person", "Ray of Frost", "Sleet Storm"]);

    const result = await saveSubclassOptionRechoice(persId, { groupName: GROUP, toOptionId: ids[TEMPERATE] });
    expect(result).toEqual({ ok: true, changed: true });

    expect(await listSpellsFrom(POLAR)).toEqual([]);
    expect(await listSpellsFrom(TEMPERATE)).toEqual(["Lightning Bolt", "Misty Step", "Shocking Grasp", "Sleep"]);

    const state = await listOptionFeatureIds();
    expect(state.options).toEqual([TEMPERATE]);
    for (const featureId of state.optionFeatureIds) expect(state.persFeatureIds).toContain(featureId);
  });

  it("та сама земля — без змін; опція поза групою і чужа група — відмова", async () => {
    expect(await saveSubclassOptionRechoice(persId, { groupName: GROUP, toOptionId: ids[POLAR] })).toEqual({ ok: true, changed: false });

    const strangerId = druid().classChoiceOptions.find((link) => link.choiceOption.optionNameEng === "Primal Order: Warden (2024)")!.choiceOptionId;
    expect(await saveSubclassOptionRechoice(persId, { groupName: GROUP, toOptionId: strangerId })).toMatchObject({ ok: false });
    expect(await saveSubclassOptionRechoice(persId, { groupName: "Первісний орден", toOptionId: strangerId })).toMatchObject({ ok: false });
    expect(await listSpellsFrom(POLAR)).toEqual(["Fog Cloud", "Hold Person", "Ray of Frost", "Sleet Storm"]);
  });
});
