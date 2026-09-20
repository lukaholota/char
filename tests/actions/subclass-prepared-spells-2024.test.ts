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
 * KR31.5 — «Ви завжди маєте ці заклинання підготовленими».
 *
 * Клірик Домену життя бере домені заклинання рівнем клірика: Aid і Bless на 3-му, Mass Healing
 * Word і Revivify — на 5-му. Вони понад ліміт підготовки, тож рядок несе `isPrepared` і
 * `excludeFromPreparedCount`.
 */
async function buildLifeDomainCleric(topLevel: 3 | 5) {
  const user = await prisma.user.create({
    data: { email: `subclass-spells-${Math.random()}@holota.family`, name: "Life Domain" },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const levelUps = [
    { characterLevel: 2, class: "CLERIC_2024", isNewClass: false },
    { characterLevel: 3, class: "CLERIC_2024", isNewClass: false, subclass: "LIFE_DOMAIN" },
    { characterLevel: 4, class: "CLERIC_2024", isNewClass: false, asi: [{ ability: "WIS" as const, value: 2 }] },
    { characterLevel: 5, class: "CLERIC_2024", isNewClass: false },
  ].filter((step) => step.characterLevel <= topLevel);

  const fixture = {
    id: "life-domain-prepared-spells",
    title: "Людина, Клірик 2024 — домені заклинання",
    reference: "KR31.5",
    why: "завжди підготовлені заклинання підкласу",
    input: {
      species: "HUMAN_2024",
      startingClass: "CLERIC_2024",
      background: "ACOLYTE",
      baseAbilityScores: { STR: 10, DEX: 12, CON: 14, INT: 8, WIS: 15, CHA: 13 },
      backgroundAsi: { mode: "+2/+1" as const, plusTwo: "WIS" as const, plusOne: "CHA" as const },
      originFeat: "MAGIC_INITIATE",
      originFeatChoices: [{ choice: "Список заклинань", option: "Cleric" }, { choice: "Базова характеристика заклинань", option: "WIS" }],
      classChoices: [{ choice: "Божественний орден", option: "Divine Order: Protector" }],
      speciesChoices: [],
      levelUps,
    },
    expected: {} as Multiclass2024Fixture["expected"],
  } as Multiclass2024Fixture;

  const built = await build2024MulticlassCharacter(fixture, { createCharacter, levelUpCharacter, getLevelUpInfo });
  return { built, persId: built.persId };
}

async function readSubclassSpells(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, badgeText: "Домен життя" },
    select: {
      isPrepared: true,
      excludeFromPreparedCount: true,
      excludeFromKnownCount: true,
      learnedAtLevel: true,
      spell: { select: { engName: true } },
    },
  });

  return rows.sort((left, right) => left.spell.engName.localeCompare(right.spell.engName));
}

describe("KR31.5 — підклас 2024 тримає свої заклинання підготовленими", () => {
  it("на 3-му рівні клірик Домену життя дістає рівно рядок таблиці за 3-й рівень", async () => {
    const { built, persId } = await buildLifeDomainCleric(3);

    expect(built.creationError).toBeNull();
    expect(built.levelUpErrors).toEqual([]);

    const spells = await readSubclassSpells(persId!);
    expect(spells.map((row) => row.spell.engName)).toEqual(["Aid", "Bless", "Cure Wounds", "Lesser Restoration"]);
  });

  it("вони підготовлені й не зʼїдають ліміту підготовки", async () => {
    const { persId } = await buildLifeDomainCleric(3);
    const spells = await readSubclassSpells(persId!);

    expect(spells).not.toHaveLength(0);
    for (const row of spells) {
      expect({
        prepared: row.isPrepared,
        outsidePreparedLimit: row.excludeFromPreparedCount,
        outsideKnownLimit: row.excludeFromKnownCount,
        learnedAtLevel: row.learnedAtLevel,
      }).toEqual({ prepared: true, outsidePreparedLimit: true, outsideKnownLimit: true, learnedAtLevel: 3 });
    }
  });

  it("наступний рядок таблиці приходить своїм рівнем, а не наперед", async () => {
    const { built, persId } = await buildLifeDomainCleric(5);
    expect(built.levelUpErrors).toEqual([]);

    const spells = await readSubclassSpells(persId!);

    expect(spells.map((row) => row.spell.engName)).toEqual([
      "Aid",
      "Bless",
      "Cure Wounds",
      "Lesser Restoration",
      "Mass Healing Word",
      "Revivify",
    ]);
    expect(spells.filter((row) => row.learnedAtLevel === 5).map((row) => row.spell.engName)).toEqual([
      "Mass Healing Word",
      "Revivify",
    ]);
  });
});
