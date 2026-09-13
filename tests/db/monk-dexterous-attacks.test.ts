/**
 * KR31.6 — Спритні атаки монаха на персонажі, завантаженому так само, як його бачить лист.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArmorCategory, Classes, Races, Ruleset, WeaponCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";
import { MARTIAL_ARTS_FEATURE_ENG_NAMES } from "@/rules/martial-arts";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { getPersById } from "@/lib/actions/pers";
import {
  calculateWeaponAttackBonus,
  calculateWeaponDamageBonus,
  calculateWeaponDamageDice,
} from "@/lib/logic/bonus-calculator";

const EMAIL = "monk-dexterous@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

type MonkInput = { ruleset: Ruleset; monkClass: Classes; race: Races; armor: ArmorCategory; weapon?: WeaponCategory };

async function createMonkWithWeapon(input: MonkInput) {
  const [cls, race, background] = await Promise.all([
    classByName(input.monkClass),
    raceByName(input.race),
    backgroundByName("ACOLYTE"),
  ]);
  const [weapon, armor] = await Promise.all([
    prisma.weapon.findUniqueOrThrow({ where: { name_ruleset: { name: input.weapon ?? "QUARTERSTAFF", ruleset: input.ruleset } } }),
    prisma.armor.findUniqueOrThrow({ where: { name_ruleset: { name: input.armor, ruleset: input.ruleset } } }),
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
      level: 5,
      currentHp: 30,
      maxHp: 30,
      str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 10,
      weapons: { create: [{ weaponId: weapon.weaponId, isProficient: true }] },
      armors: { create: [{ armorId: armor.armorId, equipped: true }] },
    },
  });

  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  const loaded = await getPersById(pers.persId);
  if (!loaded) throw new Error("getPersById не повернув персонажа");
  return { pers: loaded, weapon: loaded.weapons[0] };
}

describe("Бойові мистецтва в базі", () => {
  it("кожна назва реєстру — фіча монаха 1-го рівня", async () => {
    const links = await prisma.classFeature.findMany({
      where: { feature: { engName: { in: [...MARTIAL_ARTS_FEATURE_ENG_NAMES] } } },
      select: { levelGranted: true, class: { select: { name: true } }, feature: { select: { engName: true } } },
    });

    expect(links.map((link) => `${link.feature.engName} → ${link.class.name} ${link.levelGranted}`).sort()).toEqual([
      "Martial Arts → MONK_2014 1",
      "Monk: Martial Arts (2024) → MONK_2024 1",
    ]);
  });
});

describe("посох монаха 5-го рівня, СИЛ 12 / СПР 16", () => {
  it("монах 2024 без обладунку: +6 до атаки, +3 до шкоди", async () => {
    const { pers, weapon } = await createMonkWithWeapon({
      ruleset: "RULES_2024", monkClass: "MONK_2024", race: "HUMAN_2024", armor: "UNARMORED_DEFENSE_MONK",
    });

    expect(calculateWeaponAttackBonus(pers, weapon)).toBe(6);
    expect(calculateWeaponDamageBonus(pers, weapon)).toBe(3);
  });

  it("монах 2014 без обладунку — так само", async () => {
    const { pers, weapon } = await createMonkWithWeapon({
      ruleset: "RULES_2014", monkClass: "MONK_2014", race: "HUMAN_2014", armor: "UNARMORED_DEFENSE_MONK",
    });

    expect(calculateWeaponAttackBonus(pers, weapon)).toBe(6);
  });

  it("монах 2024 у шкіряному обладунку б'є від Сили: +4", async () => {
    const { pers, weapon } = await createMonkWithWeapon({
      ruleset: "RULES_2024", monkClass: "MONK_2024", race: "HUMAN_2024", armor: "LEATHER",
    });

    expect(calculateWeaponAttackBonus(pers, weapon)).toBe(4);
  });
});

describe("беззбройний удар Монаха 5 2024", () => {
  it("рядок зброї існує і б'є кубиком Бойових мистецтв від Спритності: +6, 1d8+3", async () => {
    const { pers, weapon } = await createMonkWithWeapon({
      ruleset: "RULES_2024", monkClass: "MONK_2024", race: "HUMAN_2024", armor: "UNARMORED_DEFENSE_MONK", weapon: "UNARMED_STRIKE",
    });

    expect(calculateWeaponAttackBonus(pers, weapon)).toBe(6);
    expect(calculateWeaponDamageDice(pers, weapon)).toBe("1d8");
    expect(calculateWeaponDamageBonus(pers, weapon)).toBe(3);
  });
});
