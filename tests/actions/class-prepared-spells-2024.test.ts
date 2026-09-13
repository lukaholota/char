import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { build2024MulticlassCharacter } from "../helpers/build-2024-multiclass-character";
import type { Multiclass2024Fixture } from "../fixtures/2024-multiclass";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 180_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

/**
 * KR31.5 — «Ви завжди маєте це заклинання підготовленим» від самого класу.
 *
 * Улюблений ворог слідопита дає Hunter's Mark уже на 1-му рівні, тобто **при створенні**;
 * Клятвений удар паладина — Divine Smite на 2-му, Вірний скакун — Find Steed на 5-му.
 */
async function build2024Character(input: {
  startingClass: string;
  background: string;
  plusTwo: string;
  plusOne: string;
  originFeat: string;
  originFeatChoices?: Array<{ choice: string; option: string }>;
  classChoices?: Array<{ choice: string; option: string }>;
  levelUps?: Array<Record<string, unknown>>;
}) {
  const user = await prisma.user.create({
    data: { email: `class-spells-${Math.random()}@holota.family`, name: "Class Spells" },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const fixture = {
    id: `class-prepared-${input.startingClass}`,
    title: `Людина, ${input.startingClass} — класові заклинання`,
    reference: "KR31.5",
    why: "завжди підготовлені заклинання класу",
    input: {
      species: "HUMAN_2024",
      startingClass: input.startingClass,
      background: input.background,
      baseAbilityScores: { STR: 13, DEX: 14, CON: 13, INT: 10, WIS: 15, CHA: 12 },
      backgroundAsi: { mode: "+2/+1" as const, plusTwo: input.plusTwo, plusOne: input.plusOne },
      originFeat: input.originFeat,
      ...(input.originFeatChoices ? { originFeatChoices: input.originFeatChoices } : {}),
      ...(input.classChoices ? { classChoices: input.classChoices } : {}),
      speciesChoices: [],
      levelUps: input.levelUps ?? [],
    },
    expected: {} as Multiclass2024Fixture["expected"],
  } as unknown as Multiclass2024Fixture;

  return build2024MulticlassCharacter(fixture, { createCharacter, levelUpCharacter, getLevelUpInfo });
}

async function readGrantedSpells(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, excludeFromPreparedCount: true },
    select: { isPrepared: true, learnedAtLevel: true, badgeText: true, spell: { select: { engName: true } } },
  });

  return rows.sort((left, right) => left.spell.engName.localeCompare(right.spell.engName));
}

describe("KR31.5 — клас 2024 тримає свої заклинання підготовленими", () => {
  it("слідопит дістає Hunter's Mark уже при створенні, від Улюбленого ворога", async () => {
    const built = await build2024Character({ startingClass: "RANGER_2024", background: "FARMER_2024", plusTwo: "WIS", plusOne: "CON", originFeat: "TOUGH" });

    expect(built.creationError).toBeNull();
    const granted = await readGrantedSpells(built.persId!);

    expect(granted.map((row) => row.spell.engName)).toEqual(["Hunter's Mark"]);
    expect(granted[0]).toMatchObject({ isPrepared: true, learnedAtLevel: 1, badgeText: "Улюблений ворог" });
  });

  it("друїд дістає Speak with Animals від Друїдичної", async () => {
    const built = await build2024Character({
      startingClass: "DRUID_2024",
      background: "FARMER_2024",
      plusTwo: "WIS",
      plusOne: "CON",
      originFeat: "TOUGH",
      classChoices: [{ choice: "Первісний орден", option: "Primal Order: Warden" }],
    });

    expect(built.creationError).toBeNull();
    expect((await readGrantedSpells(built.persId!)).map((row) => row.spell.engName)).toEqual(["Speak with Animals"]);
  });

  it("паладин дістає Divine Smite на 2-му рівні, а Find Steed — на 5-му", async () => {
    const built = await build2024Character({
      startingClass: "PALADIN_2024",
      background: "NOBLE_2024",
      plusTwo: "CHA",
      plusOne: "STR",
      originFeat: "SKILLED",
      originFeatChoices: [
        { choice: "Володіння", option: "ATHLETICS" },
        { choice: "Володіння", option: "INSIGHT" },
        { choice: "Володіння", option: "PERSUASION" },
      ],
      levelUps: [
        {
          characterLevel: 2,
          class: "PALADIN_2024",
          isNewClass: false,
          classChoices: [{ choice: "Бойовий стиль", option: "Defense" }],
        },
        { characterLevel: 3, class: "PALADIN_2024", isNewClass: false, subclass: "OATH_OF_DEVOTION" },
        {
          characterLevel: 4,
          class: "PALADIN_2024",
          isNewClass: false,
          asi: [{ ability: "STR", value: 1 }, { ability: "CHA", value: 1 }],
        },
        { characterLevel: 5, class: "PALADIN_2024", isNewClass: false },
      ],
    });

    expect(built.creationError).toBeNull();
    expect(built.levelUpErrors).toEqual([]);

    const granted = await readGrantedSpells(built.persId!);
    const byName = new Map(granted.map((row) => [row.spell.engName, row.learnedAtLevel]));

    expect(byName.get("Divine Smite")).toBe(2);
    expect(byName.get("Find Steed")).toBe(5);
  });
});
