/**
 * KR31.6 — Рух без обладунків: бонус рахує рівень Монаха на персонажі, завантаженому як на листі.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArmorCategory, Classes, Races, Ruleset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { getPersById } from "@/lib/actions/pers";
import { calculateFinalSpeed } from "@/lib/logic/bonus-calculator";

const EMAIL = "monk-movement@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

type Input = {
  ruleset: Ruleset;
  race: Races;
  mainClass: Classes;
  level: number;
  armor: ArmorCategory;
  monkMulticlass?: { name: Classes; classLevel: number };
};

async function loadSpeed(input: Input): Promise<number> {
  const [cls, race, background, armor, monk] = await Promise.all([
    classByName(input.mainClass),
    raceByName(input.race),
    backgroundByName("ACOLYTE"),
    prisma.armor.findUniqueOrThrow({ where: { name_ruleset: { name: input.armor, ruleset: input.ruleset } } }),
    input.monkMulticlass ? classByName(input.monkMulticlass.name) : Promise.resolve(null),
  ]);

  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Монах",
      ruleset: input.ruleset,
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: input.level,
      currentHp: 40,
      maxHp: 40,
      str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 10,
      armors: { create: [{ armorId: armor.armorId, equipped: true }] },
      multiclasses: monk && input.monkMulticlass
        ? { create: [{ classId: monk.classId, classLevel: input.monkMulticlass.classLevel }] }
        : undefined,
    },
  });

  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  const loaded = await getPersById(pers.persId);
  if (!loaded) throw new Error("getPersById не повернув персонажа");
  return calculateFinalSpeed(loaded);
}

describe("Рух без обладунків на завантаженому листі", () => {
  it("людина-Монах 6 2024 без обладунку — 45 футів", async () => {
    expect(
      await loadSpeed({ ruleset: "RULES_2024", race: "HUMAN_2024", mainClass: "MONK_2024", level: 6, armor: "UNARMORED_DEFENSE_MONK" }),
    ).toBe(45);
  });

  it("Воїн 8 / Монах 6 2014 — бонус від рівня Монаха, 45 футів", async () => {
    expect(
      await loadSpeed({
        ruleset: "RULES_2014",
        race: "HUMAN_2014",
        mainClass: "FIGHTER_2014",
        level: 14,
        armor: "UNARMORED_DEFENSE_MONK",
        monkMulticlass: { name: "MONK_2014", classLevel: 6 },
      }),
    ).toBe(45);
  });

  it("Монах 6 2024 у шкіряному обладунку — 30 футів", async () => {
    expect(
      await loadSpeed({ ruleset: "RULES_2024", race: "HUMAN_2024", mainClass: "MONK_2024", level: 6, armor: "LEATHER" }),
    ).toBe(30);
  });
});
