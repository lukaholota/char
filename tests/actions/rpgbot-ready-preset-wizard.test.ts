import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { buildCharacterCreationOptions } from "@/lib/content/creator-content";
import { findCreatorContent } from "@/server/db/creator-content-query";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { buildSpellSlug } from "@/lib/spell-link";
import { disconnectDatabase, resetUserData } from "../user-data";
import { correctStaleWizardEquipmentSeed } from "../helpers/stale-wizard-seed";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { auth } from "@/lib/auth";

const classCantrips = ["Acid Splash", "Chill Touch", "Ray of Frost"];
const spellbook = ["Burning Hands", "Comprehend Languages", "Detect Magic", "Find Familiar", "Mage Armor", "Magic Missile"];
const preparedFromBook = ["Burning Hands", "Detect Magic", "Mage Armor", "Magic Missile"];

afterAll(disconnectDatabase);
correctStaleWizardEquipmentSeed();
beforeEach(async () => {
  await resetUserData();
  const owner = await prisma.user.create({ data: { email: "rpgbot-wizard@actions.test" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
});

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function buildPresetInput(slug: string) {
  const preset = readyPresetSchema.parse(readJson(`data/rpgbot/ready-builds/${slug}.json`));
  const recipe = buildRecipeSchema.parse(readJson(`data/rpgbot/builds/${preset.buildId}.json`));
  const content = buildCharacterCreationOptions(await findCreatorContent(prisma, "RULES_2014"));
  return { ...buildReadyPresetDraft(recipe, preset, content), name: `Перевірка ${slug}` };
}

async function findSpellIdsByName(names: string[]) {
  const spells = await prisma.spell.findMany({ where: { ruleset: "RULES_2014", engName: { in: names } } });
  return names.map((name) => spells.find((spell) => spell.engName === name)!.spellId);
}

async function expectNothingCreated() {
  expect(await prisma.pers.count()).toBe(0);
  expect(await prisma.persSpell.count()).toBe(0);
}

describe("Wizard Evocation 2014 preset in the database", () => {
  it("creates the book, cantrips, prepared list, slots and equipment of the authored start", async () => {
    const input = await buildPresetInput("wizard-evocation-2014");
    const created = await createCharacter(input);
    if (!created.success) throw new Error(created.error);
    const character = await prisma.pers.findUniqueOrThrow({
      where: { persId: created.persId },
      include: { persSpells: { include: { spell: true } }, weapons: { include: { weapon: true } }, skills: true, race: true, subrace: true, class: true, background: true },
    });
    expect(character).toMatchObject({ level: 1, ruleset: "RULES_2014", classId: input.classId, raceId: input.raceId, backgroundId: input.backgroundId });
    expect(character.class.name).toBe("WIZARD_2014");
    expect(character.subrace?.name).toBe("ELF_HIGH_2014");
    expect(character.background.name).toBe("SAGE");
    expect([character.str, character.dex, character.con, character.int, character.wis, character.cha]).toEqual([8, 16, 14, 16, 12, 8]);
    expect(character.currentSpellSlots).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(character.currentHp).toBe(character.maxHp);

    const spellsBySource = (origin: string) => character.persSpells.filter((entry) => entry.origin === origin).map((entry) => entry.spell.engName).sort();
    expect(spellsBySource("CLASS")).toEqual([...classCantrips, ...spellbook].sort());
    expect(spellsBySource("RACE")).toEqual(["Prestidigitation"]);
    expect(character.persSpells).toHaveLength(classCantrips.length + spellbook.length + 1);
    const preparedBook = character.persSpells.filter((entry) => entry.isPrepared && entry.spell.level > 0 && entry.origin === "CLASS").map((entry) => entry.spell.engName);
    expect(preparedBook.sort()).toEqual([...preparedFromBook].sort());
    const unpreparedBook = character.persSpells.filter((entry) => !entry.isPrepared).map((entry) => entry.spell.engName);
    expect(unpreparedBook.sort()).toEqual(["Comprehend Languages", "Find Familiar"]);
    expect(character.persSpells.filter((entry) => entry.origin === "CLASS").every((entry) => entry.sourceName === "WIZARD_2014" && entry.learnedAtLevel === 1)).toBe(true);
    const racial = character.persSpells.find((entry) => entry.origin === "RACE")!;
    expect(racial).toMatchObject({ sourceName: "ELF_HIGH_2014", excludeFromPreparedCount: true, excludeFromKnownCount: true });

    expect(character.skills.filter((skill) => skill.proficiencyType === "PROFICIENT").map((skill) => skill.name).sort())
      .toEqual(["ARCANA", "HISTORY", "INVESTIGATION", "PERCEPTION", "RELIGION"]);
    expect(character.weapons.map((entry) => entry.weapon.name)).toEqual(["DAGGER"]);
    const inventory = character.customEquipment.split("\n");
    expect(inventory).toEqual(expect.arrayContaining(["Мішечок компонентів x1", "Книга заклинань x1", "Рюкзак x1"]));
    expect(inventory.filter((line) => line.startsWith("Книга заклинань"))).toHaveLength(1);
    expect(character.customLanguagesKnown.split("\n")).toEqual(["Загальна", "Ельфійська", "Драконяча", "Дворфська", "Небесна"]);
    expect(await prisma.pers.count()).toBe(1);
  });

  it("keeps exactly the chosen subset prepared and leaves other book spells unprepared", async () => {
    const input = await buildPresetInput("wizard-evocation-2014");
    const [magicMissile, mageArmor] = await findSpellIdsByName(["Magic Missile", "Mage Armor"]);
    const created = await createCharacter({ ...input, initialPreparedSpellIds: [magicMissile, mageArmor] });
    if (!created.success) throw new Error(created.error);
    const rows = await prisma.persSpell.findMany({ where: { persId: created.persId, origin: "CLASS", isPrepared: true, spell: { level: { gt: 0 } } }, include: { spell: true } });
    expect(rows.map((row) => row.spell.engName).sort()).toEqual(["Mage Armor", "Magic Missile"]);
  });

  it("creates the same character without initial preparation when none is chosen", async () => {
    const input = await buildPresetInput("wizard-evocation-2014");
    const created = await createCharacter({ ...input, initialPreparedSpellIds: [] });
    if (!created.success) throw new Error(created.error);
    const prepared = await prisma.persSpell.count({ where: { persId: created.persId, isPrepared: true, spell: { level: { gt: 0 } } } });
    expect(prepared).toBe(0);
  });

  it.each([
    ["a spell outside the book", async () => (await findSpellIdsByName(["Fireball"]))[0], "Підготувати можна лише стартові заклинання з книги"],
    ["a racial cantrip", async () => (await findSpellIdsByName(["Prestidigitation"]))[0], "Підготувати можна лише стартові заклинання з книги"],
  ])("rejects preparing %s and writes nothing", async (_label, findForeignSpellId, message) => {
    const input = await buildPresetInput("wizard-evocation-2014");
    const foreignSpellId = await findForeignSpellId();
    const result = await createCharacter({ ...input, initialPreparedSpellIds: [...input.initialPreparedSpellIds!.slice(0, 3), foreignSpellId] });
    expect(result).toEqual({ error: message, fixAtSteps: ["spells"] });
    await expectNothingCreated();
  });

  it("rejects a duplicated prepared spell", async () => {
    const input = await buildPresetInput("wizard-evocation-2014");
    const [first] = input.initialPreparedSpellIds!;
    const result = await createCharacter({ ...input, initialPreparedSpellIds: [first, first] });
    expect(result).toEqual({ error: "Підготовлене заклинання обрано двічі", fixAtSteps: ["spells"] });
    await expectNothingCreated();
  });

  it("rejects more prepared spells than Intelligence modifier plus one", async () => {
    const input = await buildPresetInput("wizard-evocation-2014");
    const [findFamiliar] = await findSpellIdsByName(["Find Familiar"]);
    const result = await createCharacter({ ...input, initialPreparedSpellIds: [...input.initialPreparedSpellIds!, findFamiliar] });
    expect(result).toEqual({ error: "Забагато підготовлених заклинань для вашого Інтелекту", fixAtSteps: ["spells"] });
    await expectNothingCreated();
  });

  it("applies the limit to the effective Intelligence including racial bonuses", async () => {
    const input = await buildPresetInput("wizard-evocation-2014");
    const weakIntelligence = input.asi!.map((entry) => entry.ability === "INT" ? { ...entry, value: 7 } : entry);
    const tooMany = await createCharacter({ ...input, asi: weakIntelligence });
    expect(tooMany).toEqual({ error: "Забагато підготовлених заклинань для вашого Інтелекту", fixAtSteps: ["spells"] });
    await expectNothingCreated();
    const oneSpell = await createCharacter({ ...input, asi: weakIntelligence, initialPreparedSpellIds: input.initialPreparedSpellIds!.slice(0, 1) });
    expect(oneSpell).toHaveProperty("persId");
  });

  it("allows initial preparation only for a 2014 Wizard", async () => {
    const fighter = await buildPresetInput("fighter-champion-shield-2014");
    const [magicMissile] = await findSpellIdsByName(["Magic Missile"]);
    const result = await createCharacter({ ...fighter, initialPreparedSpellIds: [magicMissile] });
    expect(result).toEqual({ error: "Стартова підготовка з книги доступна лише Чарівнику 2014", fixAtSteps: ["spells"] });
    await expectNothingCreated();
  });

  it("matches preset spell keys to catalog slugs so the preset cannot drift", async () => {
    const preset = readyPresetSchema.parse(readJson("data/rpgbot/ready-builds/wizard-evocation-2014.json"));
    const spells = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" } });
    const slugs = new Set(spells.map((spell) => buildSpellSlug(spell.engName)));
    for (const key of [...preset.spells!.classCantripKeys, ...preset.spells!.spellbookKeys, ...preset.spells!.raceSpellKeys, ...preset.spells!.preparedSpellKeys]) {
      expect(slugs.has(key), key).toBe(true);
    }
  });
});
