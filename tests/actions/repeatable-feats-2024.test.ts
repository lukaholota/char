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

const proficiency = (option: string): NamedPick => ({ choice: "Володіння", option });
const spellList = (option: string): NamedPick => ({ choice: "Список заклинань", option });

describe("KR27.4 — повторювана риса береться двічі, неповторювана відхиляється з причиною", () => {
  it("Skilled від походження і від Універсальності Людини — два рядки й шість володінь", async () => {
    const built = await buildHuman({
      background: "SCRIBE_2024",
      originFeat: "SKILLED",
      originFeatChoices: [proficiency("SLEIGHT_OF_HAND"), proficiency("STEALTH"), proficiency("PERCEPTION")],
      speciesFeat: "Skilled",
      speciesFeatChoices: [proficiency("ATHLETICS"), proficiency("INSIGHT"), proficiency("SURVIVAL")],
    });

    expect(built.creationError).toBeNull();
    expect(built.atLevel1?.featNames.filter((name) => name === "SKILLED")).toHaveLength(2);
    expect(built.atLevel1?.featChoiceLabels.filter((label) => label.startsWith("Skilled "))).toHaveLength(6);
  });

  it("Alert двічі на створенні відхиляється, а не лягає мовчки одним рядком", async () => {
    const built = await buildHuman({ background: "CRIMINAL_2024", originFeat: "ALERT", speciesFeat: "Alert" });

    expect(built.persId).toBeNull();
    expect(built.creationError).toContain("можна взяти лише раз");
  });

  it("Magic Initiate двічі з тим самим списком відхиляється, з іншим — лягає двома списками", async () => {
    const sameList = await buildHuman({
      background: "ACOLYTE",
      backgroundAsi: { mode: "+2/+1", plusTwo: "WIS", plusOne: "INT" },
      originFeat: "MAGIC_INITIATE",
      originFeatChoices: [spellList("Cleric")],
      speciesFeat: "Magic Initiate",
      speciesFeatChoices: [spellList("Cleric")],
    });
    expect(sameList.persId).toBeNull();
    expect(sameList.creationError).toContain("іншим вибором");

    const otherList = await buildHuman({
      background: "ACOLYTE",
      backgroundAsi: { mode: "+2/+1", plusTwo: "WIS", plusOne: "INT" },
      originFeat: "MAGIC_INITIATE",
      originFeatChoices: [spellList("Cleric")],
      speciesFeat: "Magic Initiate",
      speciesFeatChoices: [spellList("Wizard")],
    });
    expect(otherList.creationError).toBeNull();
    expect(otherList.atLevel1?.magicInitiateLists).toEqual(["Cleric", "Wizard"]);
  });

  it("на підвищенні рівня неповторювана риса вдруге відхиляється з причиною, повторювана — лягає другим рядком", async () => {
    const repeatedAlert = await buildHuman({ background: "CRIMINAL_2024", originFeat: "ALERT", levelUpFeat: { feat: "ALERT" } });
    expect(repeatedAlert.levelUpErrors.join("\n")).toContain("можна взяти лише раз");

    const repeatedSkilled = await buildHuman({
      background: "SCRIBE_2024",
      originFeat: "SKILLED",
      originFeatChoices: [proficiency("SLEIGHT_OF_HAND"), proficiency("STEALTH"), proficiency("PERCEPTION")],
      levelUpFeat: { feat: "SKILLED", featChoices: [proficiency("HISTORY"), proficiency("NATURE"), proficiency("RELIGION")] },
    });
    expect(repeatedSkilled.levelUpErrors).toEqual([]);
    expect(repeatedSkilled.atFinalLevel?.featNames.filter((name) => name === "SKILLED")).toHaveLength(2);
    expect(repeatedSkilled.atFinalLevel?.featChoiceLabels.filter((label) => label.startsWith("Skilled "))).toHaveLength(6);
  });
});

type HumanBuildInput = {
  /** Походження задає рису походження саме: Писар — Skilled, Злочинець — Alert, Послушник — Magic Initiate. */
  background: string;
  /** Послушник дозволяє лише INT/WIS/CHA — розподіл походження має лягати в його трійку. */
  backgroundAsi?: { mode: "+2/+1"; plusTwo: string; plusOne: string };
  originFeat: string;
  originFeatChoices?: NamedPick[];
  speciesFeat?: string;
  speciesFeatChoices?: NamedPick[];
  levelUpFeat?: { feat: string; featChoices?: NamedPick[] };
};

/** Людина-воїн 2024 з №14 матриці: єдиний вид із другою рисою походження. */
async function buildHuman(input: HumanBuildInput) {
  const user = await prisma.user.create({ data: { email: `repeatable-${Math.random()}@holota.family`, name: "Repeatable" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const fixture = {
    id: `repeatable-${input.originFeat}`,
    title: "Людина, Воїн 2024 — повторювані риси",
    reference: "KR27.4",
    why: "гейт повторюваних рис",
    input: {
      species: "HUMAN_2024",
      startingClass: "FIGHTER_2024",
      background: input.background,
      baseAbilityScores: { STR: 10, DEX: 15, CON: 14, INT: 13, WIS: 12, CHA: 8 },
      backgroundAsi: input.backgroundAsi ?? { mode: "+2/+1", plusTwo: "DEX", plusOne: "INT" },
      originFeat: input.originFeat,
      originFeatChoices: input.originFeatChoices,
      classChoices: [{ choice: "Бойовий стиль", option: "Defense" }],
      speciesChoices: input.speciesFeat ? [{ choice: "Риса походження", option: input.speciesFeat }] : [],
      speciesFeatChoices: input.speciesFeatChoices,
      weaponMastery: ["Longsword", "Greatsword", "Longbow"],
      levelUps: input.levelUpFeat
        ? [
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
            { characterLevel: 4, class: "FIGHTER_2024", isNewClass: false, ...input.levelUpFeat },
          ]
        : [],
    },
    expected: {} as Multiclass2024Fixture["expected"],
  } as Multiclass2024Fixture;

  return build2024MulticlassCharacter(fixture, { createCharacter, levelUpCharacter, getLevelUpInfo });
}
