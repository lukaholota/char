import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function signInNewOwner() {
  const owner = await prisma.user.create({ data: { email: `bug009-${Math.random()}@holota.family`, name: "Owner" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
}

async function createCharacterOfClass(className: Classes) {
  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(className),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(
    minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
  );
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

describe("BUG-009 — вибори 1 рівня класу: створення й мультиклас поводяться однаково (рішення власника 2026-09-14)", () => {
  it("створення Слідопита без улюбленого ворога й місцевості проходить", async () => {
    await signInNewOwner();

    await expect(createCharacterOfClass(Classes.RANGER_2014)).resolves.toBeGreaterThan(0);
  });

  it("мультиклас Воїна в Слідопита без тих самих виборів теж проходить", async () => {
    await signInNewOwner();
    const persId = await createCharacterOfClass(Classes.FIGHTER_2014);
    const ranger = await classByName(Classes.RANGER_2014);

    const result = await levelUpCharacter(persId, minimalLevelUpForm({ classId: ranger.classId, levelUpPath: "MULTICLASS" }));

    expect(result).not.toHaveProperty("error");
    const multiclass = await prisma.persMulticlass.findFirst({ where: { persId, classId: ranger.classId }, select: { classLevel: true } });
    expect(multiclass?.classLevel).toBe(1);
  });

  it("опція, якої клас на цьому рівні не дає, як і раніше відхиляється", async () => {
    await signInNewOwner();
    const persId = await createCharacterOfClass(Classes.FIGHTER_2014);
    const ranger = await classByName(Classes.RANGER_2014);
    const foreignOption = await prisma.classChoiceOption.findFirstOrThrow({
      where: { class: { name: Classes.WARLOCK_2014 } },
      select: { choiceOptionId: true },
    });

    const result = await levelUpCharacter(
      persId,
      minimalLevelUpForm({
        classId: ranger.classId,
        levelUpPath: "MULTICLASS",
        classChoiceSelections: { foreign: foreignOption.choiceOptionId },
      }),
    );

    expect(result).toHaveProperty("error");
  });

  it("на 2 рівні Паладина Бойовий стиль, як і раніше, обовʼязковий", async () => {
    await signInNewOwner();
    const persId = await createCharacterOfClass(Classes.PALADIN_2014);
    const paladin = await classByName(Classes.PALADIN_2014);

    const result = await levelUpCharacter(persId, minimalLevelUpForm({ classId: paladin.classId }));

    expect(result).toEqual({ error: "Дооберіть опції" });
  });
});
