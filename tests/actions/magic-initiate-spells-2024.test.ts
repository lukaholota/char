import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { findRequiredClassChoices2024 } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getCreationFeatSpellOffer } from "@/lib/actions/feat-spell-actions";
import { getLevelUpFeatSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

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

async function buildInitiateChoices(list: "Cleric" | "Druid" | "Wizard", ability: "INT" | "WIS" | "CHA"): Promise<Record<string, number>> {
  const options = await prisma.choiceOption.findMany({
    where: { optionNameEng: { in: [`Magic Initiate 2024 (${list})`, `Magic Initiate 2024 (${ability})`] } },
    select: { choiceOptionId: true, groupName: true },
  });
  return Object.fromEntries(options.map((option) => [option.groupName, option.choiceOptionId]));
}

async function findMagicInitiate() {
  return prisma.feat.findFirstOrThrow({ where: { ruleset: "RULES_2024", name: "MAGIC_INITIATE" }, select: { featId: true } });
}

/** Клірик-мудрець: риса походження «Посвячений у магію» від Мудреця, клас свої заклинання добирає хелпером. */
async function buildSageCleric(input: { featSpellSelections?: PersFormData["featSpellSelections"]; list?: "Cleric" | "Wizard"; human?: "Cleric" | "Druid" }) {
  const [race, cleric, sage] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2024 } }),
    prisma.class.findFirstOrThrow({ where: { name: Classes.CLERIC_2024 } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SAGE_2024 } }),
  ]);
  const speciesInitiate = input.human
    ? await prisma.raceChoiceOption.findFirstOrThrow({ where: { raceId: race.raceId, optionNameEng: "Magic Initiate" }, select: { optionId: true, choiceGroupName: true } })
    : null;

  const form = minimalForm({
    name: "Посвячений клірик",
    raceId: race.raceId,
    classId: cleric.classId,
    backgroundId: sage.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "WIS", plusOne: "INT" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    classChoiceSelections: await findRequiredClassChoices2024(cleric.classId, 1),
    backgroundFeatChoiceSelections: await buildInitiateChoices(input.list ?? "Wizard", "INT"),
    ...(speciesInitiate
      ? {
          raceChoiceSelections: { [speciesInitiate.choiceGroupName]: speciesInitiate.optionId },
          speciesFeatChoiceSelections: await buildInitiateChoices(input.human!, "WIS"),
        }
      : {}),
    ...(input.featSpellSelections ? { featSpellSelections: input.featSpellSelections } : {}),
  });
  return withCreationSpells(form, { cantrips: ["Guidance", "Sacred Flame", "Thaumaturgy"] });
}

async function readFeatSpells(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, origin: "FEAT" },
    select: { isPrepared: true, excludeFromPreparedCount: true, sourceName: true, badgeText: true, learnedAtLevel: true, spell: { select: { engName: true } } },
    orderBy: { spell: { engName: "asc" } },
  });
  return rows.map(({ spell, ...row }) => ({ engName: spell.engName, ...row }));
}

describe("KR31.5 — «Посвячений у магію» 2024 дає обрані заклинання (L07-spellcasting-04)", () => {
  it("риса походження Мудреця: два замовляння й Щит зі списку чарівника — рядки риси, завжди підготовані й поза лімітом", async () => {
    await signIn("initiate-sage");
    const form = await buildSageCleric({ featSpellSelections: { BACKGROUND_ORIGIN: await findSpellIds(["Fire Bolt", "Mage Hand", "Shield"]) } });

    const created = await createCharacter(form);
    if (!created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);

    const common = { isPrepared: true, excludeFromPreparedCount: true, sourceName: "MAGIC_INITIATE", badgeText: "Посвячений у магію", learnedAtLevel: 1 };
    expect(await readFeatSpells(created.persId)).toEqual([
      { engName: "Fire Bolt", ...common },
      { engName: "Mage Hand", ...common },
      { engName: "Shield", ...common },
    ]);
  });

  it("без вибору заклинань риси персонаж не створюється", async () => {
    await signIn("initiate-missing");
    const form = await buildSageCleric({ featSpellSelections: { BACKGROUND_ORIGIN: [] } });

    expect(await createCharacter(form)).toEqual({ error: "Оберіть 2 замовляння риси" });
    expect(await prisma.pers.count()).toBe(0);
  });

  it("заклинання з іншого списку, ніж обраний у рисі, відхиляється", async () => {
    await signIn("initiate-foreign");
    const form = await buildSageCleric({ featSpellSelections: { BACKGROUND_ORIGIN: await findSpellIds(["Fire Bolt", "Guidance", "Shield"]) } });

    expect(await createCharacter(form)).toEqual({ error: "Обране заклинання не підходить цій рисі" });
  });

  it("замовляння, яке вже обрано класом, риса другий раз не бере", async () => {
    await signIn("initiate-class-overlap");
    const form = await buildSageCleric({ list: "Cleric", featSpellSelections: { BACKGROUND_ORIGIN: await findSpellIds(["Guidance", "Light", "Sanctuary"]) } });

    expect(await createCharacter(form)).toEqual({ error: "Це заклинання вже дає інше джерело — оберіть інше" });
  });

  it("Людина з двома рисами: той самий Світло від передісторії й від виду не приймається", async () => {
    await signIn("initiate-two-feats");
    const [light, fireBolt, shield, spareTheDying, bless] = await findSpellIds(["Light", "Fire Bolt", "Shield", "Spare the Dying", "Bless"]);
    const clash = await buildSageCleric({
      human: "Cleric",
      featSpellSelections: { BACKGROUND_ORIGIN: [light, fireBolt, shield], SPECIES_VERSATILITY: [light, spareTheDying, bless] },
    });

    expect(await createCharacter(clash)).toEqual({ error: "Це заклинання вже дає інше джерело — оберіть інше" });
  });

  it("список для кроку конструктора: лише замовляння й заклинання 1-го рівня обраного списку", async () => {
    const { featId } = await findMagicInitiate();
    const druid = await buildInitiateChoices("Druid", "WIS");

    const offer = await getCreationFeatSpellOffer(featId, Object.values(druid));
    const [cantrips, levelOne] = offer?.picks ?? [];

    expect(offer?.picks.map((pick) => ({ count: pick.count, spellLevel: pick.spellLevel }))).toEqual([
      { count: 2, spellLevel: 0 },
      { count: 1, spellLevel: 1 },
    ]);
    expect(cantrips.spells.every((spell) => spell.level === 0 && spell.spellLists?.includes("Друїд"))).toBe(true);
    expect(levelOne.spells.every((spell) => spell.level === 1 && spell.spellLists?.includes("Друїд"))).toBe(true);
    expect(await getCreationFeatSpellOffer(featId, [])).toBeNull();
  });
});

describe("KR31.5 — «Посвячений у магію» 2024 на підвищенні рівня (L07-spellcasting-04)", () => {
  async function createClericAtLevelThree() {
    const created = await createCharacter(await buildSageCleric({}));
    if (!created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);
    const cleric = await prisma.class.findFirstOrThrow({ where: { name: Classes.CLERIC_2024 } });
    const lifeDomain = await prisma.subclass.findFirstOrThrow({ where: { classId: cleric.classId, name: "LIFE_DOMAIN" } });

    for (const level of [2, 3]) {
      const form = minimalLevelUpForm({ classId: cleric.classId, ...(level === 3 ? { subclassId: lifeDomain.subclassId } : {}) });
      const result = await levelUpCharacter(created.persId, await withLevelUpSpells(created.persId, form));
      expect(result, `рівень ${level}`).not.toHaveProperty("error");
    }
    return { persId: created.persId, classId: cleric.classId };
  }

  it("риса 4-го рівня: список друїда без уже наявних заклинань, а без вибору рівня немає", async () => {
    await signIn("initiate-levelup");
    const { persId, classId } = await createClericAtLevelThree();
    const { featId } = await findMagicInitiate();
    const featChoiceSelections = await buildInitiateChoices("Druid", "WIS");
    const owned = await prisma.persSpell.findMany({ where: { persId }, select: { spellId: true } });

    const offer = await getLevelUpFeatSpellOffer(persId, featId, Object.values(featChoiceSelections));
    const offeredIds = offer!.picks.flatMap((pick) => pick.spells.map((spell) => spell.spellId));
    expect(offeredIds.some((spellId) => owned.some((row) => row.spellId === spellId))).toBe(false);

    const featSpellIds = await findSpellIds(["Druidcraft", "Produce Flame", "Goodberry"]);
    const form = await withLevelUpSpells(persId, minimalLevelUpForm({ classId, featId, featChoiceSelections, featSpellIds }));
    expect(await levelUpCharacter(persId, { ...form, featSpellIds: [] })).toEqual({ error: "Оберіть 2 замовляння риси" });

    expect(await levelUpCharacter(persId, form)).not.toHaveProperty("error");
    expect((await readFeatSpells(persId)).filter((row) => row.learnedAtLevel === 4).map((row) => row.engName)).toEqual([
      "Druidcraft",
      "Goodberry",
      "Produce Flame",
    ]);
  });
});
