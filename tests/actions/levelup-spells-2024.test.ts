import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { findRequiredClassChoices2024 } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  return user;
}

async function createCaster(className: Classes): Promise<{ persId: number; classId: number }> {
  const [race, characterClass, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2024 } }),
    prisma.class.findFirstOrThrow({ where: { name: className } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SAGE_2024 } }),
  ]);
  const form = minimalForm({
    name: `Підвищення ${className}`,
    raceId: race.raceId,
    classId: characterClass.classId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "INT", plusOne: "WIS" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    classChoiceSelections: await findRequiredClassChoices2024(characterClass.classId, 1),
  });
  const created = await createCharacter(await withCreationSpells(form));
  if (!created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);
  return { persId: created.persId, classId: characterClass.classId };
}

async function countClassSpells(persId: number, badgeText: string) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, badgeText, excludeFromPreparedCount: false },
    select: { isPrepared: true, spell: { select: { level: true } } },
  });
  return {
    cantrips: rows.filter((row) => row.spell.level === 0).length,
    prepared: rows.filter((row) => row.spell.level > 0 && row.isPrepared).length,
    spellbook: rows.filter((row) => row.spell.level > 0).length,
  };
}

/** Науковець чарівника 2-го рівня — експертиза в навичці, якою вже володіє; Мудрець дає Тайнознавство. */
const SCHOLAR_EXPERTISE = { expertises: ["ARCANA"] };

describe("KR31.5 — заклинання на підвищенні рівня 2024 (L08-levelup-machine-11)", () => {
  it("чарівник 1 → 2 без вибору заклинань рівня не отримує", async () => {
    await signIn("levelup-spells-missing");
    const { persId, classId } = await createCaster(Classes.WIZARD_2024);

    expect(await levelUpCharacter(persId, minimalLevelUpForm({ classId, expertiseSchema: SCHOLAR_EXPERTISE }))).toEqual({ error: "Оберіть заклинань до книги: 2" });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId } })).level).toBe(1);
  });

  it("чарівник 1 → 2: +2 до книги, а готує заклинання, що вже лежало в книзі", async () => {
    await signIn("levelup-spells-wizard");
    const { persId, classId } = await createCaster(Classes.WIZARD_2024);
    const offer = await getLevelUpSpellOffer(persId, classId, null, []);

    expect(offer?.quota).toEqual({ cantrips: 0, prepared: 1, spellbook: 2, maxSpellLevel: 1 });
    expect(offer?.bookSpells).toHaveLength(2);

    const unpreparedInBook = offer!.bookSpells[0].spellId;
    const newBook = offer!.spells.slice(0, 2).map((spell) => spell.spellId);
    const result = await levelUpCharacter(
      persId,
      minimalLevelUpForm({ classId, expertiseSchema: SCHOLAR_EXPERTISE, classSpells: { cantripIds: [], spellbookIds: newBook, preparedIds: [unpreparedInBook] } }),
    );

    expect(result).not.toHaveProperty("error");
    expect(await countClassSpells(persId, "Чарівник")).toEqual({ cantrips: 3, prepared: 5, spellbook: 8 });
    const prepared = await prisma.persSpell.findFirstOrThrow({ where: { persId, spellId: unpreparedInBook } });
    expect(prepared.isPrepared).toBe(true);
  });

  it("клірик на кожному підвищенні доходить до норми таблиці: на 4-му — 4 замовляння й 7 підготовлених", async () => {
    await signIn("levelup-spells-cleric");
    const { persId, classId } = await createCaster(Classes.CLERIC_2024);
    const lifeDomain = await prisma.subclass.findFirstOrThrow({ where: { classId, name: "LIFE_DOMAIN" } });

    for (const level of [2, 3, 4]) {
      const form = minimalLevelUpForm({ classId, ...(level === 3 ? { subclassId: lifeDomain.subclassId } : {}) });
      const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, form));
      expect(result, `рівень ${level}`).not.toHaveProperty("error");
    }

    expect(await countClassSpells(persId, "Клірик")).toEqual({ cantrips: 4, prepared: 7, spellbook: 7 });
  });

  it("мультиклас у клірика дає список і числа клірика 1-го рівня, а не чарівника", async () => {
    await signIn("levelup-spells-multiclass");
    const { persId } = await createCaster(Classes.WIZARD_2024);
    const cleric = await prisma.class.findFirstOrThrow({ where: { name: Classes.CLERIC_2024 } });
    const order = await findRequiredClassChoices2024(cleric.classId, 1);

    const offer = await getLevelUpSpellOffer(persId, cleric.classId, null, Object.values(order).flat());

    expect(offer?.classLabel).toBe("Клірик");
    expect(offer?.quota).toEqual({ cantrips: 3, prepared: 4, spellbook: 0, maxSpellLevel: 1 });
    expect(offer?.spells.every((spell) => spell.spellLists?.includes("Клірик"))).toBe(true);
  });

  it("чужий персонаж списку заклинань не віддає", async () => {
    await signIn("levelup-spells-owner");
    const { persId, classId } = await createCaster(Classes.WIZARD_2024);
    await signIn("levelup-spells-stranger");

    expect(await getLevelUpSpellOffer(persId, classId, null, [])).toBeNull();
  });

  it("чародій 1 → 2 міняє одне замовляння й одне підготовлене; чуже прибрати не можна (L08-levelup-machine-11)", async () => {
    await signIn("levelup-spells-swap");
    const { persId, classId } = await createCaster(Classes.SORCERER_2024);
    const offer = await getLevelUpSpellOffer(persId, classId, null, []);
    const before = await countClassSpells(persId, "Чародій");
    const [dropCantrip] = offer!.swap!.droppableCantrips;
    const [dropSpell] = offer!.swap!.droppableSpells;
    const addCantrip = offer!.cantrips[0];

    const form = await withLevelUpSpells(persId, minimalLevelUpForm({ classId, classChoiceSelections: await findRequiredClassChoices2024(classId, 2) }));
    const addSpell = offer!.spells.find((spell) => !form.classSpells!.preparedIds.includes(spell.spellId))!;
    const swapped = {
      ...form,
      classSpells: {
        ...form.classSpells!,
        cantripSwap: { dropId: dropCantrip.spellId, addId: addCantrip.spellId },
        preparedSwap: { dropId: dropSpell.spellId, addId: addSpell.spellId },
      },
    };
    const foreignDrop = { ...swapped, classSpells: { ...swapped.classSpells, cantripSwap: { dropId: addSpell.spellId, addId: addCantrip.spellId } } };
    expect(await levelUpCharacter(persId, foreignDrop)).toEqual({ error: "Замінити можна лише заклинання цього класу, обране гравцем" });

    const featCantrip = offer!.cantrips[1];
    const featRow = await prisma.persSpell.create({
      data: { persId, spellId: featCantrip.spellId, learnedAtLevel: 1, origin: SpellOrigin.FEAT, sourceName: "MAGIC_INITIATE", isPrepared: true, badgeText: "Посвячений у магію" },
    });
    const featDrop = { ...swapped, classSpells: { ...swapped.classSpells, cantripSwap: { dropId: featCantrip.spellId, addId: addCantrip.spellId } } };
    expect(await levelUpCharacter(persId, featDrop)).toEqual({ error: "Замінити можна лише заклинання цього класу, обране гравцем" });
    await prisma.persSpell.delete({ where: { persSpellId: featRow.persSpellId } });

    expect(await levelUpCharacter(persId, swapped)).not.toHaveProperty("error");
    const spellIds = (await prisma.persSpell.findMany({ where: { persId }, select: { spellId: true } })).map((row) => row.spellId);
    expect(spellIds).toEqual(expect.arrayContaining([addCantrip.spellId, addSpell.spellId]));
    expect(spellIds).not.toContain(dropCantrip.spellId);
    expect(spellIds).not.toContain(dropSpell.spellId);
    expect(await countClassSpells(persId, "Чародій")).toMatchObject({
      cantrips: before.cantrips + offer!.quota.cantrips,
      prepared: before.prepared + offer!.quota.prepared,
    });
  });

  it("клірик піднімає рівень без нових підготовлених — доготує на листі; чародій без них рівня не отримує", async () => {
    await signIn("levelup-spells-skip");
    const cleric = await createCaster(Classes.CLERIC_2024);
    const clericOffer = await getLevelUpSpellOffer(cleric.persId, cleric.classId, null, []);
    const before = await countClassSpells(cleric.persId, "Клірик");

    expect(clericOffer?.quota.prepared).toBeGreaterThan(0);
    expect(clericOffer?.canSkipPrepared).toBe(true);
    expect(await levelUpCharacter(cleric.persId, minimalLevelUpForm({ classId: cleric.classId }))).not.toHaveProperty("error");
    expect(await countClassSpells(cleric.persId, "Клірик")).toEqual(before);

    const sorcerer = await createCaster(Classes.SORCERER_2024);
    const sorcererForm = minimalLevelUpForm({ classId: sorcerer.classId, classChoiceSelections: await findRequiredClassChoices2024(sorcerer.classId, 2) });
    expect((await getLevelUpSpellOffer(sorcerer.persId, sorcerer.classId, null, []))?.canSkipPrepared).toBe(false);
    expect(await levelUpCharacter(sorcerer.persId, sorcererForm)).toEqual({ error: "Оберіть підготовлених заклинань: 2" });
  });

  it("клірик на підвищенні може замінити замовляння, але не підготовлене (L08-levelup-machine-11)", async () => {
    await signIn("levelup-spells-cleric-swap");
    const { persId, classId } = await createCaster(Classes.CLERIC_2024);
    const offer = await getLevelUpSpellOffer(persId, classId, null, []);

    expect(offer?.swap?.droppableCantrips.length).toBeGreaterThan(0);
    expect(offer?.swap?.droppableSpells).toEqual([]);
  });
});

