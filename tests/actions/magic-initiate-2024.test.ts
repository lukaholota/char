import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { build2024MulticlassCharacter } from "../helpers/build-2024-multiclass-character";
import type { Multiclass2024Fixture, NamedPick } from "../fixtures/2024-multiclass";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const spellList = (option: string): NamedPick => ({ choice: "Список заклинань", option });
const LIST_FEATURES = ["Magic Initiate: Cleric list (2024)", "Magic Initiate: Druid list (2024)"];

describe("KR27.5 — безкоштовне застосування «Посвяченого у магію» — використання фічі списку (Р38)", () => {
  it("фіча кожного списку несе одне використання на довгий відпочинок", async () => {
    const features = await prisma.feature.findMany({
      where: { ruleset: "RULES_2024", engName: { startsWith: "Magic Initiate: " } },
      select: { engName: true, limitedUsesPer: true, usesCount: true },
      orderBy: { engName: "asc" },
    });

    expect(features).toEqual([
      { engName: "Magic Initiate: Cleric list (2024)", limitedUsesPer: "LONG_REST", usesCount: 1 },
      { engName: "Magic Initiate: Druid list (2024)", limitedUsesPer: "LONG_REST", usesCount: 1 },
      { engName: "Magic Initiate: Wizard list (2024)", limitedUsesPer: "LONG_REST", usesCount: 1 },
    ]);
  });

  it("дві риси з різними списками на створенні дають персонажу дві фічі списку — два лічильники", async () => {
    const user = await prisma.user.create({ data: { email: `initiate-${Math.random()}@holota.family`, name: "Initiate" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

    const built = await build2024MulticlassCharacter(humanWizardWithTwoInitiates, { createCharacter, levelUpCharacter, getLevelUpInfo });

    expect(built.creationError).toBeNull();
    expect(built.atLevel1?.featureNames.filter((name) => name.startsWith("Magic Initiate: "))).toEqual(LIST_FEATURES);
  });
});

const humanWizardWithTwoInitiates: Multiclass2024Fixture = {
  id: "kr27.5-human-wizard-two-initiates",
  title: "Людина, чарівник 1: «Посвячений у магію» від походження (клірик) і від Універсальності (друїд)",
  reference: "docs/o27-multiclass-2024/kr27.5-spell-provenance.md",
  why: "Фіча списку лягає персонажу на створенні, а не лише на підвищенні рівня.",
  input: {
    species: "HUMAN_2024",
    startingClass: "WIZARD_2024",
    background: "ACOLYTE",
    baseAbilityScores: { STR: 8, DEX: 10, CON: 13, INT: 15, WIS: 14, CHA: 12 },
    backgroundAsi: { mode: "+2/+1", plusTwo: "WIS", plusOne: "INT" },
    originFeat: "MAGIC_INITIATE",
    originFeatChoices: [spellList("Cleric")],
    speciesChoices: [{ choice: "Риса походження", option: "Magic Initiate" }],
    speciesFeatChoices: [spellList("Druid")],
    levelUps: [],
  },
  expected: {
    characterLevel: 1,
    startingClass: "WIZARD_2024",
    classLevels: { WIZARD_2024: 1 },
    subclassByClass: {},
    finalAbilityScores: { STR: 8, DEX: 10, CON: 13, INT: 16, WIS: 16, CHA: 12 },
    feats: ["MAGIC_INITIATE", "MAGIC_INITIATE"],
    proficiencyBonus: 2,
    hitDiceByType: { d6: 1 },
    casterLevel: 1,
    pactLevel: 0,
    maxSpellSlotLevel: 1,
    pactSlots: null,
  },
};
