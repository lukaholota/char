import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Ability, BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { saveAbilityAdjustments, updateMaxHp } from "@/lib/actions/bonus-actions";
import { setHitDice, shortRest } from "@/lib/actions/rest-actions";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createFighterAtLevelFive(email: string) {
  const user = await prisma.user.create({ data: { email, name: "Hit Points Test User" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(
    minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
  );
  if ("error" in created) throw new Error(created.error);

  const pers = await prisma.pers.update({
    where: { persId: created.persId },
    data: { level: 5, con: 14, maxHp: 44, currentHp: 30, currentHitDice: {} },
  });

  return { persId: pers.persId, classId: characterClass.classId };
}

describe("хіти й кубики здоровʼя на листі персонажа", () => {
  it("піднята Статура додає хіти за всі рівні", async () => {
    const { persId } = await createFighterAtLevelFive("retro-con@golden.test");

    const saved = await saveAbilityAdjustments({
      persId,
      ability: Ability.CON,
      baseScore: 16,
      statBonus: 0,
      modifierBonus: 0,
      saveBonus: 0,
      isSaveProficient: false,
    });

    expect(saved).toEqual({ success: true, maxHp: 49, currentHp: 35 });

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId } });
    expect({ con: pers.con, maxHp: pers.maxHp, currentHp: pers.currentHp }).toEqual({
      con: 16,
      maxHp: 49,
      currentHp: 35,
    });
  });

  it("бонус до Статури рухає хіти так само, як базове значення", async () => {
    const { persId } = await createFighterAtLevelFive("bonus-con@golden.test");

    const saved = await saveAbilityAdjustments({
      persId,
      ability: Ability.CON,
      baseScore: 14,
      statBonus: 2,
      modifierBonus: 0,
      saveBonus: 0,
      isSaveProficient: true,
    });

    expect(saved).toEqual({ success: true, maxHp: 49, currentHp: 35 });

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId } });
    expect(pers.statBonuses).toEqual({ CON: 2 });
    expect(pers.additionalSaveProficiencies).toEqual([Ability.STR, Ability.CON]);
  });

  it("інша характеристика хітів не чіпає", async () => {
    const { persId } = await createFighterAtLevelFive("other-ability@golden.test");

    await saveAbilityAdjustments({
      persId,
      ability: Ability.STR,
      baseScore: 18,
      statBonus: 0,
      modifierBonus: 0,
      saveBonus: 0,
      isSaveProficient: false,
    });

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId } });
    expect({ str: pers.str, maxHp: pers.maxHp, currentHp: pers.currentHp }).toEqual({
      str: 18,
      maxHp: 44,
      currentHp: 30,
    });
  });

  it("максимум хітів редагується вручну, поточні підтягуються під нього", async () => {
    const { persId } = await createFighterAtLevelFive("max-hp-override@golden.test");

    await expect(updateMaxHp(persId, 25)).resolves.toEqual({ success: true, maxHp: 25, currentHp: 25 });
    await expect(updateMaxHp(persId, 0)).resolves.toMatchObject({ success: false });
  });

  it("кубик здоровʼя віднімається вручну без лікування", async () => {
    const { persId, classId } = await createFighterAtLevelFive("manual-hit-dice@golden.test");

    const result = await setHitDice(persId, { [classId]: 3 });
    expect(result).toEqual({ success: true, currentHitDice: { [classId]: 3 } });

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId } });
    expect(pers.currentHitDice).toEqual({ [String(classId)]: 3 });
    expect(pers.currentHp).toBe(30);
  });

  it("ручне виставлення понад максимум обрізається до рівня", async () => {
    const { persId, classId } = await createFighterAtLevelFive("hit-dice-cap@golden.test");

    await expect(setHitDice(persId, { [classId]: 99 })).resolves.toEqual({
      success: true,
      currentHitDice: { [classId]: 5 },
    });
  });

  it("короткий відпочинок бере накидані вживу хіти замість власного кидка", async () => {
    const { persId, classId } = await createFighterAtLevelFive("manual-short-rest@golden.test");

    // 5 менше за мінімум власного кидка застосунку (2 кубики по d10 + 2 за Статуру),
    // тож зелений тест означає саме те, що введене число взяли, а не накидали своє.
    const result = await shortRest(persId, [{ classId, count: 2 }], 5);
    expect(result).toMatchObject({ success: true, hpRestored: 5, newCurrentHp: 35 });

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId } });
    expect(pers.currentHitDice).toEqual({ [String(classId)]: 3 });
  });

  it("нуль накиданих хітів списує кубик і лишає хіти як були", async () => {
    const { persId, classId } = await createFighterAtLevelFive("zero-short-rest@golden.test");

    const result = await shortRest(persId, [{ classId, count: 1 }], 0);
    expect(result).toMatchObject({ success: true, hpRestored: 0, newCurrentHp: 30 });

    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId } });
    expect(pers.currentHitDice).toEqual({ [String(classId)]: 4 });
  });
});
