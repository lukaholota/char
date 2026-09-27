import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin, Subclasses, Subraces } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName, subclassByName, subraceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";
import { loadCatchUpSpellOffers } from "@/server/db/catch-up-spell-choices-2014";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getCreationClassOptionSpellOffer, getCreationRaceSpellOffer } from "@/lib/actions/class-actions";
import { getLevelUpClassOptionSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

/**
 * O48 backlog — де книга 2014 дає гравцеві обрати заклинання, а не називає його: домени природи, смерті й
 * магії, Божественна душа, Коло землі, Колегія знань, Містичний лучник; раси — Високий ельф, Кобольд із
 * Драконячим чаклунством. Обране лягає рядком свого джерела, поза лімітом; без вибору персонаж не
 * створюється й рівня не отримує.
 */

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

async function buildForm(input: { race?: Races; subrace?: Subraces; className: Classes; subclass?: Subclasses; overrides?: Partial<PersFormData> }) {
  const [race, characterClass, background] = await Promise.all([
    raceByName(input.race ?? Races.HUMAN_2014),
    classByName(input.className),
    backgroundByName(BackgroundCategory.ACOLYTE),
  ]);
  const subclassId = input.subclass ? (await subclassByName(characterClass.classId, input.subclass)).subclassId : undefined;
  const subraceId = input.subrace ? (await subraceByName(input.subrace)).subraceId : undefined;
  const form = minimalForm({ raceId: race.raceId, subraceId, classId: characterClass.classId, backgroundId: background.backgroundId, subclassId, ...input.overrides });
  return { form, classId: characterClass.classId, subclassId };
}

async function createOrThrow(form: PersFormData) {
  const created = await createCharacter(form);
  if ("error" in created) throw new Error(`не створився: ${created.error}`);
  return created.persId;
}

async function readRows(persId: number, sourceName: string) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, sourceName },
    select: { origin: true, badgeText: true, isPrepared: true, excludeFromPreparedCount: true, excludeFromKnownCount: true, learnedAtLevel: true, spell: { select: { engName: true } } },
  });
  return rows.sort((left, right) => left.spell.engName.localeCompare(right.spell.engName));
}

const names = (rows: { spell: { engName: string } }[]) => rows.map((row) => row.spell.engName);

describe("O48 — конструктор 2014: риса підкласу 1-го рівня дає обрати", () => {
  it("клірик Домену природи обирає замовляння друїда — рядок підкласу поза лімітом", async () => {
    await signIn("o48-nature-create");
    const { form } = await buildForm({ className: Classes.CLERIC_2014, subclass: Subclasses.NATURE_DOMAIN, overrides: { classOptionSpellIds: [] } });
    const withSpells = await withCreationSpells({ ...form, classOptionSpellIds: undefined });
    const persId = await createOrThrow({ ...withSpells, classOptionSpellIds: [spellId("Shillelagh")] });

    const rows = await readRows(persId, "Nature Domain: Acolyte of Nature (2014)");
    expect(names(rows)).toEqual(["Shillelagh"]);
    expect(rows[0]).toMatchObject({
      origin: SpellOrigin.CLASS,
      badgeText: "Послідовник природи",
      isPrepared: true,
      excludeFromPreparedCount: true,
      excludeFromKnownCount: true,
      learnedAtLevel: 1,
    });
  });

  it("без вибору чи з замовлянням клірика замість друїдового клірик Домену природи не створюється", async () => {
    await signIn("o48-nature-refuse");
    const { form } = await buildForm({ className: Classes.CLERIC_2014, subclass: Subclasses.NATURE_DOMAIN });
    const withSpells = await withCreationSpells(form);

    expect(await createCharacter({ ...withSpells, classOptionSpellIds: [] })).toEqual({ error: "Оберіть 1 замовляння: Послідовник природи" });
    expect(await createCharacter({ ...withSpells, classOptionSpellIds: [spellId("Sacred Flame")] })).toEqual({
      error: "Обране заклинання не підходить: Послідовник природи",
    });
  });

  it("крок конструктора пропонує Божественній душі лише пʼять заклинань спорідненості", async () => {
    await signIn("o48-divine-soul");
    const { form, subclassId } = await buildForm({ className: Classes.SORCERER_2014, subclass: Subclasses.DIVINE_SOUL });

    const offer = await getCreationClassOptionSpellOffer([], [], subclassId ?? null);
    expect(offer?.label).toBe("Божественна магія");
    expect(offer?.offer.picks[0].spells.map((spell) => spell.engName).sort()).toEqual(["Bane", "Bless", "Cure Wounds", "Inflict Wounds", "Protection From Evil and Good"]);

    const persId = await createOrThrow({ ...(await withCreationSpells(form)), classOptionSpellIds: [spellId("Bless")] });
    expect(names(await readRows(persId, "Divine Soul: Divine Magic (2014)"))).toEqual(["Bless"]);
  });

  it("клірик Домену життя вибору не має, а залишок вибору від іншого домену сервер не приймає", async () => {
    await signIn("o48-life-no-choice");
    const { form, subclassId } = await buildForm({ className: Classes.CLERIC_2014, subclass: Subclasses.LIFE_DOMAIN });

    expect(await getCreationClassOptionSpellOffer([], [], subclassId ?? null)).toBeNull();
    const withSpells = await withCreationSpells(form);
    expect(await createCharacter({ ...withSpells, classOptionSpellIds: [spellId("Shillelagh")] })).toHaveProperty("error");
  });
});

describe("O48 — конструктор 2014: раса дає обрати замовляння", () => {
  it("Високий ельф-воїн знає обране замовляння чарівника — рядок раси", async () => {
    await signIn("o48-high-elf");
    const { form } = await buildForm({ race: Races.ELF_2014, subrace: Subraces.ELF_HIGH_2014, className: Classes.FIGHTER_2014 });
    const persId = await createOrThrow({ ...(await withCreationSpells(form)), raceSpellIds: [spellId("Fire Bolt")] });

    const rows = await readRows(persId, "ELF_HIGH_2014");
    expect(names(rows)).toEqual(["Fire Bolt"]);
    expect(rows[0]).toMatchObject({ origin: SpellOrigin.RACE, badgeText: "Високий ельф", excludeFromKnownCount: true, learnedAtLevel: 1 });
  });

  it("Високий ельф без замовляння або з заклинанням 1-го рівня не створюється; лісовий ельф вибору не має", async () => {
    await signIn("o48-high-elf-refuse");
    const { form } = await buildForm({ race: Races.ELF_2014, subrace: Subraces.ELF_HIGH_2014, className: Classes.FIGHTER_2014 });
    const withSpells = await withCreationSpells(form);

    expect(await createCharacter({ ...withSpells, raceSpellIds: [] })).toEqual({ error: "Оберіть 1 замовляння: Замовляння вищого ельфа" });
    expect(await createCharacter({ ...withSpells, raceSpellIds: [spellId("Magic Missile")] })).toEqual({ error: "Обране заклинання не підходить: Замовляння вищого ельфа" });

    const wood = await subraceByName(Subraces.ELF_WOOD_2014);
    expect(await getCreationRaceSpellOffer(form.raceId, wood.subraceId, [], [])).toBeNull();
  });

  it("чарівник Високий ельф не бере расою замовляння, яке вже обрав класом", async () => {
    await signIn("o48-high-elf-wizard");
    const { form } = await buildForm({ race: Races.ELF_2014, subrace: Subraces.ELF_HIGH_2014, className: Classes.WIZARD_2014 });
    const withSpells = await withCreationSpells(form);
    const classCantrip = withSpells.classSpells!.cantripIds[0];

    expect(await createCharacter({ ...withSpells, raceSpellIds: [classCantrip] })).toEqual({ error: "Це заклинання у вас уже є — оберіть інше: Замовляння вищого ельфа" });
  });

  it("Астральний ельф обирає одне з трьох замовлянь Астрального вогню", async () => {
    const astral = await raceByName(Races.ASTRAL_ELF_SPELLJAMMER);
    const offer = await getCreationRaceSpellOffer(astral.raceId, null, [], []);
    expect(offer?.offer.picks[0].spells.map((spell) => spell.engName).sort()).toEqual(["Dancing Lights", "Light", "Sacred Flame"]);
  });

  it("Кобольд обирає замовляння чародія лише зі спадком Драконяче чаклунство", async () => {
    await signIn("o48-kobold");
    const kobold = await raceByName(Races.KOBOLD_MPMM);
    const legacies = await prisma.raceChoiceOption.findMany({ where: { raceId: kobold.raceId }, select: { optionId: true, optionName: true, choiceGroupName: true } });
    const sorcery = legacies.find((option) => option.optionName === "Драконяче чаклунство")!;
    const defiance = legacies.find((option) => option.optionName === "Непокора")!;

    expect(await getCreationRaceSpellOffer(kobold.raceId, null, [defiance.optionId], [])).toBeNull();
    const offer = await getCreationRaceSpellOffer(kobold.raceId, null, [sorcery.optionId], []);
    const offered = offer!.offer.picks[0].spells.map((spell) => spell.engName);
    expect(offered).toContain("Fire Bolt");
    expect(offered).not.toContain("Sacred Flame");

    const { form } = await buildForm({ race: Races.KOBOLD_MPMM, className: Classes.FIGHTER_2014, overrides: { raceChoiceSelections: { [sorcery.choiceGroupName]: sorcery.optionId } } });
    const persId = await createOrThrow({ ...(await withCreationSpells(form)), raceSpellIds: [spellId("Fire Bolt")] });
    expect(names(await readRows(persId, "KOBOLD_MPMM"))).toEqual(["Fire Bolt"]);
  });
});

describe("O48 — підвищення рівня 2014: риса підкласу на своєму рівні класу", () => {
  async function createAtLevel(input: { className: Classes; subclass: Subclasses; level: number }) {
    const { form, classId, subclassId } = await buildForm({ className: input.className, subclass: input.subclass });
    const persId = await createOrThrow(await withCreationSpells(form));
    await prisma.pers.update({ where: { persId }, data: { level: input.level } });
    return { persId, classId, subclassId: subclassId! };
  }

  it("друїд Кола землі на 2-му рівні обирає додаткове замовляння друїда", async () => {
    await signIn("o48-land-cantrip");
    const { persId, classId, subclassId } = await createAtLevel({ className: Classes.DRUID_2014, subclass: Subclasses.CIRCLE_OF_THE_LAND, level: 1 });

    const offer = await getLevelUpClassOptionSpellOffer(persId, [], { classId, subclassId });
    expect(offer?.label).toBe("Додаткове замовляння");

    const form = await withLevelUpSpells(persId, minimalLevelUpForm({ classId }));
    expect(await levelUpCharacter(persId, { ...form, classOptionSpellIds: [] })).toEqual({ error: "Оберіть 1 замовляння: Додаткове замовляння" });

    const result = await levelUpCharacter(persId, form);
    expect(result).not.toHaveProperty("error");
    const rows = await readRows(persId, "Circle of the Land: Bonus Cantrip (2014)");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ badgeText: "Додаткове замовляння", learnedAtLevel: 2, excludeFromKnownCount: true });
  });

  it("бард Колегії знань на 6-му рівні обирає два заклинання будь-якого класу до 3-го рівня", async () => {
    await signIn("o48-lore-secrets");
    const { persId, classId, subclassId } = await createAtLevel({ className: Classes.BARD_2014, subclass: Subclasses.COLLEGE_OF_LORE, level: 5 });

    const offer = await getLevelUpClassOptionSpellOffer(persId, [], { classId, subclassId });
    const levels = new Set(offer!.offer.picks[0].spells.map((spell) => spell.level));
    expect(Math.max(...levels)).toBe(3);

    const form = await withLevelUpSpells(persId, minimalLevelUpForm({ classId }));
    const result = await levelUpCharacter(persId, { ...form, classOptionSpellIds: [spellId("Fireball"), spellId("Guidance")] });
    expect(result).not.toHaveProperty("error");
    expect(names(await readRows(persId, "College of Lore: Additional Magical Secrets (2014)"))).toEqual(["Fireball", "Guidance"]);
  });

  it("на 5-му рівні Колегії знань і 4-му Містичного лучника вибору немає, на 3-му лучника — Штукарство або Ремесло друїдів", async () => {
    await signIn("o48-no-choice-levels");
    const bard = await createAtLevel({ className: Classes.BARD_2014, subclass: Subclasses.COLLEGE_OF_LORE, level: 4 });
    expect(await getLevelUpClassOptionSpellOffer(bard.persId, [], { classId: bard.classId, subclassId: bard.subclassId })).toBeNull();

    const archer = await createAtLevel({ className: Classes.FIGHTER_2014, subclass: Subclasses.ARCANE_ARCHER, level: 2 });
    const offer = await getLevelUpClassOptionSpellOffer(archer.persId, [], { classId: archer.classId, subclassId: archer.subclassId });
    expect(offer?.offer.picks[0].spells.map((spell) => spell.engName).sort()).toEqual(["Druidcraft", "Prestidigitation"]);

    await prisma.pers.update({ where: { persId: archer.persId }, data: { level: 3 } });
    expect(await getLevelUpClassOptionSpellOffer(archer.persId, [], { classId: archer.classId, subclassId: archer.subclassId })).toBeNull();
  });
});

describe("KR48.7 — персонаж 2014, що пройшов рівень вибору до KR48.6, обирає на підвищенні", () => {
  async function createHighElfWithoutChoice() {
    const { form, classId } = await buildForm({ race: Races.ELF_2014, subrace: Subraces.ELF_HIGH_2014, className: Classes.FIGHTER_2014 });
    const persId = await createOrThrow(await withCreationSpells(form));
    await prisma.persSpell.deleteMany({ where: { persId, sourceName: "ELF_HIGH_2014" } });
    return { persId, classId };
  }

  it("Високий ельф без замовляння рівня не отримує, доки не обере; обране — рядок раси, і вдруге не питають", async () => {
    await signIn("o48-catch-up-elf");
    const { persId, classId } = await createHighElfWithoutChoice();

    const [offer] = await loadCatchUpSpellOffers(prisma, persId);
    expect(offer).toMatchObject({ sourceName: "ELF_HIGH_2014", label: "Замовляння вищого ельфа", preselectedSpellIds: [] });

    const form = minimalLevelUpForm({ classId });
    expect(await levelUpCharacter(persId, { ...form, catchUpSpellSelections: {} })).toEqual({ error: "Оберіть 1 замовляння: Замовляння вищого ельфа" });

    const result = await levelUpCharacter(persId, { ...form, catchUpSpellSelections: { ELF_HIGH_2014: [spellId("Fire Bolt")] } });
    expect(result).not.toHaveProperty("error");
    const rows = await readRows(persId, "ELF_HIGH_2014");
    expect(names(rows)).toEqual(["Fire Bolt"]);
    expect(rows[0]).toMatchObject({ origin: SpellOrigin.RACE, badgeText: "Високий ельф", learnedAtLevel: 2 });

    expect(await loadCatchUpSpellOffers(prisma, persId)).toEqual([]);
  });

  it("замовляння, додане руками, позначене наперед і переходить до раси, а не дублюється", async () => {
    await signIn("o48-catch-up-adopt");
    const { persId, classId } = await createHighElfWithoutChoice();
    await prisma.persSpell.create({ data: { persId, spellId: spellId("Fire Bolt"), learnedAtLevel: 1, origin: SpellOrigin.MANUAL } });

    const [offer] = await loadCatchUpSpellOffers(prisma, persId);
    expect(offer.preselectedSpellIds).toEqual([spellId("Fire Bolt")]);

    const result = await levelUpCharacter(persId, { ...minimalLevelUpForm({ classId }), catchUpSpellSelections: { ELF_HIGH_2014: offer.preselectedSpellIds } });
    expect(result).not.toHaveProperty("error");
    const rows = await readRows(persId, "ELF_HIGH_2014");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ origin: SpellOrigin.RACE, learnedAtLevel: 1, excludeFromKnownCount: true });
    expect(await prisma.persSpell.count({ where: { persId, spellId: spellId("Fire Bolt") } })).toBe(1);
  });

  it("клірик природи 3-го рівня без замовляння друїда обирає його на 4-му", async () => {
    await signIn("o48-catch-up-nature");
    const { form, classId } = await buildForm({ className: Classes.CLERIC_2014, subclass: Subclasses.NATURE_DOMAIN });
    const persId = await createOrThrow(await withCreationSpells(form));
    await prisma.persSpell.deleteMany({ where: { persId, sourceName: "Nature Domain: Acolyte of Nature (2014)" } });
    await prisma.pers.update({ where: { persId }, data: { level: 3 } });

    const offers = await loadCatchUpSpellOffers(prisma, persId);
    expect(offers.map((offer) => offer.label)).toEqual(["Послідовник природи"]);

    const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, minimalLevelUpForm({ classId })));
    expect(result).not.toHaveProperty("error");
    expect(await readRows(persId, "Nature Domain: Acolyte of Nature (2014)")).toHaveLength(1);
  });

  it("людина-воїн і персонаж, що вже обрав у конструкторі, пропозиції не мають", async () => {
    await signIn("o48-catch-up-none");
    const human = await buildForm({ className: Classes.FIGHTER_2014 });
    const elf = await buildForm({ race: Races.ELF_2014, subrace: Subraces.ELF_HIGH_2014, className: Classes.FIGHTER_2014 });

    expect(await loadCatchUpSpellOffers(prisma, await createOrThrow(await withCreationSpells(human.form)))).toEqual([]);
    expect(await loadCatchUpSpellOffers(prisma, await createOrThrow(await withCreationSpells(elf.form)))).toEqual([]);
  });
});
