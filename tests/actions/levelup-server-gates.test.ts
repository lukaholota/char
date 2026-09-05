import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

function signInAs(email: string): void {
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
}

async function createFighter(ownerEmail: string) {
  signInAs(ownerEmail);
  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(
    minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
  );
  if ("error" in created || !created.persId) {
    throw new Error("error" in created ? created.error : "Character not created");
  }
  return { persId: created.persId, characterClass };
}

describe("KR31.9 — getLevelUpInfo не віддає й не змінює чужого персонажа", () => {
  it("GET: залогінений сторонній не бачить кроки підвищення чужого персонажа", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const stranger = await prisma.user.create({ data: { email: `stranger-${Math.random()}@holota.family`, name: "Stranger" } });

    const { persId } = await createFighter(owner.email);

    signInAs(stranger.email);
    const info = await getLevelUpInfo(persId);

    expect(info).toHaveProperty("error");
    expect("pers" in info).toBe(false);
  });

  it("POST: залогінений сторонній не може підняти рівень чужому персонажу", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const stranger = await prisma.user.create({ data: { email: `stranger-${Math.random()}@holota.family`, name: "Stranger" } });

    const { persId, characterClass } = await createFighter(owner.email);

    signInAs(stranger.email);
    const result = await levelUpCharacter(persId, minimalLevelUpForm({ classId: characterClass.classId }));

    expect(result).toHaveProperty("error");

    const persAfter = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { level: true } });
    expect(persAfter.level).toBe(1);
  });

  it("власник і далі бачить і піднімає рівень власного персонажа", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const { persId } = await createFighter(owner.email);

    signInAs(owner.email);
    const info = await getLevelUpInfo(persId);

    expect(info).not.toHaveProperty("error");
  });
});

describe("KR31.9 — сервер відхиляє неправильний пакет ASI (L08-levelup-machine-05)", () => {
  it("три характеристики по +2 замість «+2 або два +1» — відхилено, рівень не змінюється", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const { persId, characterClass } = await createFighter(owner.email);

    expect(characterClass.abilityScoreUpLevels ?? []).toContain(4);
    await prisma.pers.update({ where: { persId }, data: { level: 3 } });

    signInAs(owner.email);
    const before = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { str: true, dex: true, con: true } });

    const result = await levelUpCharacter(
      persId,
      minimalLevelUpForm({
        classId: characterClass.classId,
        customAsi: [
          { ability: "STR", value: 2 },
          { ability: "DEX", value: 2 },
          { ability: "CON", value: 2 },
        ],
      }),
    );

    expect(result).toHaveProperty("error");

    const after = await prisma.pers.findUniqueOrThrow({
      where: { persId },
      select: { level: true, str: true, dex: true, con: true },
    });
    expect(after.level).toBe(3);
    expect(after).toMatchObject(before);
  });

  it("одна характеристика +2 на ASI-рівні — прийнято, рівень і показник ростуть", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const { persId, characterClass } = await createFighter(owner.email);
    await prisma.pers.update({ where: { persId }, data: { level: 3 } });

    const before = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { str: true } });

    signInAs(owner.email);
    const result = await levelUpCharacter(
      persId,
      minimalLevelUpForm({ classId: characterClass.classId, customAsi: [{ ability: "STR", value: 2 }] }),
    );

    expect(result).not.toHaveProperty("error");

    const after = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { level: true, str: true } });
    expect(after.level).toBe(4);
    expect(after.str).toBe(before.str + 2);
  });

  it("ASI-пакет на рівні, що не дає підвищення характеристик — відхилено", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const { persId, characterClass } = await createFighter(owner.email);

    expect(characterClass.abilityScoreUpLevels ?? []).not.toContain(2);
    // level 1 -> 2 у Воїна 2014 підвищення характеристик не дає.

    signInAs(owner.email);
    const result = await levelUpCharacter(
      persId,
      minimalLevelUpForm({ classId: characterClass.classId, customAsi: [{ ability: "STR", value: 2 }] }),
    );

    expect(result).toHaveProperty("error");
  });

  it("ASI-рівень мультикласу рахується за класом, що левелапиться, а не за головним (L08-levelup-machine-13)", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-${Math.random()}@holota.family`, name: "Owner" } });
    const { persId } = await createFighter(owner.email);
    const rogueClass = await classByName(Classes.ROGUE_2014);
    expect(rogueClass.abilityScoreUpLevels ?? []).toContain(4);

    signInAs(owner.email);

    // Мультиклас у Розбійника на 2-му рівні персонажа — Воїн лишається 1-го рівня назавжди.
    const multiclassResult = await levelUpCharacter(
      persId,
      minimalLevelUpForm({ classId: rogueClass.classId, levelUpPath: "MULTICLASS" }),
    );
    expect(multiclassResult).not.toHaveProperty("error");

    for (let i = 0; i < 2; i++) {
      const step = await levelUpCharacter(
        persId,
        minimalLevelUpForm({ classId: rogueClass.classId, levelUpPath: "EXISTING" }),
      );
      expect(step).not.toHaveProperty("error");
    }

    const before = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { level: true, dex: true } });
    expect(before.level).toBe(4);

    // Розбійник 4-го рівня класу отримує ASI, хоч isASILevel головного Воїна (2-й рівень Воїна)
    // каже "ні" — саме цей розрив і зламав KR27.1 multiclass-fifteen без цього фікса.
    const asiStep = await levelUpCharacter(
      persId,
      minimalLevelUpForm({
        classId: rogueClass.classId,
        levelUpPath: "EXISTING",
        customAsi: [{ ability: "DEX", value: 2 }],
      }),
    );
    expect(asiStep).not.toHaveProperty("error");

    const after = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { level: true, dex: true } });
    expect(after.level).toBe(5);
    expect(after.dex).toBe(before.dex + 2);
  });
});
