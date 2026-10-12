import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { loadInitialPreparedListSpellIds } from "@/server/db/initial-prepared-spells-2014";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const STRONG_SCORES = [
  { ability: "STR", value: 8 }, { ability: "DEX", value: 8 }, { ability: "CON", value: 14 },
  { ability: "INT", value: 15 }, { ability: "WIS", value: 15 }, { ability: "CHA", value: 8 },
];
const WEAK_SCORES = STRONG_SCORES.map((score) => ({ ...score, value: score.ability === "INT" || score.ability === "WIS" ? 8 : score.value }));

let spellIdByName: Map<string, number>;

beforeAll(async () => {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" }, select: { spellId: true, engName: true } });
  spellIdByName = new Map(rows.map((row) => [row.engName, row.spellId]));
});

const spellId = (engName: string) => {
  const id = spellIdByName.get(engName);
  if (!id) throw new Error(`немає заклинання 2014 «${engName}»`);
  return id;
};

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function buildForm(className: Classes, subclass?: Subclasses, overrides: Partial<PersFormData> = {}) {
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(className), backgroundByName(BackgroundCategory.ACOLYTE)]);
  const subclassId = subclass ? (await subclassByName(characterClass.classId, subclass)).subclassId : undefined;
  const form = minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId, subclassId, asi: STRONG_SCORES, ...overrides });
  return withCreationSpells(form);
}

async function readPreparedRows(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, isPrepared: true, spell: { level: { gt: 0 } }, excludeFromPreparedCount: false },
    select: { origin: true, sourceName: true, badgeText: true, learnedAtLevel: true, isPrepared: true, spell: { select: { engName: true } } },
  });
  return rows.sort((left, right) => left.spell.engName.localeCompare(right.spell.engName));
}

const countSpells = () => prisma.persSpell.count();

describe("стартова підготовка Клірика, Друїда й Винахідника 2014", () => {
  it.each([
    ["Клірик Домену життя", Classes.CLERIC_2014, Subclasses.LIFE_DOMAIN, "Клірик", ["Guiding Bolt", "Healing Word", "Sanctuary", "Shield of Faith"]],
    ["Друїд Кола землі", Classes.DRUID_2014, Subclasses.CIRCLE_OF_THE_LAND, "Друїд", ["Entangle", "Goodberry", "Healing Word", "Thunderwave"]],
    ["Винахідник", Classes.ARTIFICER_2014, undefined, "Винахідник", ["Cure Wounds"]],
  ])("%s: обрані заклинання лягають підготовленими рядками класу", async (_label, className, subclass, badge, picks) => {
    await signIn(`prepared-${className}`);
    const form = await buildForm(className, subclass);
    const created = await createCharacter({ ...form, initialPreparedSpellIds: picks.map(spellId) });
    expect(created).not.toHaveProperty("error");

    const rows = await readPreparedRows((created as { persId: number }).persId);
    expect(rows.map((row) => row.spell.engName)).toEqual([...picks].sort());
    for (const row of rows) {
      expect(row).toMatchObject({ origin: SpellOrigin.CLASS, sourceName: className, badgeText: badge, learnedAtLevel: 1, isPrepared: true });
    }
  });

  it("без вибору персонаж лишається з тим, що й було: лише замовляння та заклинання домену", async () => {
    await signIn("prepared-none");
    const form = await buildForm(Classes.CLERIC_2014, Subclasses.LIFE_DOMAIN);
    const created = await createCharacter(form);
    expect(created).not.toHaveProperty("error");
    expect((await readPreparedRows((created as { persId: number }).persId))).toEqual([]);
  });

  it("відхиляє зайве, чуже, повторне й дароване правилом, нічого не записавши", async () => {
    await signIn("prepared-refuse");
    const form = await buildForm(Classes.CLERIC_2014, Subclasses.LIFE_DOMAIN);
    const refusals: [number[], string][] = [
      [[spellId("Guiding Bolt"), spellId("Healing Word"), spellId("Sanctuary"), spellId("Shield of Faith"), spellId("Command")], "Забагато підготовлених заклинань для вашої характеристики"],
      [[spellId("Magic Missile")], "Підготувати можна лише заклинання 1-го рівня зі списку свого класу, які ще не дає правило"],
      [[spellId("Guidance")], "Підготувати можна лише заклинання 1-го рівня зі списку свого класу, які ще не дає правило"],
      [[spellId("Bless")], "Підготувати можна лише заклинання 1-го рівня зі списку свого класу, які ще не дає правило"],
      [[spellId("Command"), spellId("Command")], "Підготовлене заклинання обрано двічі"],
    ];
    for (const [ids, error] of refusals) {
      expect(await createCharacter({ ...form, initialPreparedSpellIds: ids })).toEqual({ error });
    }
    expect(await prisma.pers.count()).toBe(0);
    expect(await countSpells()).toBe(0);
  });

  it("ліміт — модифікатор характеристики плюс рівень, не менше одного; Винахідник не додає половину рівня на 1-му", async () => {
    await signIn("prepared-limit");
    const weakCleric = await buildForm(Classes.CLERIC_2014, Subclasses.LIFE_DOMAIN, { asi: WEAK_SCORES });
    expect(await createCharacter({ ...weakCleric, initialPreparedSpellIds: [spellId("Command"), spellId("Sanctuary")] })).toEqual({ error: "Забагато підготовлених заклинань для вашої характеристики" });
    expect(await createCharacter({ ...weakCleric, initialPreparedSpellIds: [spellId("Command")] })).not.toHaveProperty("error");

    const artificer = await buildForm(Classes.ARTIFICER_2014);
    const picks = ["Cure Wounds", "Detect Magic", "Faerie Fire", "Grease"].map(spellId);
    expect(await createCharacter({ ...artificer, initialPreparedSpellIds: picks })).toEqual({ error: "Забагато підготовлених заклинань для вашої характеристики" });
    expect(await createCharacter({ ...artificer, initialPreparedSpellIds: picks.slice(0, 3) })).not.toHaveProperty("error");
  });

  it("кандидати — заклинання 1-го рівня списку класу без дарованих правилом і без уже взятих з інших джерел", async () => {
    const cleric = await classByName(Classes.CLERIC_2014);
    const life = await subclassByName(cleric.classId, Subclasses.LIFE_DOMAIN);
    const names = async (unavailableSpellIds: number[]) => {
      const ids = await loadInitialPreparedListSpellIds(prisma, { classId: cleric.classId, subclassId: life.subclassId, unavailableSpellIds });
      return (await prisma.spell.findMany({ where: { spellId: { in: ids } }, select: { engName: true, level: true } }));
    };
    const all = await names([]);
    expect(all.every((spell) => spell.level === 1)).toBe(true);
    expect(all.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Command", "Guiding Bolt", "Sanctuary"]));
    expect(all.map((spell) => spell.engName)).not.toEqual(expect.arrayContaining(["Bless"]));
    expect(all.map((spell) => spell.engName)).not.toContain("Cure Wounds");
    expect(all.map((spell) => spell.engName)).not.toContain("Magic Missile");
    expect((await names([spellId("Command")])).map((spell) => spell.engName)).not.toContain("Command");
  });

  it("Паладин, Чародій і редакція 2024 стартової підготовки зі списку не мають", async () => {
    await signIn("prepared-others");
    const paladin = await buildForm(Classes.PALADIN_2014);
    expect(await createCharacter({ ...paladin, initialPreparedSpellIds: [spellId("Bless")] })).toHaveProperty("error");
    const bard = await buildForm(Classes.BARD_2014);
    expect(await createCharacter({ ...bard, initialPreparedSpellIds: [spellId("Healing Word")] })).toHaveProperty("error");
    expect(await prisma.pers.count()).toBe(0);
  });
});
