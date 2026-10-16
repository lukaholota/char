/**
 * BUG-036 — клас, у який персонаж увійшов мультикласом, одразу дає заклинання свого підкласу 1-го рівня
 * й класу («завжди підготовлені») з рівнем отримання рівня входу, а не з наступним підвищенням.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { build2024MulticlassCharacter, type Multiclass2024BuildInput } from "../helpers/build-2024-multiclass-character";
import { withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { runManualLevelUpPath } from "../helpers/assembly-manual-path";
import { sorcadinScenario } from "../helpers/assembly-scenarios";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(async () => {
  await resetUserData();
  const user = await prisma.user.create({ data: { email: `multiclass-entry-spells-${Math.random()}@holota.family`, name: "Вхід мультикласом" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
});
afterAll(disconnectDatabase);

async function readRuleGrantedSpells(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, excludeFromPreparedCount: true },
    select: { learnedAtLevel: true, sourceName: true, isPrepared: true, spell: { select: { engName: true } } },
  });
  return rows
    .map((row) => [row.spell.engName, row.sourceName, row.learnedAtLevel, row.isPrepared] as const)
    .sort((left, right) => left[0].localeCompare(right[0]));
}

async function levelUp(persId: number, form: Parameters<typeof minimalLevelUpForm>[0]) {
  const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, minimalLevelUpForm(form)));
  if (result && "error" in result) throw new Error(result.error);
}

async function createFighterInLifeDomain2014(): Promise<{ persId: number; clericClassId: number }> {
  const [race, fighter, cleric, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    classByName(Classes.CLERIC_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: fighter.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(created.error);

  const lifeDomain = await subclassByName(cleric.classId, Subclasses.LIFE_DOMAIN);
  await levelUp(created.persId, { classId: cleric.classId, levelUpPath: "MULTICLASS", subclassId: lifeDomain.subclassId });
  return { persId: created.persId, clericClassId: cleric.classId };
}

const RANGER_INTO_DRUID_2024: Multiclass2024BuildInput = {
  id: "bug-036-ranger-into-druid-2024",
  title: "Людина, слідопит 1 → друїд 1",
  input: {
    species: "HUMAN_2024",
    startingClass: "RANGER_2024",
    background: "FARMER_2024",
    baseAbilityScores: { STR: 13, DEX: 14, CON: 13, INT: 10, WIS: 15, CHA: 12 },
    backgroundAsi: { mode: "+2/+1", plusTwo: "WIS", plusOne: "CON" },
    originFeat: "TOUGH",
    speciesChoices: [],
    levelUps: [
      { characterLevel: 2, class: "DRUID_2024", isNewClass: true, classChoices: [{ choice: "Первісний орден", option: "Primal Order: Warden" }] },
    ],
  },
};

describe("BUG-036 — заклинання класу, взятого мультикласом, приходять при вході", () => {
  it("Паладин 3 → Чародій 1 (Механічна душа): Alarm і Protection from Evil and Good на 4-му рівні персонажа", async () => {
    const created = await createCharacter(await sorcadinScenario.buildStart());
    if ("error" in created) throw new Error(created.error);
    await runManualLevelUpPath(created.persId, sorcadinScenario.manualSteps.slice(0, 3));

    expect((await readRuleGrantedSpells(created.persId)).filter((row) => row[1] === "CLOCKWORK_SOUL")).toEqual([
      ["Alarm", "CLOCKWORK_SOUL", 4, true],
      ["Protection From Evil and Good", "CLOCKWORK_SOUL", 4, true],
    ]);
  });

  it("Воїн 1 → Клірик 1 (Домен життя): Bless і Cure Wounds уже при вході", async () => {
    const { persId } = await createFighterInLifeDomain2014();

    expect(await readRuleGrantedSpells(persId)).toEqual([
      ["Bless", "LIFE_DOMAIN", 2, true],
      ["Cure Wounds", "LIFE_DOMAIN", 2, true],
    ]);
  });

  it("наступні підвищення вже взятого класу дають заклинання за рівнем класу й не дублюють рядків входу", async () => {
    const { persId, clericClassId } = await createFighterInLifeDomain2014();
    await levelUp(persId, { classId: clericClassId });
    await levelUp(persId, { classId: clericClassId });

    expect(await readRuleGrantedSpells(persId)).toEqual([
      ["Bless", "LIFE_DOMAIN", 2, true],
      ["Cure Wounds", "LIFE_DOMAIN", 2, true],
      ["Lesser Restoration", "LIFE_DOMAIN", 4, true],
      ["Spiritual Weapon", "LIFE_DOMAIN", 4, true],
    ]);
  });

  it("2024: слідопит 1 → друїд 1 отримує Speak with Animals від Друїдичної при вході", async () => {
    const built = await build2024MulticlassCharacter(RANGER_INTO_DRUID_2024, { createCharacter, levelUpCharacter, getLevelUpInfo });

    expect(built.creationError).toBeNull();
    expect(built.levelUpErrors).toEqual([]);
    expect((await readRuleGrantedSpells(built.persId!)).map(([name, , learnedAtLevel]) => [name, learnedAtLevel])).toEqual([
      ["Hunter's Mark", 1],
      ["Speak with Animals", 2],
    ]);
  });
});
