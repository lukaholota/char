import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { findRequiredClassChoices2024 } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";
import type { ClassSpellSelection } from "@/rules/class-spell-choices-2024";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getCreationSpellOffer } from "@/lib/actions/class-actions";

vi.setConfig({ testTimeout: 60_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function signIn(handle: string): Promise<void> {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function findSpellIds(engNames: string[]): Promise<number[]> {
  const spells = await prisma.spell.findMany({ where: { ruleset: "RULES_2024", engName: { in: engNames } }, select: { spellId: true, engName: true } });
  return engNames.map((engName) => {
    const spell = spells.find((candidate) => candidate.engName === engName);
    if (!spell) throw new Error(`немає заклинання 2024 ${engName}`);
    return spell.spellId;
  });
}

async function findClassOptionId(classId: number, optionNameEng: string): Promise<{ groupName: string; choiceOptionId: number }> {
  const option = await prisma.classChoiceOption.findFirstOrThrow({
    where: { classId, choiceOption: { optionNameEng } },
    select: { choiceOptionId: true, choiceOption: { select: { groupName: true } } },
  });
  return { groupName: option.choiceOption.groupName, choiceOptionId: option.choiceOptionId };
}

async function buildForm(input: {
  className: Classes;
  raceName?: Races;
  raceChoiceSelections?: Record<string, number>;
  classChoiceSelections?: Record<string, number | number[]>;
  classSpells?: ClassSpellSelection;
}) {
  const [race, characterClass, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: input.raceName ?? Races.HUMAN_2024 } }),
    prisma.class.findFirstOrThrow({ where: { name: input.className } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SAGE_2024 } }),
  ]);

  const form = minimalForm({
    name: `Заклинач ${input.className}`,
    raceId: race.raceId,
    classId: characterClass.classId,
    backgroundId: background.backgroundId,
    raceChoiceSelections: input.raceChoiceSelections ?? {},
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "WIS", plusOne: "INT" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    classChoiceSelections: input.classChoiceSelections ?? (await findRequiredClassChoices2024(characterClass.classId, 1)),
    ...(input.classSpells ? { classSpells: input.classSpells } : {}),
  });
  delete (form as Record<string, unknown>).ruleset;
  return { form, classId: characterClass.classId };
}

async function readPersSpells(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId },
    select: { origin: true, isPrepared: true, badgeText: true, sourceName: true, spell: { select: { engName: true, level: true } } },
    orderBy: { spell: { engName: "asc" } },
  });
  return rows.map(({ spell, ...row }) => ({ engName: spell.engName, level: spell.level, ...row }));
}

const CLERIC_CANTRIPS = ["Guidance", "Light", "Sacred Flame", "Thaumaturgy"];
const CLERIC_PREPARED = ["Bless", "Cure Wounds", "Guiding Bolt", "Healing Word"];
const WIZARD_CANTRIPS = ["Fire Bolt", "Mage Hand", "Minor Illusion"];
const WIZARD_BOOK = ["Detect Magic", "Feather Fall", "Mage Armor", "Magic Missile", "Shield", "Sleep"];

describe("KR31.5 — заклинання 1-го рівня в конструкторі 2024 (P6-class-sweep-level1-07)", () => {
  it("клірик-тауматург отримує 4 замовляння й 4 підготовлені з бейджем класу", async () => {
    await signIn("creation-spells-cleric");
    const cleric = await prisma.class.findFirstOrThrow({ where: { name: Classes.CLERIC_2024 } });
    const thaumaturge = await findClassOptionId(cleric.classId, "Divine Order: Thaumaturge (2024)");
    const { form } = await buildForm({
      className: Classes.CLERIC_2024,
      classChoiceSelections: { [thaumaturge.groupName]: thaumaturge.choiceOptionId },
      classSpells: { cantripIds: await findSpellIds(CLERIC_CANTRIPS), preparedIds: await findSpellIds(CLERIC_PREPARED), spellbookIds: [] },
    });

    const created = await createCharacter(form);
    if (!created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);

    const spells = await readPersSpells(created.persId);
    expect(spells.map((spell) => spell.engName)).toEqual([...CLERIC_PREPARED, ...CLERIC_CANTRIPS].sort());
    expect(spells.every((spell) => spell.origin === "CLASS" && spell.isPrepared && spell.badgeText === "Клірик" && spell.sourceName === "CLERIC_2024")).toBe(true);
  });

  it("чарівник: шість заклинань у книзі, з них чотири підготовлені", async () => {
    await signIn("creation-spells-wizard");
    const book = await findSpellIds(WIZARD_BOOK);
    const { form } = await buildForm({
      className: Classes.WIZARD_2024,
      classSpells: { cantripIds: await findSpellIds(WIZARD_CANTRIPS), spellbookIds: book, preparedIds: book.slice(0, 4) },
    });

    const created = await createCharacter(form);
    if (!created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);

    const spells = await readPersSpells(created.persId);
    expect(spells.filter((spell) => spell.level === 0).map((spell) => spell.engName)).toEqual(WIZARD_CANTRIPS);
    expect(spells.filter((spell) => spell.level === 1 && spell.isPrepared).map((spell) => spell.engName)).toEqual(WIZARD_BOOK.slice(0, 4));
    expect(spells.filter((spell) => spell.level === 1 && !spell.isPrepared).map((spell) => spell.engName)).toEqual(WIZARD_BOOK.slice(4));
  });

  it("заклинач без вибору заклинань не створюється", async () => {
    await signIn("creation-spells-missing");
    const { form } = await buildForm({ className: Classes.WIZARD_2024 });

    expect(await createCharacter(form)).toEqual({ error: "Оберіть замовлянь: 3" });
    expect(await prisma.pers.count()).toBe(0);
  });

  it("клірик у конструкторі без підготовлених не створюється — пропуск дозволено лише на підвищенні (Р43)", async () => {
    await signIn("creation-spells-cleric-prepared");
    const cleric = await prisma.class.findFirstOrThrow({ where: { name: Classes.CLERIC_2024 } });
    const protector = await findClassOptionId(cleric.classId, "Divine Order: Protector (2024)");
    const { form } = await buildForm({
      className: Classes.CLERIC_2024,
      classChoiceSelections: { [protector.groupName]: protector.choiceOptionId },
      classSpells: { cantripIds: await findSpellIds(CLERIC_CANTRIPS.slice(0, 3)), preparedIds: [], spellbookIds: [] },
    });

    expect(await createCharacter(form)).toEqual({ error: "Оберіть підготовлених заклинань: 4" });
    expect(await prisma.pers.count()).toBe(0);
  });

  it("заклинання зі списку чужого класу відхиляється", async () => {
    await signIn("creation-spells-foreign");
    const { form } = await buildForm({
      className: Classes.CLERIC_2024,
      classSpells: {
        cantripIds: await findSpellIds(["Guidance", "Light", "Fire Bolt"]),
        preparedIds: await findSpellIds(CLERIC_PREPARED),
        spellbookIds: [],
      },
    });

    expect(await createCharacter(form)).toEqual({ error: "Обране замовляння не з вашого списку класу" });
  });

  it("високий ельф не бере Prestidigitation другий раз замовлянням класу", async () => {
    await signIn("creation-spells-high-elf");
    const elf = await prisma.race.findFirstOrThrow({ where: { name: Races.ELF_2024 } });
    const lineage = await prisma.raceChoiceOption.findMany({
      where: { raceId: elf.raceId, optionNameEng: { in: ["High Elf", "INT"] } },
      select: { optionId: true, choiceGroupName: true },
    });
    const book = await findSpellIds(WIZARD_BOOK);
    const { form } = await buildForm({
      className: Classes.WIZARD_2024,
      raceName: Races.ELF_2024,
      raceChoiceSelections: Object.fromEntries(lineage.map((option) => [option.choiceGroupName, option.optionId])),
      classSpells: { cantripIds: await findSpellIds(["Fire Bolt", "Mage Hand", "Prestidigitation"]), spellbookIds: book, preparedIds: book.slice(0, 4) },
    });

    expect(await createCharacter(form)).toEqual({ error: "Це заклинання вже дає інше джерело — оберіть інше" });
  });

  it("список для кроку: слідопит без Hunter's Mark, воїн без кроку", async () => {
    const [ranger, fighter] = await Promise.all([
      prisma.class.findFirstOrThrow({ where: { name: Classes.RANGER_2024 } }),
      prisma.class.findFirstOrThrow({ where: { name: Classes.FIGHTER_2024 } }),
    ]);

    const rangerOffer = await getCreationSpellOffer(ranger.classId, []);
    expect(rangerOffer?.quota).toEqual({ cantrips: 0, prepared: 2, spellbook: 0, maxSpellLevel: 1 });
    expect(rangerOffer?.cantrips).toEqual([]);
    expect(rangerOffer?.spells.length).toBeGreaterThan(0);
    expect(rangerOffer?.spells.every((spell) => spell.level === 1 && spell.spellLists?.includes("Слідопит"))).toBe(true);
    expect(rangerOffer?.spells.map((spell) => spell.engName)).not.toContain("Hunter's Mark");
    expect(await getCreationSpellOffer(fighter.classId, [])).toBeNull();
  });
});
