import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { build2024MulticlassCharacter } from "../helpers/build-2024-multiclass-character";
import type { AbilityCode, Multiclass2024Fixture } from "../fixtures/2024-multiclass";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR31.5 — заклинання 1-го рівня, яке гравець обирає в Доторку феї чи тіні (L03-feats-10)", () => {
  it("обране заклинання школи лягає завжди підготовленим від тієї самої риси", async () => {
    const built = await buildFighterWithFeat("FEY_TOUCHED", "WIS", ["Charm Person"]);

    expect(built.levelUpErrors).toEqual([]);
    expect(built.atFinalLevel?.spellRows).toContainEqual({
      engName: "Charm Person",
      origin: "FEAT",
      sourceName: "FEY_TOUCHED",
      isPrepared: true,
    });
  });

  it("без обраного заклинання сервер рису не приймає", async () => {
    const built = await buildFighterWithFeat("FEY_TOUCHED", "WIS", []);

    expect(built.levelUpErrors.join("\n")).toContain("Оберіть 1 заклинання риси");
  });

  it("заклинання чужої школи сервер відхиляє — False Life належить Некромантії, а не Доторку феї", async () => {
    const built = await buildFighterWithFeat("FEY_TOUCHED", "WIS", ["False Life"]);

    expect(built.levelUpErrors.join("\n")).toContain("Обране заклинання не підходить цій рисі");
  });
});

describe("KR31.5 — Доторк феї й Доторк тіні дають поіменне заклинання з характеристикою підвищення (L03-feats-10)", () => {
  it("воїн 4 з Доторком феї (Мудрість) має Туманний крок завжди підготовленим і джерело FEY_TOUCHED · WIS", async () => {
    const built = await buildFighterWithFeat("FEY_TOUCHED", "WIS", ["Charm Person"]);

    expect(built.levelUpErrors).toEqual([]);
    expect(built.atFinalLevel?.spellRows).toContainEqual({
      engName: "Misty Step",
      origin: "FEAT",
      sourceName: "FEY_TOUCHED",
      isPrepared: true,
    });
    expect(built.atFinalLevel?.spellSources).toContainEqual({ key: "FEY_TOUCHED", ability: "WIS", kind: "FEAT" });
  });

  it("воїн 4 з Доторком тіні (Харизма) має Невидимість і джерело SHADOW_TOUCHED · CHA", async () => {
    const built = await buildFighterWithFeat("SHADOW_TOUCHED", "CHA", ["False Life"]);

    expect(built.levelUpErrors).toEqual([]);
    expect(built.atFinalLevel?.spellRows).toContainEqual({
      engName: "Invisibility",
      origin: "FEAT",
      sourceName: "SHADOW_TOUCHED",
      isPrepared: true,
    });
    expect(built.atFinalLevel?.spellSources).toContainEqual({ key: "SHADOW_TOUCHED", ability: "CHA", kind: "FEAT" });
  });

  it("заклинання риси не зʼїдає ліміт підготовки класу", async () => {
    const built = await buildFighterWithFeat("FEY_TOUCHED", "INT", ["Charm Person"]);
    const row = await prisma.persSpell.findFirst({
      where: { persId: built.persId ?? -1, spell: { engName: "Misty Step" } },
      select: { excludeFromPreparedCount: true, excludeFromKnownCount: true },
    });

    expect(row).toEqual({ excludeFromPreparedCount: true, excludeFromKnownCount: true });
  });
});

async function buildFighterWithFeat(feat: string, featAbility: AbilityCode, featSpells: string[]) {
  const user = await prisma.user.create({ data: { email: `touched-${Math.random()}@holota.family`, name: "Touched" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const fixture = {
    id: `touched-${feat}`,
    title: "Людина, Воїн 2024 — риса із заклинанням на 4-му рівні",
    reference: "docs/o31-builder-release-quality/findings.md#l03-feats-10",
    why: "риса дає поіменне заклинання, яке персонаж без чаклунства інакше не отримав би",
    input: {
      species: "HUMAN_2024",
      startingClass: "FIGHTER_2024",
      background: "CRIMINAL_2024",
      baseAbilityScores: { STR: 10, DEX: 15, CON: 14, INT: 13, WIS: 12, CHA: 8 },
      backgroundAsi: { mode: "+2/+1", plusTwo: "DEX", plusOne: "INT" },
      originFeat: "ALERT",
      classChoices: [{ choice: "Бойовий стиль", option: "Defense" }],
      speciesChoices: [{ choice: "Риса походження", option: "Tough" }],
      weaponMastery: ["Longsword", "Greatsword", "Longbow"],
      levelUps: [
        { characterLevel: 2, class: "FIGHTER_2024", isNewClass: false },
        {
          characterLevel: 3,
          class: "FIGHTER_2024",
          isNewClass: false,
          subclass: "BATTLE_MASTER",
          subclassChoices: [
            { choice: "Маневри майстра бою", option: "Precision Attack" },
            { choice: "Маневри майстра бою", option: "Trip Attack" },
            { choice: "Маневри майстра бою", option: "Riposte" },
          ],
        },
        { characterLevel: 4, class: "FIGHTER_2024", isNewClass: false, feat, featAbility, featSpells },
      ],
    },
    expected: {} as Multiclass2024Fixture["expected"],
  } as Multiclass2024Fixture;

  return build2024MulticlassCharacter(fixture, { createCharacter, levelUpCharacter, getLevelUpInfo });
}
