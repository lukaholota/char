/**
 * KR31.8 / L16-ruleset-isolation-03 — діалоги «Додати зброю» й «Додати обладунок» на листі
 * показують каталог редакції персонажа, а сервер не приймає рядок чужої.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Ruleset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { addArmor, addWeapon, getBaseEquipment } from "@/server/db/equipment-actions";

const EMAIL = "sheet-equipment-ruleset@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createFighter2024() {
  const [cls, race, background] = await Promise.all([
    classByName("FIGHTER_2024"),
    raceByName("HUMAN_2024"),
    backgroundByName("ACOLYTE"),
  ]);
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Воїн",
      ruleset: "RULES_2024",
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 1,
      currentHp: 12,
      maxHp: 12,
      str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10,
    },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return pers;
}

const findLongsword = (ruleset: Ruleset) =>
  prisma.weapon.findUniqueOrThrow({ where: { name_ruleset: { name: "LONGSWORD", ruleset } } });

const findChainMail = (ruleset: Ruleset) =>
  prisma.armor.findUniqueOrThrow({ where: { name_ruleset: { name: "CHAIN_MAIL", ruleset } } });

describe("каталог спорядження листа за редакцією", () => {
  it("персонаж 2024 бачить лише зброю й обладунок 2024, і зброя несе майстерність", async () => {
    const result = await getBaseEquipment("RULES_2024");
    if (!result.success || !result.weapons || !result.armors) throw new Error(JSON.stringify(result));

    expect(new Set(result.weapons.map((weapon) => weapon.ruleset))).toEqual(new Set(["RULES_2024"]));
    expect(new Set(result.armors.map((armor) => armor.ruleset))).toEqual(new Set(["RULES_2024"]));
    expect(result.weapons.find((weapon) => weapon.name === "LONGSWORD")?.mastery).toBe("SAP");
  });

  it("персонаж 2014 не бачить рядків 2024", async () => {
    const result = await getBaseEquipment("RULES_2014");
    if (!result.success || !result.weapons || !result.armors) throw new Error(JSON.stringify(result));

    expect(new Set(result.weapons.map((weapon) => weapon.ruleset))).toEqual(new Set(["RULES_2014"]));
    expect(new Set(result.armors.map((armor) => armor.ruleset))).toEqual(new Set(["RULES_2014"]));
  });
});

describe("сервер не приймає спорядження чужої редакції", () => {
  it("зброя 2014 персонажу 2024 — відмова, зброя 2024 — записана", async () => {
    const pers = await createFighter2024();
    const [longsword2014, longsword2024] = await Promise.all([findLongsword("RULES_2014"), findLongsword("RULES_2024")]);

    expect((await addWeapon(pers.persId, longsword2014.weaponId, {})).success).toBe(false);
    expect((await addWeapon(pers.persId, longsword2024.weaponId, {})).success).toBe(true);

    const owned = await prisma.persWeapon.findMany({ where: { persId: pers.persId }, select: { weaponId: true } });
    expect(owned.map((row) => row.weaponId)).toEqual([longsword2024.weaponId]);
  });

  it("обладунок 2014 персонажу 2024 — відмова, обладунок 2024 — записаний", async () => {
    const pers = await createFighter2024();
    const [mail2014, mail2024] = await Promise.all([findChainMail("RULES_2014"), findChainMail("RULES_2024")]);

    expect((await addArmor(pers.persId, mail2014.armorId, {})).success).toBe(false);
    expect((await addArmor(pers.persId, mail2024.armorId, {})).success).toBe(true);

    const owned = await prisma.persArmor.findMany({ where: { persId: pers.persId }, select: { armorId: true } });
    expect(owned.map((row) => row.armorId)).toEqual([mail2024.armorId]);
  });
});
