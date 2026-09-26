import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";
import { findSubclassSpellGrants, writeSubclassSpellGrants } from "@/server/db/always-prepared-spell-grants";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { getCreationSpellOffer } from "@/lib/actions/class-actions";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

/**
 * O48 — підклас 2014 сам кладе свої заклинання: Домен життя — Bless і Cure Wounds на 1-му рівні клірика,
 * Абераційний розум — три на 1-му чародія. Розширений список покровителя (Безодня) — ні: його гравець
 * обирає сам, і крок вибору його пропонує. Заклинання, яке гравець уже тримав своїм вибором, підклас
 * перемічає як своє — рішення власника 2026-09-26.
 */

let spellIdByName: Map<string, number>;

beforeAll(async () => {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014" }, select: { spellId: true, engName: true } });
  spellIdByName = new Map(rows.map((row) => [row.engName, row.spellId]));
});

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function createCharacter2014(className: Classes, subclassName: Subclasses) {
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(className), backgroundByName(BackgroundCategory.ACOLYTE)]);
  const subclassId = (await subclassByName(characterClass.classId, subclassName)).subclassId;
  const form = minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId, subclassId });
  const created = await createCharacter(await withCreationSpells(form));
  if ("error" in created) throw new Error(`не створився: ${created.error}`);
  return { persId: created.persId, classId: characterClass.classId, subclassId, form };
}

async function readGrantedRows(persId: number, badgeText: string) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, badgeText },
    select: { origin: true, isPrepared: true, excludeFromPreparedCount: true, excludeFromKnownCount: true, learnedAtLevel: true, spell: { select: { engName: true } } },
  });
  return rows.sort((left, right) => left.spell.engName.localeCompare(right.spell.engName));
}

const names = (rows: { spell: { engName: string } }[]) => rows.map((row) => row.spell.engName);

describe("O48 — конструктор 2014 кладе заклинання підкласу 1-го рівня", () => {
  it("клірик Домену життя має Bless і Cure Wounds підготовленими понад ліміт", async () => {
    await signIn("o48-life-create");
    const { persId } = await createCharacter2014(Classes.CLERIC_2014, Subclasses.LIFE_DOMAIN);

    const rows = await readGrantedRows(persId, "Домен життя");
    expect(names(rows)).toEqual(["Bless", "Cure Wounds"]);
    for (const row of rows) {
      expect(row).toMatchObject({ origin: SpellOrigin.CLASS, isPrepared: true, excludeFromPreparedCount: true, excludeFromKnownCount: true, learnedAtLevel: 1 });
    }
  });

  it("чародій Абераційного розуму знає три псіонічні заклинання, а крок вибору не пропонує Mind Sliver", async () => {
    await signIn("o48-aberrant-create");
    const { persId, form } = await createCharacter2014(Classes.SORCERER_2014, Subclasses.ABERRANT_MIND);

    const offer = await getCreationSpellOffer(form.classId, [], form.subclassId ?? null);
    expect(offer?.cantrips.some((spell) => spell.engName === "Mind Sliver")).toBe(false);

    const rows = await readGrantedRows(persId, "Абераційний розум");
    expect(names(rows)).toEqual(["Arms of Hadar", "Dissonant Whispers", "Mind Sliver"]);
    expect(rows.every((row) => row.excludeFromKnownCount)).toBe(true);
  });

  it("чорнокнижник Безодні нічого не отримує сам, але обирає з розширеного списку покровителя", async () => {
    await signIn("o48-fathomless-create");
    const { persId, form } = await createCharacter2014(Classes.WARLOCK_2014, Subclasses.FATHOMLESS);

    const offer = await getCreationSpellOffer(form.classId, [], form.subclassId ?? null);
    expect(offer?.spells.map((spell) => spell.engName)).toEqual(expect.arrayContaining(["Create or Destroy Water", "Thunderwave"]));

    const granted = await prisma.persSpell.count({ where: { persId, excludeFromKnownCount: true } });
    expect(granted).toBe(0);
  });
});

describe("O48 — підвищення рівня 2014 добирає й перемічає", () => {
  it("клірик без заклинань на листі на 3-му рівні дістає рядки 1-го й 3-го, а Bless, взятий руками, стає доменним", async () => {
    await signIn("o48-life-levelup");
    const { persId, classId } = await createCharacter2014(Classes.CLERIC_2014, Subclasses.LIFE_DOMAIN);
    await prisma.persSpell.deleteMany({ where: { persId } });
    await prisma.persSpell.create({ data: { persId, spellId: spellIdByName.get("Bless")!, learnedAtLevel: 1, origin: SpellOrigin.MANUAL, badgeText: "Клірик", isPrepared: true } });

    for (const level of [2, 3]) {
      const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, minimalLevelUpForm({ classId })));
      expect(result, `рівень ${level}`).not.toHaveProperty("error");
    }

    const rows = await readGrantedRows(persId, "Домен життя");
    expect(names(rows)).toEqual(["Bless", "Cure Wounds", "Lesser Restoration", "Spiritual Weapon"]);
    expect(rows.find((row) => row.spell.engName === "Bless")).toMatchObject({ origin: SpellOrigin.CLASS, excludeFromPreparedCount: true, learnedAtLevel: 1 });
    expect(rows.filter((row) => row.learnedAtLevel === 3).map((row) => row.spell.engName)).toEqual(["Lesser Restoration", "Spiritual Weapon"]);
    expect(await prisma.persSpell.count({ where: { persId, spellId: spellIdByName.get("Bless")! } })).toBe(1);
  });
});

describe("O48 — ремонт персонажа, який уже стоїть на рівні й не росте", () => {
  it("клірик 5-го рівня без доменних рядків отримує шість, ручний Revivify перемічається, повтор нічого не робить", async () => {
    await signIn("o48-life-repair");
    const { persId, subclassId } = await createCharacter2014(Classes.CLERIC_2014, Subclasses.LIFE_DOMAIN);
    await prisma.persSpell.deleteMany({ where: { persId } });
    await prisma.pers.update({ where: { persId }, data: { level: 5 } });
    await prisma.persSpell.create({ data: { persId, spellId: spellIdByName.get("Revivify")!, learnedAtLevel: 5, origin: SpellOrigin.MANUAL } });

    const subclasses = [{ subclassId, classLevel: 5, ability: "WIS" as const }];
    const grants = await findSubclassSpellGrants(prisma, { persId, subclasses });
    expect(grants.adopted.map((spell) => spell.spellId)).toEqual([spellIdByName.get("Revivify")]);
    expect(grants.created).toHaveLength(5);

    await prisma.$transaction((tx) => writeSubclassSpellGrants(tx, { persId, grants, learnedAtLevel: 5 }));
    expect(names(await readGrantedRows(persId, "Домен життя"))).toEqual([
      "Beacon of Hope", "Bless", "Cure Wounds", "Lesser Restoration", "Revivify", "Spiritual Weapon",
    ]);

    const again = await findSubclassSpellGrants(prisma, { persId, subclasses });
    expect(again).toEqual({ created: [], adopted: [] });
  });
});

describe("O48 — Коло землі 2014 кладе заклинання обраного біому", () => {
  async function createLandDruid(level: number) {
    const { persId, classId } = await createCharacter2014(Classes.DRUID_2014, Subclasses.CIRCLE_OF_THE_LAND);
    const arctic = await prisma.choiceOption.findUniqueOrThrow({ where: { optionNameEng: "Circle Spells — Arctic" }, select: { choiceOptionId: true, optionName: true } });
    await prisma.persSpell.deleteMany({ where: { persId } });
    await prisma.pers.update({ where: { persId }, data: { level, choiceOptions: { connect: { choiceOptionId: arctic.choiceOptionId } } } });
    const subclassId = (await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { subclassId: true } })).subclassId!;
    return { persId, classId, subclassId, arctic };
  }

  it("ремонт друїда 5-го рівня з Арктикою: Hold Person, Spike Growth, Sleet Storm і Slow — під назвою біому", async () => {
    await signIn("o48-land-repair");
    const { persId, subclassId, arctic } = await createLandDruid(5);

    const grants = await findSubclassSpellGrants(prisma, { persId, subclasses: [{ subclassId, classLevel: 5, ability: "WIS" }], choiceOptionIds: [arctic.choiceOptionId] });
    await prisma.$transaction((tx) => writeSubclassSpellGrants(tx, { persId, grants, learnedAtLevel: 5 }));

    const rows = await readGrantedRows(persId, arctic.optionName.slice(0, 24));
    expect(names(rows)).toEqual(["Hold Person", "Sleet Storm", "Slow", "Spike Growth"]);
    expect(rows.every((row) => row.excludeFromPreparedCount && row.isPrepared)).toBe(true);
  });

  it("без обраного біому Коло землі нічого не видає", async () => {
    await signIn("o48-land-none");
    const { persId, subclassId } = await createLandDruid(5);
    expect(await findSubclassSpellGrants(prisma, { persId, subclasses: [{ subclassId, classLevel: 5, ability: "WIS" }], choiceOptionIds: [] })).toEqual({ created: [], adopted: [] });
  });

  it("підвищення 4 → 5 дає друїду з Арктикою рядок 5-го рівня разом із пропущеним 3-го", async () => {
    await signIn("o48-land-levelup");
    const { persId, classId, arctic } = await createLandDruid(4);

    const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, minimalLevelUpForm({ classId })));
    expect(result).not.toHaveProperty("error");

    const rows = await readGrantedRows(persId, arctic.optionName.slice(0, 24));
    expect(names(rows)).toEqual(["Hold Person", "Sleet Storm", "Slow", "Spike Growth"]);
  });
});
