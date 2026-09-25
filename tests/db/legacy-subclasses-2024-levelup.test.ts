/**
 * O43 / KR43.7 — приймання: персонажі 2024 з підкласами зі старих книг проходять майстер підвищення
 * тим самим шляхом, що й гравець (серверні дії створення й підвищення), а контроль 2014 і
 * покровитель PHB 2024 лишаються такими, як до O43.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findCreatorContent, type CreatorContent } from "@/server/db/creator-content-query";
import { seedLegacySubclasses2024 } from "../../prisma/seed/legacySubclasses2024";
import { minimalForm } from "../helpers/build-form";
import { build2024MulticlassCharacter, type Built2024MulticlassCharacter, type Multiclass2024BuildInput } from "../helpers/build-2024-multiclass-character";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName, subclassByName, subclassChoiceOptionIdsAtLevel } from "../helpers/seed-lookup";
import { findMulticlassFixture } from "../fixtures/2024-multiclass";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/content/creator-content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content/creator-content")>()),
  findCharacterCreatorOptions: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 300_000 });

const INVOCATIONS = "Потойбічні виклики";
const WARLOCK_INPUT = { ...findMulticlassFixture("16-infernal-tiefling-warlock5-bard3").input, levelUps: [] };
const FIGHTER_INPUT = findMulticlassFixture("14-human-fighter6-rogue4").input;
const WARLOCK_LEVEL_TWO = {
  characterLevel: 2,
  class: "WARLOCK_2024",
  isNewClass: false,
  classChoices: [
    { choice: INVOCATIONS, option: "Agonizing Blast (2024)" },
    { choice: INVOCATIONS, option: "Fiendish Vigor (2024)" },
  ],
};

function warlockTo(id: string, levelUps: Multiclass2024BuildInput["input"]["levelUps"]): Multiclass2024BuildInput {
  return { id, title: id, input: { ...WARLOCK_INPUT, levelUps } };
}

const FIXTURES = {
  genie: warlockTo("A-genie-dao-6", [
    WARLOCK_LEVEL_TWO,
    { characterLevel: 3, class: "WARLOCK_2024", isNewClass: false, subclass: "THE_GENIE", subclassChoices: [{ choice: "Рід джина", option: "Genie Kind: Dao" }] },
    { characterLevel: 4, class: "WARLOCK_2024", isNewClass: false, feat: "SPELL_SNIPER", featAbility: "CHA" },
    {
      characterLevel: 5,
      class: "WARLOCK_2024",
      isNewClass: false,
      classChoices: [
        { choice: INVOCATIONS, option: "Eldritch Smite (2024)" },
        { choice: INVOCATIONS, option: "Devil's Sight (2024)" },
      ],
    },
    { characterLevel: 6, class: "WARLOCK_2024", isNewClass: false },
  ]),
  hexblade: warlockTo("B-hexblade-3", [WARLOCK_LEVEL_TWO, { characterLevel: 3, class: "WARLOCK_2024", isNewClass: false, subclass: "HEXBLADE" }]),
  undying: warlockTo("D-undying-3", [WARLOCK_LEVEL_TWO, { characterLevel: 3, class: "WARLOCK_2024", isNewClass: false, subclass: "UNDYING" }]),
  fiend: warlockTo("E-fiend-3", [WARLOCK_LEVEL_TWO, { characterLevel: 3, class: "WARLOCK_2024", isNewClass: false, subclass: "FIEND_PATRON" }]),
  fathomless: {
    id: "C-fighter5-fathomless3",
    title: "C-fighter5-fathomless3",
    input: {
      ...FIGHTER_INPUT,
      levelUps: [
        ...FIGHTER_INPUT.levelUps.slice(0, 4),
        { characterLevel: 6, class: "WARLOCK_2024", isNewClass: true, classChoices: [{ choice: INVOCATIONS, option: "Pact of the Blade (2024)" }] },
        { ...WARLOCK_LEVEL_TWO, characterLevel: 7 },
        { characterLevel: 8, class: "WARLOCK_2024", isNewClass: false, subclass: "FATHOMLESS" },
      ],
    },
  },
} satisfies Record<string, Multiclass2024BuildInput>;

type Built = Built2024MulticlassCharacter<Multiclass2024BuildInput>;

let built: Record<keyof typeof FIXTURES, Built>;
let warlock2024ClassId: number;
let genie2014PersId: number;

beforeAll(async () => {
  await resetUserData();
  await seedLegacySubclasses2024(prisma, true);
  await useCreatorContentFromDatabase();
  await signIn("legacy-subclasses-levelup");
  warlock2024ClassId = (await classByName(Classes.WARLOCK_2024)).classId;

  const actions = { createCharacter, levelUpCharacter, getLevelUpInfo };
  const entries = await Promise.all(
    Object.entries(FIXTURES).map(async ([key, fixture]) => [key, await build2024MulticlassCharacter(fixture, actions)] as const),
  );
  built = Object.fromEntries(entries) as Record<keyof typeof FIXTURES, Built>;
  genie2014PersId = await createGenieWarlock2014();
});
afterAll(disconnectDatabase);

describe("O43 — легасі-підкласи на підвищенні чорнокнижника 2024", () => {
  it("кожен персонаж доїхав до кінця без помилок сервера", () => {
    const problems = Object.values(built).flatMap((character) => [character.creationError, ...character.levelUpErrors].filter(Boolean).map((error) => `${character.fixture.id}: ${error}`));

    expect(problems).toEqual([]);
  });

  it("A · Джин на 3-му: підклас — рядок 2024, Судина джинна й список 2024, рід Дао", async () => {
    const pers = await readPersSubclass(built.genie.persId);
    const features = built.genie.atFinalLevel?.featureNames ?? [];

    expect(pers).toMatchObject({ subclass: { name: "THE_GENIE", ruleset: "RULES_2024", classId: warlock2024ClassId } });
    expect(features).toEqual(expect.arrayContaining(["Genie’s Vessel", "The Genie: Expanded Spell List (legacy 2024)"]));
    expect(features).not.toContain("Genie Expanded Spells");
    expect(pers.choiceOptions.map((option) => option.optionNameEng)).toContain("Genie Kind: Dao");
  });

  it("A6 · той самий на 6-му отримує Стихійний дар, а риси 10-го — ще ні", () => {
    const features = built.genie.atFinalLevel?.featureNames ?? [];

    expect(features).toContain("Elemental Gift");
    expect(features).not.toContain("Sanctuary Vessel");
  });

  it("B · Відьмацький клинок на 3-му: прокляття, Воїн проклять і володіння 2014", async () => {
    const features = built.hexblade.atFinalLevel?.featureNames ?? [];
    const fiendProficiencies = built.fiend.atFinalLevel?.customProficiencies ?? "";

    expect(features).toEqual(expect.arrayContaining(["Hexblade’s Curse", "Hex Warrior"]));
    expect(built.hexblade.atFinalLevel?.customProficiencies).not.toEqual(fiendProficiencies);
    expect(built.hexblade.atFinalLevel?.customProficiencies).toMatch(/щит/i);
  });

  it("C · Безодня мультикласом: підклас на рядку мультикласу, риси 3-го рівня чорнокнижника", async () => {
    const multiclass = await prisma.persMulticlass.findFirstOrThrow({
      where: { persId: built.fathomless.persId ?? -1, classId: warlock2024ClassId },
      select: { classLevel: true, subclass: { select: { name: true, ruleset: true } } },
    });

    expect(multiclass).toEqual({ classLevel: 3, subclass: { name: "FATHOMLESS", ruleset: "RULES_2024" } });
    expect(built.fathomless.atFinalLevel?.featureNames).toEqual(expect.arrayContaining(["Tentacle of the Deeps", "Gift of the Sea"]));
    expect(built.fathomless.atFinalLevel?.proficiencyBonus).toBe(3);
  });

  it("D · Невмирущий на 3-му: Серед мертвих і список 2024", () => {
    expect(built.undying.atFinalLevel?.featureNames).toEqual(expect.arrayContaining(["Among the Dead", "Undying: Expanded Spell List (legacy 2024)"]));
  });

  it("E · покровитель PHB 2024 легасі-рис не отримує", () => {
    const features = built.fiend.atFinalLevel?.featureNames ?? [];

    expect(features.some((name) => name.startsWith("Fiend Patron:"))).toBe(true);
    expect(features.filter((name) => name.endsWith("(legacy 2024)"))).toEqual([]);
  });

  it("F · Джин 2014 як і раніше: рядок 2014, Судина й список 2014 на 1-му", async () => {
    const pers = await readPersSubclass(genie2014PersId);
    const features = await prisma.persFeature.findMany({ where: { persId: genie2014PersId }, select: { feature: { select: { engName: true } } } });

    expect(pers.subclass).toMatchObject({ name: "THE_GENIE", ruleset: "RULES_2014" });
    expect(features.map((row) => row.feature.engName)).toEqual(expect.arrayContaining(["Genie’s Vessel", "Genie Expanded Spells"]));
  });
});

async function useCreatorContentFromDatabase(): Promise<void> {
  const original = await vi.importActual<typeof import("@/lib/content/creator-content")>("@/lib/content/creator-content");
  const content2024: CreatorContent = await findCreatorContent(prisma, "RULES_2024");
  vi.mocked(findCharacterCreatorOptions).mockImplementation((ruleset) =>
    ruleset === "RULES_2024" ? content2024 : original.findCharacterCreatorOptions(ruleset),
  );
}

async function signIn(handle: string): Promise<void> {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function readPersSubclass(persId: number | null) {
  return prisma.pers.findUniqueOrThrow({
    where: { persId: persId ?? -1 },
    select: { subclass: { select: { name: true, ruleset: true, classId: true } }, choiceOptions: { select: { optionNameEng: true } } },
  });
}

async function createGenieWarlock2014(): Promise<number> {
  const [race, warlock, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.WARLOCK_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const genie = await subclassByName(warlock.classId, Subclasses.THE_GENIE);
  const [dao] = await subclassChoiceOptionIdsAtLevel(genie.subclassId, 1, (option) => option.optionNameEng === "Genie Kind: Dao");
  const form = minimalForm({
    raceId: race.raceId,
    classId: warlock.classId,
    backgroundId: background.backgroundId,
    subclassId: genie.subclassId,
    subclassChoiceSelections: { "Рід джина": dao },
  });
  const created = await createCharacter(await withCreationSpells(form));
  if (!created.persId) throw new Error(`джин 2014 не створився: ${created.error}`);
  return created.persId;
}
