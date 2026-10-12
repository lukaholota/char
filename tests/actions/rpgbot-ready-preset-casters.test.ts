import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { buildCharacterCreationOptions } from "@/lib/content/creator-content";
import { findCreatorContent } from "@/server/db/creator-content-query";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { auth } from "@/lib/auth";

type SpellRow = [engName: string, origin: string, sourceName: string, isPrepared: boolean, excludedFromCount: boolean];

let spellIdByName: Map<string, number>;

beforeAll(async () => {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" }, select: { spellId: true, engName: true } });
  spellIdByName = new Map(rows.map((row) => [row.engName, row.spellId]));
});
beforeEach(async () => {
  await resetUserData();
  const owner = await prisma.user.create({ data: { email: "rpgbot-casters@actions.test" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
});
afterAll(disconnectDatabase);

const spellId = (engName: string) => {
  const id = spellIdByName.get(engName);
  if (!id) throw new Error(`Unknown spell ${engName}`);
  return id;
};

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function buildPresetInput(slug: string) {
  const preset = readyPresetSchema.parse(readJson(`data/rpgbot/ready-builds/${slug}.json`));
  const recipe = buildRecipeSchema.parse(readJson(`data/rpgbot/builds/${preset.buildId}.json`));
  const content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
  return { content, input: { ...buildReadyPresetDraft(recipe, preset, content), name: `Перевірка ${slug}` } };
}

async function loadCharacter(persId: number) {
  return prisma.pers.findUniqueOrThrow({
    where: { persId },
    include: { persSpells: { include: { spell: true } }, skills: true, subclass: true, subrace: true, features: { include: { feature: true } }, choiceOptions: true, raceChoiceOptions: true },
  });
}
type Character = Awaited<ReturnType<typeof loadCharacter>>;

const listSpellRows = (character: Character): SpellRow[] => character.persSpells
  .map((entry): SpellRow => [entry.spell.engName, entry.origin, entry.sourceName ?? "", entry.isPrepared, entry.excludeFromPreparedCount])
  .sort((left, right) => left[0].localeCompare(right[0]));
const listProficientSkills = (character: Character) => character.skills.filter((skill) => skill.proficiencyType === "PROFICIENT").map((skill) => skill.name).sort();
const listFeatureNames = (character: Character) => character.features.map((entry) => entry.feature.engName);

async function createFromPreset(slug: string) {
  const { input } = await buildPresetInput(slug);
  const created = await createCharacter(input);
  if (!("persId" in created)) throw new Error(`${slug}: ${"error" in created ? created.error : "not created"}`);
  return { input, character: await loadCharacter(created.persId) };
}

async function expectNothingCreated() {
  expect(await prisma.pers.count()).toBe(0);
  expect(await prisma.persSpell.count()).toBe(0);
}

const classRow = (engName: string, className: string): SpellRow => [engName, "CLASS", className, true, false];

describe("caster presets 2014 in the database", () => {
  it("creates the Life Domain Cleric with the domain at level one, three cantrips and the domain spells", async () => {
    const { character } = await createFromPreset("cleric-life-2014");
    expect(character).toMatchObject({ level: 1, ruleset: "RULES_2014", str: 14, dex: 8, con: 16, int: 8, wis: 16, cha: 12, maxHp: 12 });
    expect(character.subclass?.name).toBe("LIFE_DOMAIN");
    expect(character.subrace?.name).toBe("DWARF_HILL_2014");
    expect(character.currentSpellSlots).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(listSpellRows(character)).toEqual([
      ["Bless", "CLASS", "LIFE_DOMAIN", true, true], ["Cure Wounds", "CLASS", "LIFE_DOMAIN", true, true],
      classRow("Guidance", "CLERIC_2014"), classRow("Sacred Flame", "CLERIC_2014"), classRow("Thaumaturgy", "CLERIC_2014"),
    ]);
    expect(character.persSpells.every((entry) => entry.learnedAtLevel === 1)).toBe(true);
    expect(listFeatureNames(character)).toEqual(expect.arrayContaining(["Disciple of Life", "Bonus Proficiency (Life Domain)", "Life Domain Spells"]));
    expect(listProficientSkills(character)).toEqual(["INSIGHT", "PERCEPTION", "PERSUASION", "RELIGION"]);
  });

  it("creates the Circle of the Land Druid with two cantrips and without a circle before level two", async () => {
    const { character } = await createFromPreset("druid-land-2014");
    expect(character.subclassId).toBeNull();
    expect(character).toMatchObject({ con: 16, wis: 16, maxHp: 12 });
    expect(listSpellRows(character)).toEqual([classRow("Guidance", "DRUID_2014"), classRow("Produce Flame", "DRUID_2014")]);
    expect(character.currentSpellSlots).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("creates the Fiend Warlock with the patron at level one, known spells from the patron list and Pact Magic slots", async () => {
    const { character } = await createFromPreset("warlock-fiend-2014");
    expect(character.subclass?.name).toBe("FIEND");
    expect(character).toMatchObject({ dex: 14, con: 14, int: 12, wis: 11, cha: 16, maxHp: 10, currentPactSlots: 1 });
    expect(character.currentSpellSlots).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(listSpellRows(character)).toEqual([
      classRow("Burning Hands", "WARLOCK_2014"), classRow("Eldritch Blast", "WARLOCK_2014"), classRow("Hellish Rebuke", "WARLOCK_2014"), classRow("Mage Hand", "WARLOCK_2014"),
      ["Thaumaturgy", "RACE", "TIEFLING_2014", true, true],
    ]);
    expect(listFeatureNames(character)).toEqual(expect.arrayContaining(["Pact Magic", "Expanded Spell List (Fiend)", "Infernal Legacy"]));
    expect(listFeatureNames(character).some((name) => name.startsWith("Dark One"))).toBe(true);
  });

  it("creates the Draconic Sorcerer with the dragon ancestor, the racial ancestry and six known spells", async () => {
    const { input, character } = await createFromPreset("sorcerer-draconic-2014");
    expect(character.subclass?.name).toBe("DRACONIC_BLOODLINE");
    expect([character.str, character.dex, character.con, character.int, character.wis, character.cha]).toEqual([10, 14, 14, 12, 8, 16]);
    expect(character.maxHp).toBe(9);
    expect(character.currentSpellSlots).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(listSpellRows(character)).toEqual([
      classRow("Chill Touch", "SORCERER_2014"), classRow("Mage Hand", "SORCERER_2014"), classRow("Prestidigitation", "SORCERER_2014"),
      classRow("Ray of Frost", "SORCERER_2014"), classRow("Shield", "SORCERER_2014"), classRow("Sleep", "SORCERER_2014"),
    ]);
    const dragonAncestor = Object.values(input.subclassChoiceSelections).flat();
    expect(character.choiceOptions.map((option) => option.choiceOptionId)).toEqual(expect.arrayContaining(dragonAncestor));
    expect(character.raceChoiceOptions.map((option) => option.optionId)).toEqual(Object.values(input.raceChoiceSelections));
    expect(listFeatureNames(character)).toEqual(expect.arrayContaining(["Draconic Resilience", "Breath Weapon (Cold - Cone)"]));
  });

  it("creates the Lore Bard with the Half-Elf skill versatility, seven skills and six known spells", async () => {
    const { input, character } = await createFromPreset("bard-lore-2014");
    expect(character.subclassId).toBeNull();
    expect([character.str, character.dex, character.con, character.int, character.wis, character.cha]).toEqual([8, 16, 14, 8, 12, 17]);
    expect(listProficientSkills(character)).toEqual(["DECEPTION", "HISTORY", "INSIGHT", "INTIMIDATION", "PERCEPTION", "PERFORMANCE", "PERSUASION"]);
    expect(listSpellRows(character)).toEqual([
      classRow("Detect Magic", "BARD_2014"), classRow("Healing Word", "BARD_2014"), classRow("Heroism", "BARD_2014"),
      classRow("Prestidigitation", "BARD_2014"), classRow("Sleep", "BARD_2014"), classRow("Vicious Mockery", "BARD_2014"),
    ]);
    expect(character.raceChoiceOptions.map((option) => option.optionId)).toEqual(Object.values(input.raceChoiceSelections));
    expect(character.currentSpellSlots).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("creates the Artificer with two cantrips and no prepared list, which the sheet fills later", async () => {
    const { character } = await createFromPreset("artificer-alchemist-2014");
    expect(character.subclassId).toBeNull();
    expect([character.int, character.con]).toEqual([16, 16]);
    expect(listSpellRows(character)).toEqual([classRow("Fire Bolt", "ARTIFICER_2014"), classRow("Guidance", "ARTIFICER_2014")]);
  });

  it.each(["paladin-devotion-2014", "ranger-hunter-2014"])("creates %s without spells, which the class gets at level two", async (slug) => {
    const { character } = await createFromPreset(slug);
    expect(character.persSpells).toEqual([]);
    expect(character.currentSpellSlots).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("keeps the Dragonborn ancestry of the Paladin and the first-level Ranger class choices", async () => {
    const paladin = await createFromPreset("paladin-devotion-2014");
    expect(paladin.character.raceChoiceOptions.map((option) => option.optionId)).toEqual(Object.values(paladin.input.raceChoiceSelections));
    expect(listFeatureNames(paladin.character)).toEqual(expect.arrayContaining(["Draconic Ancestry (Black)", "Breath Weapon (Acid - Line)"]));
    const ranger = await createFromPreset("ranger-hunter-2014");
    expect(ranger.character.choiceOptions.map((option) => option.choiceOptionId).sort()).toEqual(Object.values(ranger.input.classChoiceSelections).flat().sort());
    expect(listFeatureNames(ranger.character)).toEqual(expect.arrayContaining(["Favored Enemy", "Natural Explorer"]));
  });
});

describe("caster presets reject invalid spell choices and write nothing", () => {
  it.each([
    ["a fourth Cleric cantrip", "cleric-life-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classSpells: { ...input.classSpells!, cantripIds: [...input.classSpells!.cantripIds, spellId("Light")] } }), "Оберіть замовлянь: 3"],
    ["a Wizard cantrip for a Cleric", "cleric-life-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classSpells: { ...input.classSpells!, cantripIds: [spellId("Fire Bolt"), ...input.classSpells!.cantripIds.slice(1)] } }), "Обране замовляння не з вашого списку класу"],
    ["a duplicated Druid cantrip", "druid-land-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classSpells: { ...input.classSpells!, cantripIds: [input.classSpells!.cantripIds[0], input.classSpells!.cantripIds[0]] } }), "Оберіть замовлянь: 2"],
    ["a missing Warlock known spell", "warlock-fiend-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classSpells: { ...input.classSpells!, preparedIds: input.classSpells!.preparedIds.slice(1) } }), "Оберіть нових заклинань: 2"],
    ["a third level Warlock spell", "warlock-fiend-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classSpells: { ...input.classSpells!, preparedIds: [spellId("Fireball"), input.classSpells!.preparedIds[1]] } }), "Обране заклинання не з вашого списку класу або зависокого рівня"],
    ["a Wizard spell for a Warlock", "warlock-fiend-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classSpells: { ...input.classSpells!, preparedIds: [spellId("Magic Missile"), input.classSpells!.preparedIds[1]] } }), "Обране заклинання не з вашого списку класу або зависокого рівня"],
    ["a Cleric spell for a Bard", "bard-lore-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classSpells: { ...input.classSpells!, preparedIds: [spellId("Bless"), ...input.classSpells!.preparedIds.slice(1)] } }), "Обране заклинання не з вашого списку класу або зависокого рівня"],
    ["an extra Sorcerer known spell", "sorcerer-draconic-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classSpells: { ...input.classSpells!, preparedIds: [...input.classSpells!.preparedIds, spellId("Burning Hands")] } }), "Оберіть нових заклинань: 2"],
    ["a duplicated Sorcerer cantrip", "sorcerer-draconic-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classSpells: { ...input.classSpells!, cantripIds: [input.classSpells!.cantripIds[0], ...input.classSpells!.cantripIds.slice(0, 3)] } }), "Оберіть замовлянь: 4"],
    ["a racial cantrip for a Half-Elf", "bard-lore-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, raceSpellIds: [spellId("Fire Bolt")] }), "Раса не дає обрати заклинання"],
    ["a subclass spell choice with no such feature", "sorcerer-draconic-2014", (input: Awaited<ReturnType<typeof buildPresetInput>>["input"]) => ({ ...input, classOptionSpellIds: [spellId("Light")] }), "Жодна обрана опція класу не дає обрати заклинання"],
  ])("rejects %s", async (_label, slug, change, message) => {
    const { input } = await buildPresetInput(slug);
    const result = await createCharacter(change(input));
    expect(result).toEqual({ error: expect.stringContaining(message) });
    await expectNothingCreated();
  });

  it("ignores spells chosen for a class that has none at level one and stores nothing", async () => {
    const { input } = await buildPresetInput("paladin-devotion-2014");
    const result = await createCharacter({ ...input, classSpells: { cantripIds: [spellId("Light")], preparedIds: [], spellbookIds: [] } });
    expect(result).toHaveProperty("persId");
    expect(await prisma.persSpell.count()).toBe(0);
  });

  it("does not check that a subclass belongs at level one (known BUG-001), so the preset validates it before sending", async () => {
    const { input, content } = await buildPresetInput("druid-land-2014");
    const circle = content.classes.find((entry) => entry.classId === input.classId)!.subclasses[0];
    const result = await createCharacter({ ...input, subclassId: circle.subclassId });
    expect(result).toHaveProperty("persId");
    expect((await prisma.pers.findFirstOrThrow()).subclassId).toBe(circle.subclassId);
  });
});

describe("first-level subclass spell choices of 2014 classes", () => {
  async function findSubclassId(content: Awaited<ReturnType<typeof buildPresetInput>>["content"], className: string, subclassName: string) {
    return content.classes.find((entry) => entry.name === className)!.subclasses.find((entry) => entry.name === subclassName)!.subclassId;
  }

  it("stores the Nature Domain druid cantrip as a subclass choice outside the cleric cantrip limit", async () => {
    const { input, content } = await buildPresetInput("cleric-life-2014");
    const subclassId = await findSubclassId(content, "CLERIC_2014", "NATURE_DOMAIN");
    const created = await createCharacter({ ...input, subclassId, classOptionSpellIds: [spellId("Druidcraft")] });
    if (!("persId" in created)) throw new Error("error" in created ? created.error : "not created");
    const rows = listSpellRows(await loadCharacter(created.persId));
    expect(rows).toEqual(expect.arrayContaining([["Druidcraft", "CLASS", "Nature Domain: Acolyte of Nature (2014)", true, true]]));
    expect(rows.filter(([, , source]) => source === "CLERIC_2014")).toHaveLength(3);
  });

  it("requires the Nature Domain choice and rejects a cantrip from another list", async () => {
    const { input, content } = await buildPresetInput("cleric-life-2014");
    const subclassId = await findSubclassId(content, "CLERIC_2014", "NATURE_DOMAIN");
    expect(await createCharacter({ ...input, subclassId })).toEqual({ error: expect.stringContaining("Послідовник природи") });
    expect(await createCharacter({ ...input, subclassId, classOptionSpellIds: [spellId("Fire Bolt")] })).toEqual({ error: expect.stringContaining("Послідовник природи") });
    await expectNothingCreated();
  });

  it("stores the Divine Soul affinity spell and rejects a spell outside the affinity list", async () => {
    const { input, content } = await buildPresetInput("sorcerer-draconic-2014");
    const subclassId = await findSubclassId(content, "SORCERER_2014", "DIVINE_SOUL");
    const withoutAncestor = { ...input, subclassId, subclassChoiceSelections: {} };
    expect(await createCharacter({ ...withoutAncestor, classOptionSpellIds: [spellId("Shield")] })).toEqual({ error: expect.stringContaining("Божественна магія") });
    await expectNothingCreated();
    const created = await createCharacter({ ...withoutAncestor, classOptionSpellIds: [spellId("Bless")] });
    if (!("persId" in created)) throw new Error("error" in created ? created.error : "not created");
    expect(listSpellRows(await loadCharacter(created.persId))).toEqual(expect.arrayContaining([["Bless", "CLASS", "Divine Soul: Divine Magic (2014)", true, true]]));
  });
});
