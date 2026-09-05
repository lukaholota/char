/**
 * KR26.3 — монети класової опції потрапляють у гаманець, а не в інвентар.
 *
 * Літера «тільки гроші» («(B) 75 GP») — половина кожного класового вибору 2024. Поки рядок
 * `item: "зм"` йшов у `customEquipment`, така літера давала текст «зм x75» і нуль золота, тобто
 * була гіршою за відсутність вибору. Тест фіксує обидві половини: і гроші, і речі.
 *
 * Походженню задано `GOLD`, бо воно дає рівно 50 зм — так класову добавку видно точним числом,
 * а не різницею.
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

const GOLD_FROM_ORIGIN = 50;

describe("KR26.3 — класове стартове золото 2024", () => {
  it("літера «тільки гроші» наповнює гаманець, а не інвентар", async () => {
    const created = await createBarbarian2024("b");

    expect(Number(created.gp)).toBe(GOLD_FROM_ORIGIN + 75);
    expect(created.customEquipment).not.toContain("зм");
  });

  it("літера зі спорядженням дає і речі, і свої монети", async () => {
    const created = await createBarbarian2024("a");

    expect(Number(created.gp)).toBe(GOLD_FROM_ORIGIN + 15);
    expect(created.customEquipment).toContain("Рюкзак");
    expect(created.customEquipment).not.toContain("зм");
  });

  it("без класового вибору лишається саме золото походження", async () => {
    const created = await createBarbarian2024(null);

    expect(Number(created.gp)).toBe(GOLD_FROM_ORIGIN);
  });

  it("жодна редакція не лишає монети рядком інвентарю", async () => {
    const both = [await createBarbarian2024("b"), await createFighter2014()];

    for (const created of both) {
      expect(created.customEquipment ?? "").not.toMatch(/\b(зм|см|мм|ем|пм) x\d/);
    }
  });
});

async function createBarbarian2024(letter: string | null) {
  const optionIds = letter === null ? [] : await findOptionIds(Classes.BARBARIAN_2024, "RULES_2024", letter);

  return createAndRead({
    race: Races.HUMAN_2024,
    characterClass: Classes.BARBARIAN_2024,
    background: BackgroundCategory.SOLDIER_2024,
    ruleset: "RULES_2024",
    optionIds,
  });
}

async function createFighter2014() {
  return createAndRead({
    race: Races.HUMAN_2014,
    characterClass: Classes.FIGHTER_2014,
    background: BackgroundCategory.SOLDIER,
    ruleset: "RULES_2014",
    optionIds: await findOptionIds(Classes.FIGHTER_2014, "RULES_2014", "a"),
  });
}

async function findOptionIds(name: Classes, ruleset: "RULES_2014" | "RULES_2024", option: string) {
  const rows = await prisma.classStartingEquipmentOption.findMany({
    where: { ruleset, option, class: { name, ruleset } },
    select: { optionId: true },
  });

  if (rows.length === 0) throw new Error(`${name} (${option}): у базі немає рядків спорядження`);
  return rows.map((row) => row.optionId);
}

async function createAndRead(input: {
  race: Races;
  characterClass: Classes;
  background: BackgroundCategory;
  ruleset: "RULES_2014" | "RULES_2024";
  optionIds: number[];
}) {
  const user = await prisma.user.create({
    data: { email: `class-equipment-${Math.random()}@holota.family`, name: "Class Equipment" },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: input.race, ruleset: input.ruleset } }),
    prisma.class.findFirstOrThrow({ where: { name: input.characterClass, ruleset: input.ruleset } }),
    prisma.background.findFirstOrThrow({ where: { name: input.background, ruleset: input.ruleset } }),
  ]);

  const created = await createCharacter(
    minimalForm({
      raceId: race.raceId,
      classId: characterClass.classId,
      backgroundId: background.backgroundId,
      ruleset: input.ruleset,
      equipmentSchema: {
        choiceGroupToId: input.optionIds.length ? { 1: input.optionIds } : {},
        anyWeaponSelection: {},
        ...(input.ruleset === "RULES_2024" ? { backgroundEquipmentChoice: "GOLD" as const } : {}),
      },
      ...(input.ruleset === "RULES_2024"
        ? { backgroundAsiChoice: { mode: "+2/+1" as const, plusTwo: "STR" as const, plusOne: "CON" as const } }
        : {}),
    }),
  );
  if ("error" in created && created.error) throw new Error(`${created.error} — ${JSON.stringify(created.details)}`);

  return prisma.pers.findUniqueOrThrow({
    where: { persId: created.persId },
    select: { customEquipment: true, gp: true },
  });
}
