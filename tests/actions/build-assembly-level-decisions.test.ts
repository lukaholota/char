import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Classes, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter, createCharacterFromBuild } from "@/lib/actions/character";
import type { BuildProgressionStep, BuildRecipe, LevelDecisions } from "@/lib/optimization/types";
import { disconnectDatabase, resetUserData } from "../user-data";
import { readSheetState, runManualLevelUpPath } from "../helpers/assembly-manual-path";
import { buildPresetStart, readRecipeFile } from "../helpers/assembly-scenarios";

const syntheticRecipes = vi.hoisted(() => [] as BuildRecipe[]);

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/optimization/slice-reader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/optimization/slice-reader")>();
  return { ...actual, readSliceRecipes: async (ruleset: Parameters<typeof actual.readSliceRecipes>[0]) => [...(await actual.readSliceRecipes(ruleset)), ...syntheticRecipes] };
});
import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 120_000 });

type Step = { classKey?: string; subclassKey?: string; decisions: LevelDecisions };

const LAND_DRUID = { slug: "druid-land-owlin-2014", buildId: "build-druid-land-owlin-2014" };
const ARCANE_ARCHER = { slug: "fighter-arcane-archer-2014", buildId: "build-fighter-arcane-archer-2014" };
const HEXBLADE = { slug: "warlock-hexblade-2014", buildId: "build-warlock-hexblade-2014" };
const LORE_BARD = { slug: "bard-lore-sorcerers-apprentice-2014", buildId: "build-bard-lore-sorcerers-apprentice-2014" };

const landDruidSteps: Step[] = [
  { subclassKey: "CIRCLE_OF_THE_LAND", decisions: { classOptionSpellKeys: ["shape-water"] } },
  { decisions: { subclassOptions: [{ optionNameEng: "Circle Spells — Forest" }] } },
];
const arcaneArcherSteps: Step[] = [
  { decisions: {} },
  { subclassKey: "ARCANE_ARCHER", decisions: { classOptionSpellKeys: ["prestidigitation"], subclassOptions: [{ optionNameEng: "Piercing Arrow (Arcane Shot)" }, { optionNameEng: "Shadow Arrow (Arcane Shot)" }] } },
];
const loreBardSteps: Step[] = [
  { decisions: { spells: { cantripKeys: [], knownSpellKeys: ["bane"], spellbookKeys: [] } } },
  { subclassKey: "COLLEGE_OF_LORE", decisions: { skillProficiencies: ["DECEPTION", "INTIMIDATION", "PERCEPTION"], expertise: ["INSIGHT", "PERCEPTION"], spells: { cantripKeys: [], knownSpellKeys: ["enhance-ability"], spellbookKeys: [] } } },
  { decisions: { featKey: "SKILL_EXPERT", featOptions: [{ optionNameEng: "Skill Expert (CHA)" }, { optionNameEng: "Skill Expert Proficiency (STEALTH)" }, { optionNameEng: "Skill Expert Expertise (PERSUASION)" }], spells: { cantripKeys: ["mage-hand"], knownSpellKeys: ["invisibility"], spellbookKeys: [] } } },
  { decisions: { spells: { cantripKeys: [], knownSpellKeys: ["dispel-magic"], spellbookKeys: [] } } },
  { decisions: { spells: { cantripKeys: [], knownSpellKeys: ["fear"], spellbookKeys: [] }, classOptionSpellKeys: ["fire-bolt", "cure-wounds"] } },
];

const hexbladeSteps = (replacement: LevelDecisions): Step[] => [
  { decisions: { classOptions: [{ optionNameEng: "Fiendish Vigor" }, { optionNameEng: "Devil's Sight" }], spells: { cantripKeys: [], knownSpellKeys: ["protection-from-evil-and-good"], spellbookKeys: [] } } },
  { decisions: { classOptions: [{ optionNameEng: "Pact of the Blade" }], spells: { cantripKeys: [], knownSpellKeys: ["armor-of-agathys"], spellbookKeys: [] }, ...replacement } },
];
const hexbladeReplacement: LevelDecisions = {
  replaceOptions: [{ drop: { optionNameEng: "Fiendish Vigor" }, add: { optionNameEng: "Improved Pact Weapon" } }],
  replaceSpell: { drop: "protection-from-evil-and-good", add: "blur" },
};

beforeEach(async () => {
  syntheticRecipes.length = 0;
  await resetUserData();
  const owner = await prisma.user.create({ data: { email: "feature-spells@actions.test" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
});
afterAll(disconnectDatabase);

function registerRecipe(source: { buildId: string }, steps: readonly Step[]): BuildRecipe {
  const stored = readRecipeFile(source.buildId);
  const start = stored.progression[0];
  const progression = steps.map((step, index): BuildProgressionStep => ({
    characterLevel: index + 2, classKey: step.classKey ?? stored.startingClassKey, classLevel: index + 2, sourceRefs: start.sourceRefs, choiceIds: [],
    ...(step.subclassKey ? { subclassKey: step.subclassKey } : {}), decisions: step.decisions,
  }));
  const recipe = { ...stored, buildId: `${stored.buildId}-feature-spells`, revisionId: `${stored.buildId}-feature-spells-v1`, supportedLevels: [1, ...progression.map((step) => step.characterLevel)], progression: [start, ...progression] };
  syntheticRecipes.splice(0, syntheticRecipes.length, recipe);
  return recipe;
}

async function assemble(source: { slug: string; buildId: string }, steps: readonly Step[]) {
  const recipe = registerRecipe(source, steps);
  const request = { buildId: recipe.buildId, revisionId: recipe.revisionId, targetLevel: steps.length + 1, requestId: randomUUID(), start: await buildPresetStart(source.slug, "Заклинання від умінь"), openSelections: [] };
  return createCharacterFromBuild(request);
}

async function assembleToState(source: { slug: string; buildId: string }, steps: readonly Step[]) {
  const created = await assemble(source, steps);
  if ("error" in created) throw new Error(`${created.error} ${JSON.stringify(created.details)}`);
  return readSheetState(created.persId);
}

async function countPersonages(): Promise<number> {
  return prisma.pers.count();
}

describe("заклинання від умінь підкласу й заміни виборів у плані рівнів", () => {
  it("Друїд Кола землі: Додаткове замовляння на 2-му рівні лягає так само, як у ручному підвищенні", async () => {
    const state = await assembleToState(LAND_DRUID, landDruidSteps);
    const manual = await createCharacter(await buildPresetStart(LAND_DRUID.slug, "Заклинання від умінь"));
    if ("error" in manual) throw new Error(manual.error);
    await runManualLevelUpPath(manual.persId, [
      { className: Classes.DRUID_2014, subclass: Subclasses.CIRCLE_OF_THE_LAND, classOptionSpellNames: ["Shape Water"] },
      { className: Classes.DRUID_2014, subclassOptionNames: ["Circle Spells — Forest"] },
    ]);

    expect(state).toEqual(await readSheetState(manual.persId));
    expect(state.spells.find((row) => row.spell === "Shape Water")).toMatchObject({ origin: "CLASS", sourceName: "Circle of the Land: Bonus Cantrip (2014)", learnedAtLevel: 2, isPrepared: true });
  });

  it("Містичний лучник: замовлення Знань містичного лучника на 3-му рівні Воїна", async () => {
    const state = await assembleToState(ARCANE_ARCHER, arcaneArcherSteps);
    const manual = await createCharacter(await buildPresetStart(ARCANE_ARCHER.slug, "Заклинання від умінь"));
    if ("error" in manual) throw new Error(manual.error);
    await runManualLevelUpPath(manual.persId, [
      { className: Classes.FIGHTER_2014 },
      { className: Classes.FIGHTER_2014, subclass: Subclasses.ARCANE_ARCHER, classOptionSpellNames: ["Prestidigitation"], subclassOptionNames: ["Piercing Arrow (Arcane Shot)", "Shadow Arrow (Arcane Shot)"] },
    ]);

    expect(state).toEqual(await readSheetState(manual.persId));
    expect(state.spells.find((row) => row.spell === "Prestidigitation")).toMatchObject({ origin: "CLASS", sourceName: "Arcane Archer: Arcane Archer Lore (2014)", learnedAtLevel: 3 });
  });

  it("Бард Колегії знань: два заклинання Додаткових магічних таємниць із будь-якого списку на 6-му рівні", async () => {
    const state = await assembleToState(LORE_BARD, loreBardSteps);
    const secrets = state.spells.filter((row) => row.sourceName === "College of Lore: Additional Magical Secrets (2014)");
    expect(secrets.map((row) => row.spell).sort()).toEqual(["Cure Wounds", "Fire Bolt"]);
    expect(secrets.every((row) => row.origin === "CLASS" && row.learnedAtLevel === 6)).toBe(true);
  });

  it("сервер відхиляє рівень без обраного заклинання уміння й нічого не записує", async () => {
    const withoutSpell = landDruidSteps.map((step, index) => (index === 0 ? { ...step, decisions: {} } : step));
    expect(await assemble(LAND_DRUID, withoutSpell)).toMatchObject({ error: expect.stringContaining("Оберіть 1 замовляння") });
    expect(await countPersonages()).toBe(0);
  });

  it("сервер відхиляє заклинання поза правилом уміння: не друїдське замовлення й заклинання на рівні, що його не дає", async () => {
    const outsideDruidList = landDruidSteps.map((step, index) => (index === 0 ? { ...step, decisions: { classOptionSpellKeys: ["fire-bolt"] } } : step));
    expect(await assemble(LAND_DRUID, outsideDruidList)).toMatchObject({ error: expect.stringContaining("Обране заклинання не підходить") });
    const onLevelWithoutFeature = landDruidSteps.map((step, index) => (index === 1 ? { ...step, decisions: { ...step.decisions, classOptionSpellKeys: ["shape-water"] } } : step));
    expect(await assemble(LAND_DRUID, onLevelWithoutFeature)).toMatchObject({ error: expect.stringContaining("Жодна обрана опція класу не дає обрати заклинання") });
    expect(await countPersonages()).toBe(0);
  });

  it("Чорнокнижник: заміна виклику й відомого заклинання на 3-му рівні лягає так само, як у ручному підвищенні", async () => {
    const state = await assembleToState(HEXBLADE, hexbladeSteps(hexbladeReplacement));
    const manual = await createCharacter(await buildPresetStart(HEXBLADE.slug, "Заклинання від умінь"));
    if ("error" in manual) throw new Error(manual.error);
    await runManualLevelUpPath(manual.persId, [
      { className: Classes.WARLOCK_2014, classOptionNames: ["Fiendish Vigor", "Devil's Sight"], knownSpellNames: ["Protection From Evil and Good"] },
      { className: Classes.WARLOCK_2014, classOptionNames: ["Pact of the Blade"], knownSpellNames: ["Armor of Agathys"], replaceInvocation: { drop: "Fiendish Vigor", add: "Improved Pact Weapon" }, replaceKnownSpell: { drop: "Protection From Evil and Good", add: "Blur" } },
    ]);

    expect(state).toEqual(await readSheetState(manual.persId));
    expect(state.spells.map((row) => row.spell)).toEqual(expect.arrayContaining(["Blur", "Armor of Agathys"]));
    expect(state.spells.map((row) => row.spell)).not.toContain("Protection From Evil and Good");
    expect(state.spells.find((row) => row.spell === "Blur")).toMatchObject({ origin: "CLASS", sourceName: "WARLOCK_2014", learnedAtLevel: 3 });
    expect(state.choiceOptions).toEqual(expect.arrayContaining(["Improved Pact Weapon", "Devil's Sight"]));
    expect(state.choiceOptions).not.toContain("Fiendish Vigor");
  });

  it("сервер відхиляє заміну, якої правила не дозволяють, і нічого не записує", async () => {
    const unknownDrop: LevelDecisions = { replaceSpell: { drop: "fireball", add: "blur" } };
    expect(await assemble(HEXBLADE, hexbladeSteps(unknownDrop))).toMatchObject({ error: expect.stringContaining("Замінити можна лише заклинання цього класу") });
    const notOwnedOption: LevelDecisions = { replaceOptions: [{ drop: { optionNameEng: "Thirsting Blade" }, add: { optionNameEng: "Improved Pact Weapon" } }] };
    expect(await assemble(HEXBLADE, hexbladeSteps(notOwnedOption))).toMatchObject({ error: expect.stringContaining("Обрана опція для заміни не належить персонажу") });
    expect(await countPersonages()).toBe(0);
  });
});
