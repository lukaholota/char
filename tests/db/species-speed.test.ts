/**
 * KR31.6 — `race_choice_option.modifies_speed` додається до швидкості виду. Текст опції каже
 * «зростає до N футів», тож база виду плюс модифікатор мусить дати саме N.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { getPersById } from "@/lib/actions/pers";
import { calculateFinalSpeed } from "@/lib/logic/bonus-calculator";

const EMAIL = "species-speed@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

function readSpeedFromText(description: string | null): number | null {
  const match = description?.match(/до (\d+) футів/);
  return match ? Number(match[1]) : null;
}

describe("модифікатор швидкості вибору виду", () => {
  it("швидкість виду плюс модифікатор дорівнює числу з тексту опції", async () => {
    const options = await prisma.raceChoiceOption.findMany({
      where: { modifiesSpeed: { not: null } },
      include: { race: { select: { name: true, speed: true } } },
    });

    const mismatches = options
      .map((option) => ({
        option: `${option.race.name} / ${option.optionNameEng ?? option.optionName}`,
        fromText: readSpeedFromText(option.description),
        computed: option.race.speed + (option.modifiesSpeed ?? 0),
      }))
      .filter((row) => row.fromText !== row.computed);

    expect(options.length).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });

  it("лісовий ельф 2024 на завантаженому листі ходить на 35 футів", async () => {
    const [cls, race, background] = await Promise.all([
      classByName("DRUID_2024"),
      raceByName("ELF_2024"),
      backgroundByName("ACOLYTE"),
    ]);
    const woodElf = await prisma.raceChoiceOption.findFirstOrThrow({
      where: { raceId: race.raceId, optionNameEng: "Wood Elf" },
    });

    const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
    const pers = await prisma.pers.create({
      data: {
        userId: user.id,
        name: "Лісовий ельф",
        ruleset: "RULES_2024",
        classId: cls.classId,
        raceId: race.raceId,
        backgroundId: background.backgroundId,
        level: 1,
        currentHp: 9,
        maxHp: 9,
        str: 10, dex: 14, con: 14, int: 10, wis: 16, cha: 10,
        raceChoiceOptions: { connect: [{ optionId: woodElf.optionId }] },
      },
    });

    vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
    const loaded = await getPersById(pers.persId);
    if (!loaded) throw new Error("getPersById не повернув персонажа");

    expect(calculateFinalSpeed(loaded)).toBe(35);
  });
});
