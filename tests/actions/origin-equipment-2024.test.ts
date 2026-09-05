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

type EquipmentChoice = "EQUIPMENT" | "GOLD";

describe("KR18.7 — спорядження походження 2024 або 50 зм", () => {
  it("вибір спорядження дає пакунок походження й золото з нього", async () => {
    const created = await createSoldier2024("EQUIPMENT");

    expect(created.customEquipment).toContain("Спис");
    expect(created.customEquipment).toContain("Набір цілителя");
    expect(Number(created.gp)).toBe(14);
  });

  it("вибір золота дає 50 зм і жодного предмета походження", async () => {
    const created = await createSoldier2024("GOLD");

    expect(created.customEquipment).not.toContain("Спис");
    expect(created.customEquipment).not.toContain("Набір цілителя");
    expect(Number(created.gp)).toBe(50);
  });

  it("без вибору походження лишається зі своїм пакунком", async () => {
    const created = await createSoldier2024(undefined);

    expect(created.customEquipment).toContain("Спис");
    expect(Number(created.gp)).toBe(14);
  });

  it("походження 2014 альтернативи не має — золото вибрати нічим", async () => {
    const created = await createFighter2014("GOLD");

    expect(Number(created.gp)).not.toBe(50);
  });
});

async function createSoldier2024(backgroundEquipmentChoice: EquipmentChoice | undefined) {
  return createAndRead({
    race: Races.HUMAN_2024,
    characterClass: Classes.FIGHTER_2024,
    background: BackgroundCategory.SOLDIER_2024,
    ruleset: "RULES_2024",
    backgroundEquipmentChoice,
  });
}

async function createFighter2014(backgroundEquipmentChoice: EquipmentChoice | undefined) {
  return createAndRead({
    race: Races.HUMAN_2014,
    characterClass: Classes.FIGHTER_2014,
    background: BackgroundCategory.SOLDIER,
    ruleset: "RULES_2014",
    backgroundEquipmentChoice,
  });
}

async function createAndRead(input: {
  race: Races;
  characterClass: Classes;
  background: BackgroundCategory;
  ruleset: "RULES_2014" | "RULES_2024";
  backgroundEquipmentChoice: EquipmentChoice | undefined;
}) {
  const user = await prisma.user.create({
    data: { email: `origin-equipment-${Math.random()}@holota.family`, name: "Origin Equipment" },
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
        choiceGroupToId: {},
        anyWeaponSelection: {},
        ...(input.backgroundEquipmentChoice ? { backgroundEquipmentChoice: input.backgroundEquipmentChoice } : {}),
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
