/**
 * Щит зі стартового спорядження — це `wearsShield`, а не основний обладунок.
 * Паладин 2014 отримує щит у групі 1 раніше за кольчугу в групі 4; перший рядок броні ставав
 * надітим, і лист показував КБ 2 (QA 12.10, персонажі 17900 і 17902).
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("стартовий щит 2014", () => {
  it("паладин зі щитом і кольчугою носить кольчугу й щит", async () => {
    const pers = await createPaladin2014({ 1: "a", 4: "a" });

    expect(pers.wearsShield).toBe(true);
    expect(pers.armors.map((entry) => [entry.armor.name, entry.equipped])).toEqual([["CHAIN_MAIL", true]]);
  });

  it("без щита в спорядженні щита немає", async () => {
    const pers = await createPaladin2014({ 1: "b", 4: "a" });

    expect(pers.wearsShield).toBe(false);
  });
});

async function createPaladin2014(letters: Record<number, string>) {
  const user = await prisma.user.create({ data: { email: `starting-shield-${Math.random()}@holota.family`, name: "Shield" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2014, ruleset: "RULES_2014" } }),
    prisma.class.findFirstOrThrow({ where: { name: Classes.PALADIN_2014, ruleset: "RULES_2014" } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SOLDIER, ruleset: "RULES_2014" } }),
  ]);
  const choiceGroupToId = Object.fromEntries(await Promise.all(Object.entries(letters).map(async ([group, option]) => {
    const rows = await prisma.classStartingEquipmentOption.findMany({
      where: { classId: characterClass.classId, choiceGroup: Number(group), option },
      select: { optionId: true },
    });
    return [group, rows.map((row) => row.optionId)];
  })));

  const created = await createCharacter(minimalForm({
    raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId, ruleset: "RULES_2014",
    equipmentSchema: { choiceGroupToId, anyWeaponSelection: {} },
  }));
  if ("error" in created && created.error) throw new Error(`${created.error} — ${JSON.stringify(created.details)}`);

  return prisma.pers.findUniqueOrThrow({
    where: { persId: created.persId },
    select: { wearsShield: true, armors: { select: { equipped: true, armor: { select: { name: true } } } } },
  });
}
