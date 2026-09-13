/**
 * KR31.6 / L09-sheet-derived-10 — володіння й мови як похідна з джерел персонажа, завантаженого
 * так само, як його бачить лист.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { getPersById } from "@/lib/actions/pers";
import { calculatePersProficiencies, formatPersProficiencyLines } from "@/lib/logic/pers-proficiencies";

const EMAIL = "pers-proficiencies@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function loadDwarfFighterRogue() {
  const [fighter, rogue, dwarf, background] = await Promise.all([
    classByName("FIGHTER_2014"),
    classByName("ROGUE_2014"),
    raceByName("DWARF_2014"),
    backgroundByName("ACOLYTE"),
  ]);

  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Дворф",
      ruleset: "RULES_2014",
      classId: fighter.classId,
      raceId: dwarf.raceId,
      backgroundId: background.backgroundId,
      level: 5,
      currentHp: 40,
      maxHp: 40,
      str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10,
      multiclasses: { create: [{ classId: rogue.classId, classLevel: 2 }] },
    },
  });

  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  const loaded = await getPersById(pers.persId);
  if (!loaded) throw new Error("getPersById не повернув персонажа");
  return loaded;
}

describe("похідні володіння дворфа Воїн 3 / Пройдисвіт 2 (2014)", () => {
  it("зводить вид, основний клас і пакет мультикласу", async () => {
    const derived = calculatePersProficiencies(await loadDwarfFighterRogue());

    expect([...derived.armor].sort()).toEqual(["HEAVY", "LIGHT", "MEDIUM", "SHIELD"]);
    expect(derived.weaponTypes).toEqual(["SIMPLE_WEAPON", "MARTIAL_WEAPON"]);
    expect(derived.weapons).toEqual(["BATTLEAXE", "HANDAXE", "LIGHT_HAMMER", "WARHAMMER"]);
    expect(derived.tools).toEqual(["THIEVES_TOOLS"]);
    expect(derived.languages).toEqual(["COMMON", "DWARVISH", "THIEVES_CANT"]);
  });

  it("форматує українськими назвами", async () => {
    const lines = formatPersProficiencyLines(calculatePersProficiencies(await loadDwarfFighterRogue()));

    expect(lines.proficiencies[0]).toMatch(/^Обладунки: /);
    expect(lines.proficiencies.some((line) => line.startsWith("Інструменти: ") && !line.includes("THIEVES"))).toBe(true);
    expect(lines.languages).not.toMatch(/[A-Z_]{4,}/);
  });
});
