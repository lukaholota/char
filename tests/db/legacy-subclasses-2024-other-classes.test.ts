/**
 * O43 / KR43.8 — легасі-підкласи решти класів 2024 проходять майстер підвищення тим самим шляхом,
 * що й гравець. По персонажу на кожну механіку, якої пілот чорнокнижника не мав: заклинання
 * домену, клятви, кола й слідопита як рядки 2024 на зсунутих рівнях, руни, стиль бою Колегії мечів,
 * зсув чарівника з 2-го на 3-й. Перелік заклинань — той самий, що O48 видає підкласам 2014.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { findCreatorContent, type CreatorContent } from "@/server/db/creator-content-query";
import { seedLegacySubclasses2024 } from "../../prisma/seed/legacySubclasses2024";
import { build2024MulticlassCharacter, type Built2024MulticlassCharacter, type Multiclass2024BuildInput } from "../helpers/build-2024-multiclass-character";
import { findMulticlassFixture } from "../fixtures/2024-multiclass";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/content/creator-content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content/creator-content")>()),
  findCharacterCreatorOptions: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 300_000 });

type LevelUps = Multiclass2024BuildInput["input"]["levelUps"];
type LevelUp = LevelUps[number];

function withSubclassAt(fixtureId: string, characterLevel: number, subclass: Partial<LevelUp>): Multiclass2024BuildInput {
  const { input } = findMulticlassFixture(fixtureId);
  const levelUps = input.levelUps
    .filter((levelUp) => levelUp.characterLevel <= characterLevel)
    .map((levelUp) => (levelUp.characterLevel === characterLevel ? { ...levelUp, subclassChoices: undefined, ...subclass } : levelUp));
  return { id: `${fixtureId}→${subclass.subclass}`, title: String(subclass.subclass), input: { ...input, levelUps } };
}

const FIXTURES = {
  death: withSubclassAt("21-human-wizard4-cleric4", 7, { subclass: "DEATH_DOMAIN" }),
  conquest: withSubclassAt("12-drow-paladin5-sorcerer3", 3, { subclass: "OATH_OF_CONQUEST" }),
  runeKnight: withSubclassAt("14-human-fighter6-rogue4", 3, {
    subclass: "RUNE_KNIGHT",
    subclassChoices: [
      { choice: "Руни велетнів", option: "Fire Rune (Rune)" },
      { choice: "Руни велетнів", option: "Stone Rune (Rune)" },
    ],
  }),
  swords: withSubclassAt("18-halfling-rogue4-bard4", 7, {
    subclass: "COLLEGE_OF_SWORDS",
    subclassChoices: [{ choice: "Бойовий стиль (Swords)", option: "Dueling (Swords)" }],
  }),
  wildfire: withSubclassAt("11-human-druid5-cleric1", 3, { subclass: "CIRCLE_OF_WILDFIRE" }),
  warMagic: withSubclassAt("21-human-wizard4-cleric4", 3, { subclass: "SCHOOL_OF_WAR_MAGIC" }),
  lunar: withSubclassAt("19-forest-gnome-sorcerer9-warlock4", 3, { subclass: "LUNAR_SORCERY" }),
  kensei: withSubclassAt("13-stone-goliath-monk5-rogue3", 3, { subclass: "WAY_OF_THE_KENSEI" }),
  swarmkeeper: withSubclassAt("15-wood-elf-ranger5-druid3", 3, { subclass: "SWARMKEEPER" }),
} satisfies Record<string, Multiclass2024BuildInput>;

type Built = Built2024MulticlassCharacter<Multiclass2024BuildInput>;
type SpellRow = { engName: string; ruleset: string };

let built: Record<keyof typeof FIXTURES, Built>;
let spellsByFixture: Record<keyof typeof FIXTURES, SpellRow[]>;

beforeAll(async () => {
  await resetUserData();
  await seedLegacySubclasses2024(prisma, true);
  await useCreatorContentFromDatabase();
  await signIn("legacy-subclasses-other-classes");

  const actions = { createCharacter, levelUpCharacter, getLevelUpInfo };
  const entries = await Promise.all(
    Object.entries(FIXTURES).map(async ([key, fixture]) => [key, await build2024MulticlassCharacter(fixture, actions)] as const),
  );
  built = Object.fromEntries(entries) as Record<keyof typeof FIXTURES, Built>;
  spellsByFixture = Object.fromEntries(
    await Promise.all(Object.entries(built).map(async ([key, character]) => [key, await readPersSpells(character.persId)] as const)),
  ) as Record<keyof typeof FIXTURES, SpellRow[]>;
});
afterAll(disconnectDatabase);

describe("O43 / KR43.8 — легасі-підкласи решти класів на підвищенні 2024", () => {
  it("кожен персонаж доїхав до кінця без помилок сервера", () => {
    const problems = Object.values(built).flatMap((character) =>
      [character.creationError, ...character.levelUpErrors].filter(Boolean).map((error) => `${character.fixture.id}: ${error}`),
    );

    expect(problems).toEqual([]);
  });

  it("підклас кожного персонажа — легасі-рядок 2024, а не рядок 2014", async () => {
    const rulesets = await Promise.all(
      Object.entries(FIXTURES).map(async ([key, fixture]) => [key, await readSubclassRuleset(built[key as keyof typeof FIXTURES].persId, String(fixture.title))]),
    );

    expect(rulesets.filter(([, ruleset]) => ruleset !== "RULES_2024")).toEqual([]);
  });

  it("жоден персонаж не отримав заклинання 2014", () => {
    const stray = Object.entries(spellsByFixture).flatMap(([key, spells]) =>
      spells.filter((spell) => spell.ruleset !== "RULES_2024").map((spell) => `${key}: ${spell.engName}`),
    );

    expect(stray).toEqual([]);
  });

  it("G · Домен смерті мультикласом на 3-му жерця: риси 1-го і 2-го рівнів і заклинання домену 1–3 кола", () => {
    const features = built.death.atFinalLevel?.featureNames ?? [];
    const spells = spellsByFixture.death.map((spell) => spell.engName);

    expect(features).toEqual(expect.arrayContaining(["Reaper", "Channel Divinity: Touch of Death", "Death Domain Spells", "Bonus Proficiency (Death Domain)"]));
    expect(features).not.toContain("Divine Strike (Death)");
    expect(spells).toEqual(expect.arrayContaining(["False Life", "Ray of Sickness", "Blindness/Deafness", "Ray of Enfeeblement"]));
    expect(spells).not.toContain("Animate Dead");
  });

  it("H · Клятва завоювання: канал божественності й заклинання клятви 3-го рівня", () => {
    expect(built.conquest.atFinalLevel?.featureNames).toEqual(expect.arrayContaining(["Channel Divinity: Conquering Presence", "Oath of Conquest Spells"]));
    expect(spellsByFixture.conquest.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Armor of Agathys", "Command"]));
  });

  it("I · Рунний лицар обирає дві руни на 3-му", async () => {
    expect(built.runeKnight.atFinalLevel?.featureNames).toEqual(expect.arrayContaining(["Giant's Might", "Rune Carver"]));
    expect(await readChoiceOptionNames(built.runeKnight.persId)).toEqual(expect.arrayContaining(["Fire Rune (Rune)", "Stone Rune (Rune)"]));
  });

  it("J · Колегія мечів мультикласом: Розмах клинка і стиль бою колегії", async () => {
    expect(built.swords.atFinalLevel?.featureNames).toEqual(expect.arrayContaining(["Blade Flourish", "Fighting Style (Swords)"]));
    expect(await readChoiceOptionNames(built.swords.persId)).toContain("Dueling (Swords)");
  });

  it("K · Коло дикого полумʼя: дух на 3-му і заклинання кола 2-го й 3-го рівнів", () => {
    expect(built.wildfire.atFinalLevel?.featureNames).toContain("Summon Wildfire Spirit");
    expect(spellsByFixture.wildfire.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Burning Hands", "Cure Wounds", "Flaming Sphere", "Scorching Ray"]));
  });

  it("L · Школа бойової магії: риси 2-го рівня 2014 приходять на 3-му", () => {
    expect(built.warMagic.atFinalLevel?.featureNames).toEqual(expect.arrayContaining(["Arcane Deflection", "Tactical Wit"]));
  });

  it("M · Місячне чародійство: місячні заклинання 1-го й 3-го рівнів класу", () => {
    expect(built.lunar.atFinalLevel?.featureNames).toEqual(expect.arrayContaining(["Lunar Embodiment", "Moon Fire"]));
    expect(spellsByFixture.lunar.map((spell) => spell.engName)).toEqual(
      expect.arrayContaining(["Shield", "Ray of Sickness", "Color Spray", "Lesser Restoration", "Blindness/Deafness", "Alter Self"]),
    );
  });

  it("N · Шлях кенсея й O · Охоронець рою: риси 3-го рівня й замовляння рою", () => {
    expect(built.kensei.atFinalLevel?.featureNames).toContain("Path of the Kensei");
    expect(built.swarmkeeper.atFinalLevel?.featureNames).toEqual(expect.arrayContaining(["Gathered Swarm", "Swarmkeeper Magic"]));
    expect(spellsByFixture.swarmkeeper.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Mage Hand", "Faerie Fire"]));
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

async function readPersSpells(persId: number | null): Promise<SpellRow[]> {
  const rows = await prisma.persSpell.findMany({ where: { persId: persId ?? -1 }, select: { spell: { select: { engName: true, ruleset: true } } } });
  return rows.map((row) => ({ engName: row.spell.engName, ruleset: String(row.spell.ruleset) }));
}

async function readSubclassRuleset(persId: number | null, subclass: string): Promise<string | null> {
  const pers = await prisma.pers.findUniqueOrThrow({
    where: { persId: persId ?? -1 },
    select: { subclass: { select: { name: true, ruleset: true } }, multiclasses: { select: { subclass: { select: { name: true, ruleset: true } } } } },
  });
  const owned = [pers.subclass, ...pers.multiclasses.map((multiclass) => multiclass.subclass)].find((candidate) => candidate?.name === subclass);
  return owned ? String(owned.ruleset) : null;
}

async function readChoiceOptionNames(persId: number | null): Promise<string[]> {
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: persId ?? -1 }, select: { choiceOptions: { select: { optionNameEng: true } } } });
  return pers.choiceOptions.map((option) => option.optionNameEng);
}
