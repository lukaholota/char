/**
 * Р38, виняток для книги чарівника (власник, 2026-09-15): заклинання, яке інше джерело вже дає
 * завжди підготовленим («Посвячений у магію» → Shield), можна вписати в книгу. Рядок лишається
 * один і зберігає джерело риси, книга лише забирає його бейджем; готувати його вдруге не можна.
 * Кейс — QA-персонаж №002 (Людина · Мудрець · Слідопит 4 / Чарівник 2).
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { findRequiredClassChoices2024 } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";
import type { ClassSpellSelection } from "@/rules/class-spell-choices-2024";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const WIZARD_LABEL = "Чарівник";

describe("Р38 — спільне заклинання в книзі чарівника 2024", () => {
  it("мультиклас у чарівника вписує в книгу Shield від «Посвяченого у магію» одним рядком риси", async () => {
    await signIn("shared-spell-levelup");
    const persId = await createMagicInitiate(Classes.FIGHTER_2024, ["Fire Bolt", "Mage Hand", "Shield"]);
    const [wizard, shield] = await Promise.all([findClass(Classes.WIZARD_2024), findSpellId("Shield")]);

    const offer = await getLevelUpSpellOffer(persId, wizard.classId, null, []);
    expect(offer?.spells.map((spell) => spell.spellId)).toContain(shield);
    expect(offer?.bookOnlySpellIds).toEqual([shield]);

    const book = [shield, ...pickOtherSpellIds(offer!, shield, 5)];
    const cantripIds = offer!.cantrips.slice(0, 3).map((spell) => spell.spellId);

    const preparingShield = await levelUpWizard(persId, wizard.classId, { cantripIds, spellbookIds: book, preparedIds: book.slice(0, 4) });
    expect(preparingShield).toEqual({ error: expect.stringContaining("завжди підготоване") });

    const result = await levelUpWizard(persId, wizard.classId, { cantripIds, spellbookIds: book, preparedIds: book.slice(1, 5) });
    expect(result).not.toHaveProperty("error");

    expect(await readRow(persId, shield)).toEqual({
      origin: SpellOrigin.FEAT,
      sourceName: "MAGIC_INITIATE",
      isPrepared: true,
      excludeFromPreparedCount: true,
      badgeText: WIZARD_LABEL,
    });
    expect(await countWizardBook(persId)).toEqual({ spellbook: 6, prepared: 4 });
  });

  it("у конструкторі Shield іде і в книгу, і в «Посвяченого у магію», якщо клас його не готує", async () => {
    await signIn("shared-spell-creation");
    const shield = await findSpellId("Shield");

    const persId = await createMagicInitiate(Classes.WIZARD_2024, ["Fire Bolt", "Mage Hand", "Shield"], { spellbook: ["Shield"] });

    expect(await readRow(persId, shield)).toEqual({
      origin: SpellOrigin.FEAT,
      sourceName: "MAGIC_INITIATE",
      isPrepared: true,
      excludeFromPreparedCount: true,
      badgeText: WIZARD_LABEL,
    });
    expect(await countWizardBook(persId)).toEqual({ spellbook: 6, prepared: 4 });
  });

  it("у конструкторі Shield, підготовлений класом, риса взяти не може", async () => {
    await signIn("shared-spell-creation-prepared");

    await expect(
      createMagicInitiate(Classes.WIZARD_2024, ["Fire Bolt", "Mage Hand", "Shield"], { spellbook: ["Shield"], prepared: ["Shield"] }),
    ).rejects.toThrow("вже дає інше джерело");
  });
});

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function createMagicInitiate(
  className: Classes,
  featSpellNames: string[],
  classSpellPicks: { spellbook?: string[]; prepared?: string[] } = {},
): Promise<number> {
  const [race, characterClass, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2024 } }),
    findClass(className),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SAGE_2024 } }),
  ]);
  const form = minimalForm({
    name: `Спільне заклинання ${className}`,
    raceId: race.raceId,
    classId: characterClass.classId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "INT", plusOne: "CON" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    classChoiceSelections: await findRequiredClassChoices2024(characterClass.classId, 1),
    backgroundFeatChoiceSelections: await findMagicInitiateWizardSelections(background.originFeatId!),
    featSpellSelections: { BACKGROUND_ORIGIN: await Promise.all(featSpellNames.map(findSpellId)) },
  });
  const created = await createCharacter(await withCreationSpells(form, classSpellPicks));
  if (!created.persId) throw new Error(`не створився: ${created.error}`);
  return created.persId;
}

async function levelUpWizard(persId: number, classId: number, classSpells: ClassSpellSelection) {
  return levelUpCharacter(persId, minimalLevelUpForm({ levelUpPath: "MULTICLASS", classId, classSpells }));
}

function pickOtherSpellIds(offer: { spells: Array<{ spellId: number; engName: string }> }, exceptId: number, count: number): number[] {
  return [...offer.spells]
    .filter((spell) => spell.spellId !== exceptId)
    .sort((a, b) => a.engName.localeCompare(b.engName))
    .slice(0, count)
    .map((spell) => spell.spellId);
}

async function findMagicInitiateWizardSelections(featId: number) {
  const options = await prisma.featChoiceOption.findMany({
    where: { featId, choiceOption: { optionNameEng: { in: ["Magic Initiate 2024 (Wizard)", "Magic Initiate 2024 (INT)"] } } },
    select: { choiceOptionId: true, choiceOption: { select: { groupName: true } } },
  });
  return Object.fromEntries(options.map((option) => [option.choiceOption.groupName, option.choiceOptionId]));
}

const findClass = (name: Classes) => prisma.class.findFirstOrThrow({ where: { name } });

async function findSpellId(engName: string): Promise<number> {
  const spell = await prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2024", engName }, select: { spellId: true } });
  return spell.spellId;
}

function readRow(persId: number, spellId: number) {
  return prisma.persSpell.findUniqueOrThrow({
    where: { persId_spellId: { persId, spellId } },
    select: { origin: true, sourceName: true, isPrepared: true, excludeFromPreparedCount: true, badgeText: true },
  });
}

async function countWizardBook(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, badgeText: WIZARD_LABEL },
    select: { isPrepared: true, excludeFromPreparedCount: true, spell: { select: { level: true } } },
  });
  const leveled = rows.filter((row) => row.spell.level > 0);
  return {
    spellbook: leveled.length,
    prepared: leveled.filter((row) => row.isPrepared && !row.excludeFromPreparedCount).length,
  };
}
