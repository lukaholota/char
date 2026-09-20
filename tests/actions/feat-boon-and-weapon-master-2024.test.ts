/**
 * KR31.4 — хвіст механіки рис 2024 наскрізно через `levelUpCharacter`: Дар опору стихіям кладе
 * обрані опори на лист, а слот Weapon Master у класу без майстерності має з чого обирати.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Classes, Feats, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { getPersById } from "@/lib/actions/pers";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { calculateDamageResistances } from "@/lib/logic/bonus-calculator";
import { findPersWeaponMasteryOffer } from "@/server/db/weapon-mastery";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createCharacterAtLevel(input: { className: Classes; subclass: Subclasses; level: number }) {
  const user = await prisma.user.create({ data: { email: `feat-tail-${Math.random()}@holota.family`, name: "Хвіст рис" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [cls, race, background] = await Promise.all([classByName(input.className), raceByName("HUMAN_2024"), backgroundByName("SAGE_2024")]);
  const subclass = await subclassByName(cls.classId, input.subclass);

  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: `${input.className} ${input.level}`,
      ruleset: "RULES_2024",
      classId: cls.classId,
      subclassId: subclass.subclassId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: input.level,
      currentHp: 100,
      maxHp: 100,
      str: 14, dex: 14, con: 14, int: 14, wis: 12, cha: 10,
    },
  });
  return { persId: pers.persId, classId: cls.classId };
}

function findFeat2024(name: Feats) {
  return prisma.feat.findFirstOrThrow({ where: { name, ruleset: "RULES_2024" }, select: { featId: true } });
}

async function findFeatOptionIds(featName: Feats, optionNameEngs: string[]) {
  const feat = await findFeat2024(featName);
  const links = await prisma.featChoiceOption.findMany({
    where: { featId: feat.featId, choiceOption: { optionNameEng: { in: optionNameEngs } } },
    select: { choiceOption: { select: { choiceOptionId: true, groupName: true } } },
  });
  if (links.length !== optionNameEngs.length) throw new Error(`${featName}: знайдено ${links.length} з ${optionNameEngs.length} опцій`);

  const byGroup: Record<string, number[]> = {};
  for (const { choiceOption } of links) (byGroup[choiceOption.groupName] ??= []).push(choiceOption.choiceOptionId);
  return { featId: feat.featId, featChoiceSelections: byGroup };
}

describe("KR31.4 — Дар опору стихіям 2024", () => {
  it("два обрані типи шкоди стають опорами на завантаженому листі", async () => {
    const { persId, classId } = await createCharacterAtLevel({ className: "FIGHTER_2024", subclass: "CHAMPION", level: 18 });
    const { featId, featChoiceSelections } = await findFeatOptionIds("BOON_OF_ENERGY_RESISTANCE", [
      "Boon Of Energy Resistance 2024 (CON)",
      "Boon of Energy Resistance 2024 (FIRE)",
      "Boon of Energy Resistance 2024 (COLD)",
    ]);

    const result = await levelUpCharacter(persId, minimalLevelUpForm({ classId, featId, featChoiceSelections }));
    expect(result).not.toHaveProperty("error");

    const sheet = await getPersById(persId);
    expect(calculateDamageResistances(sheet!)).toEqual(["COLD", "FIRE"]);
  });
});

describe("KR31.4 — Weapon Master 2024 у класу без майстерності", () => {
  it("чарівник обирає просту зброю, якою володіє, і вибір зберігається", async () => {
    const { persId, classId } = await createCharacterAtLevel({ className: "WIZARD_2024", subclass: "EVOKER", level: 3 });
    const { featId, featChoiceSelections } = await findFeatOptionIds("WEAPON_MASTER", ["Weapon Master 2024 (DEX)"]);
    const dagger = await prisma.weapon.findFirstOrThrow({ where: { ruleset: "RULES_2024", name: "DAGGER" }, select: { weaponId: true } });

    const form = minimalLevelUpForm({ classId, featId, featChoiceSelections, weaponMasteryWeaponIds: [dagger.weaponId] });
    const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, form));
    expect(result).not.toHaveProperty("error");

    const offer = await findPersWeaponMasteryOffer(prisma, persId);
    expect(offer.capacity).toBe(1);
    expect(offer.options.length).toBeGreaterThan(0);
    expect(new Set(offer.options.map((weapon) => weapon.weaponType))).toEqual(new Set(["SIMPLE_WEAPON"]));
    expect(offer.selectedWeaponIds).toEqual([dagger.weaponId]);
  });

  it("володіння бойовою зброєю від риси додає бойову зброю в пул слота", async () => {
    const { persId } = await createCharacterAtLevel({ className: "WIZARD_2024", subclass: "EVOKER", level: 8 });
    const [weaponMaster, martialTraining] = await Promise.all([findFeat2024("WEAPON_MASTER"), findFeat2024("MARTIAL_WEAPON_TRAINING")]);
    await prisma.persFeat.createMany({ data: [{ persId, featId: weaponMaster.featId }, { persId, featId: martialTraining.featId }] });

    const offer = await findPersWeaponMasteryOffer(prisma, persId);
    expect(new Set(offer.options.map((weapon) => weapon.weaponType))).toEqual(new Set(["SIMPLE_WEAPON", "MARTIAL_WEAPON"]));
  });
});

describe("KR31.4 — інструменти на вибір від риси лягають рядком у текст (рішення власника 2026-09-14)", () => {
  it("Ремісник на підвищенні рівня дописує «Інструменти на вибір (3)» у володіння", async () => {
    const { persId, classId } = await createCharacterAtLevel({ className: "FIGHTER_2024", subclass: "CHAMPION", level: 3 });
    const { featId } = await findFeat2024("CRAFTER");

    const result = await levelUpCharacter(persId, minimalLevelUpForm({ classId, featId }));
    expect(result).not.toHaveProperty("error");

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { customProficiencies: true } });
    expect(pers.customProficiencies).toContain("Інструменти на вибір (3)");
  });
});
