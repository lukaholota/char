import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, classChoiceOptionIdsAtLevel, raceByName, subclassByName, subclassChoiceOptionIdsAtLevel } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";
import { getCreationSpellOffer } from "@/lib/actions/class-actions";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

/** Як персонажі 2014 на проді, створені до кроку заклинань у конструкторі: лист без жодного заклинання. */
async function createCaster2014(
  className: Classes,
  subclassName?: Subclasses,
  subclassChoiceSelections: Record<string, number> = {},
): Promise<{ persId: number; classId: number }> {
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(className), backgroundByName(BackgroundCategory.SOLDIER)]);
  const subclassId = subclassName ? (await subclassByName(characterClass.classId, subclassName)).subclassId : undefined;
  const created = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId, subclassId, subclassChoiceSelections })));
  if ("error" in created) throw new Error(`не створився: ${created.error}`);
  await prisma.persSpell.deleteMany({ where: { persId: created.persId } });
  return { persId: created.persId, classId: characterClass.classId };
}

async function readClassRows(persId: number) {
  return prisma.persSpell.findMany({
    where: { persId },
    select: { spellId: true, origin: true, badgeText: true, isPrepared: true, learnedAtLevel: true, spell: { select: { level: true } } },
  });
}

const ids = (spells: { spellId: number }[], count: number) => spells.slice(0, count).map((spell) => spell.spellId);

describe("заклинання на підвищенні рівня 2014 — прибавка обовʼязкова, решта до таблиці за бажанням", () => {
  it("бард 1 → 2 без заклинань на листі: одне нове обовʼязкове, ще чотири й два замовляння — за бажанням", async () => {
    await signIn("levelup-2014-bard");
    const { persId, classId } = await createCaster2014(Classes.BARD_2014);
    const offer = await getLevelUpSpellOffer(persId, classId, null, []);

    expect(offer).toMatchObject({
      ruleset: "RULES_2014",
      classLabel: "Бард",
      quota: { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 1 },
      catchUp: { cantrips: 2, prepared: 4, spellbook: 0 },
      canSkipPrepared: false,
    });
    expect(offer!.spells.every((spell) => spell.level === 1 && spell.spellLists?.includes("Бард"))).toBe(true);

    const form = (classSpells?: { cantripIds: number[]; preparedIds: number[] }) =>
      minimalLevelUpForm({ classId, ...(classSpells ? { classSpells: { ...classSpells, spellbookIds: [] } } : {}) });
    expect(await levelUpCharacter(persId, form())).toEqual({ error: "Оберіть нових заклинань: щонайменше 1" });
    expect(await levelUpCharacter(persId, form({ cantripIds: [], preparedIds: ids(offer!.spells, 6) }))).toEqual({ error: "Оберіть нових заклинань: не більше 5" });
    expect((await prisma.pers.findUniqueOrThrow({ where: { persId } })).level).toBe(1);

    expect(await levelUpCharacter(persId, form({ cantripIds: ids(offer!.cantrips, 2), preparedIds: ids(offer!.spells, 3) }))).not.toHaveProperty("error");
    const rows = await readClassRows(persId);
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.origin === SpellOrigin.CLASS && row.badgeText === "Бард" && row.isPrepared && row.learnedAtLevel === 2)).toBe(true);
  });

  it("заклинання, додане на листі без бейджа, зараховується до норми й може бути замінене", async () => {
    await signIn("levelup-2014-manual");
    const { persId, classId } = await createCaster2014(Classes.BARD_2014);
    const empty = await getLevelUpSpellOffer(persId, classId, null, []);
    const manual = empty!.spells[0];
    const foreign = await prisma.spell.findFirstOrThrow({
      where: { ruleset: "RULES_2014", level: 1, spellClasses: { some: { className: "Клірик" } }, NOT: { spellClasses: { some: { className: "Бард" } } } },
    });
    await prisma.persSpell.createMany({
      data: [manual.spellId, foreign.spellId].map((spellId) => ({ persId, spellId, learnedAtLevel: 1, origin: SpellOrigin.MANUAL })),
    });

    const offer = await getLevelUpSpellOffer(persId, classId, null, []);
    expect(offer?.catchUp.prepared).toBe(3);
    expect(offer?.swap?.droppableSpells.map((spell) => spell.spellId)).toEqual([manual.spellId]);
    expect(offer?.spells.some((spell) => spell.spellId === manual.spellId)).toBe(false);

    const [added, replacement] = ids(offer!.spells, 2);
    const result = await levelUpCharacter(
      persId,
      minimalLevelUpForm({ classId, classSpells: { cantripIds: [], spellbookIds: [], preparedIds: [added], preparedSwap: { dropId: manual.spellId, addId: replacement } } }),
    );

    expect(result).not.toHaveProperty("error");
    const spellIds = (await readClassRows(persId)).map((row) => row.spellId).sort((a, b) => a - b);
    expect(spellIds).toEqual([added, replacement, foreign.spellId].sort((a, b) => a - b));
  });

  it("чарівник 1 → 2: два заклинання до книги обовʼязково й не підготовленими; воїн кроку не має", async () => {
    await signIn("levelup-2014-wizard");
    const { persId, classId } = await createCaster2014(Classes.WIZARD_2014);
    const tradition = await prisma.subclass.findFirstOrThrow({ where: { classId }, select: { subclassId: true } });
    const offer = await getLevelUpSpellOffer(persId, classId, tradition.subclassId, []);

    expect(offer).toMatchObject({ quota: { cantrips: 0, prepared: 0, spellbook: 2, maxSpellLevel: 1 }, catchUp: { cantrips: 3, prepared: 0, spellbook: 6 } });
    const form = (spellbookIds: number[]) => minimalLevelUpForm({ classId, subclassId: tradition.subclassId, classSpells: { cantripIds: [], preparedIds: [], spellbookIds } });
    expect(await levelUpCharacter(persId, form(ids(offer!.spells, 1)))).toEqual({ error: "Оберіть заклинань до книги: щонайменше 2" });
    expect(await levelUpCharacter(persId, form(ids(offer!.spells, 2)))).not.toHaveProperty("error");
    expect((await readClassRows(persId)).map((row) => row.isPrepared)).toEqual([false, false]);

    const fighter = await createCaster2014(Classes.FIGHTER_2014);
    expect(await getLevelUpSpellOffer(fighter.persId, fighter.classId, null, [])).toBeNull();
  });
});

async function levelUpOrThrow(persId: number, form: ReturnType<typeof minimalLevelUpForm>) {
  const result = await levelUpCharacter(persId, form);
  if (result && "error" in result) throw new Error(result.error);
}

describe("третинні підкласи 2014 — список чарівника, школи підкласу, Магічна рука спритника", () => {
  it("воїн 2 → 3 Потойбічний лицар: два замовляння й три заклинання, поза Захистом і Втіленням — лише одне; на 4-му — лише свої школи", async () => {
    await signIn("levelup-2014-eldritch-knight");
    const { persId, classId } = await createCaster2014(Classes.FIGHTER_2014);
    await levelUpOrThrow(persId, minimalLevelUpForm({ classId }));
    const eldritchKnight = await subclassByName(classId, Subclasses.ELDRITCH_KNIGHT);

    expect(await getLevelUpSpellOffer(persId, classId, null, [])).toBeNull();
    const offer = await getLevelUpSpellOffer(persId, classId, eldritchKnight.subclassId, []);
    expect(offer).toMatchObject({
      classLabel: "Воїн",
      quota: { cantrips: 2, prepared: 3, spellbook: 0, maxSpellLevel: 1 },
      catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
      schoolLimit: { schools: ["ABJURATION", "EVOCATION"], outsideAllowed: 1 },
      spellListNote: "зі списку чарівника (Потойбічний лицар)",
    });
    expect(offer!.spells.every((spell) => spell.level === 1 && spell.spellLists?.includes("Чарівник"))).toBe(true);
    expect(offer!.cantrips.every((spell) => spell.spellLists?.includes("Чарівник"))).toBe(true);

    const inside = offer!.spells.filter((spell) => spell.school === "ABJURATION" || spell.school === "EVOCATION");
    const outside = offer!.spells.filter((spell) => spell.school !== "ABJURATION" && spell.school !== "EVOCATION");
    expect(outside.length).toBeGreaterThan(1);
    const form = (preparedIds: number[]) =>
      minimalLevelUpForm({ classId, subclassId: eldritchKnight.subclassId, classSpells: { cantripIds: ids(offer!.cantrips, 2), preparedIds, spellbookIds: [] } });

    expect(await levelUpCharacter(persId, form([...ids(outside, 2), ...ids(inside, 1)]))).toEqual({ error: "Поза школами «Захист» і «Втілення» можна взяти не більше 1" });
    expect(await levelUpCharacter(persId, form([...ids(outside, 1), ...ids(inside, 2)]))).not.toHaveProperty("error");

    const rows = await readClassRows(persId);
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.origin === SpellOrigin.CLASS && row.badgeText === "Воїн" && row.learnedAtLevel === 3)).toBe(true);

    const next = await getLevelUpSpellOffer(persId, classId, eldritchKnight.subclassId, []);
    expect(next).toMatchObject({ quota: { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 1 }, schoolLimit: { outsideAllowed: 0 } });
    expect(next!.spells.every((spell) => spell.school === "ABJURATION" || spell.school === "EVOCATION")).toBe(true);
    expect(next!.swap?.droppableSpells.map((spell) => spell.spellId).sort((a, b) => a - b)).toEqual(rows.filter((row) => row.spell.level > 0).map((row) => row.spellId).sort((a, b) => a - b));
  });

  it("пройдисвіт 2 → 3 Містичний спритник: Магічна рука приходить сама від підкласу, а не з вибору", async () => {
    await signIn("levelup-2014-arcane-trickster");
    const { persId, classId } = await createCaster2014(Classes.ROGUE_2014);
    await levelUpOrThrow(persId, minimalLevelUpForm({ classId }));
    const arcaneTrickster = await subclassByName(classId, Subclasses.ARCANE_TRICKSTER);

    const offer = await getLevelUpSpellOffer(persId, classId, arcaneTrickster.subclassId, []);
    expect(offer).toMatchObject({ quota: { cantrips: 2, prepared: 3, spellbook: 0, maxSpellLevel: 1 }, schoolLimit: { schools: ["ENCHANTMENT", "ILLUSION"], outsideAllowed: 1 } });
    expect(offer!.cantrips.some((spell) => spell.engName === "Mage Hand")).toBe(false);

    const inside = offer!.spells.filter((spell) => spell.school === "ENCHANTMENT" || spell.school === "ILLUSION");
    await levelUpOrThrow(
      persId,
      minimalLevelUpForm({ classId, subclassId: arcaneTrickster.subclassId, classSpells: { cantripIds: ids(offer!.cantrips, 2), preparedIds: ids(inside, 3), spellbookIds: [] } }),
    );

    const mageHand = await prisma.persSpell.findFirst({ where: { persId, spell: { engName: "Mage Hand", ruleset: "RULES_2014" } }, select: { badgeText: true, excludeFromPreparedCount: true } });
    expect(mageHand).toEqual({ badgeText: "Містичний спритник", excludeFromPreparedCount: true });
    expect(await readClassRows(persId)).toHaveLength(6);
  });

  it("чорнокнижник Відьмацького клинка 1 → 2: Щит зі списку покровителя в пропозиції, а доданий руками — зарахований", async () => {
    await signIn("levelup-2014-hexblade");
    const { persId, classId } = await createCaster2014(Classes.WARLOCK_2014, Subclasses.HEXBLADE);
    const hexblade = await subclassByName(classId, Subclasses.HEXBLADE);

    const offer = await getLevelUpSpellOffer(persId, classId, hexblade.subclassId, []);
    expect(offer?.spellListNote).toBe("зі свого списку й розширеного списку покровителя «Відьмацький клинок»");
    const shield = offer!.spells.find((spell) => spell.engName === "Shield");
    expect(shield?.spellLists).toContain("Відьмацький клинок");
    expect(offer!.spells.some((spell) => spell.engName === "Wrathful Smite")).toBe(true);
    expect(offer!.spells.every((spell) => spell.spellLists?.some((list) => list === "Чорнокнижник" || list === "Відьмацький клинок"))).toBe(true);

    await prisma.persSpell.create({ data: { persId, spellId: shield!.spellId, learnedAtLevel: 1, origin: SpellOrigin.MANUAL } });
    const counted = await getLevelUpSpellOffer(persId, classId, hexblade.subclassId, []);
    expect(counted!.catchUp.prepared).toBe(offer!.catchUp.prepared - 1);
    expect(counted!.swap?.droppableSpells.map((spell) => spell.spellId)).toEqual([shield!.spellId]);
  });
});

describe("рід Джина 2014 — вибір підкласу на 1-му рівні звужує розширений список", () => {
  it("джин без роду бачить усі 26 (як персонажі до вибору), дао — спільні й лише свої", async () => {
    await signIn("levelup-2014-genie");
    const noKind = await createCaster2014(Classes.WARLOCK_2014, Subclasses.THE_GENIE);
    const genie = await subclassByName(noKind.classId, Subclasses.THE_GENIE);
    const [dao] = await subclassChoiceOptionIdsAtLevel(genie.subclassId, 1, (option) => option.optionNameEng === "Genie Kind: Dao");
    expect(dao).toBeDefined();

    const all = await getLevelUpSpellOffer(noKind.persId, noKind.classId, genie.subclassId, []);
    const names = (offer: NonNullable<typeof all>) => offer.spells.map((spell) => spell.engName);
    expect(names(all!)).toEqual(expect.arrayContaining(["Sanctuary", "Thunderwave", "Burning Hands", "Fog Cloud", "Detect Evil and Good"]));

    const withKind = await createCaster2014(Classes.WARLOCK_2014, Subclasses.THE_GENIE, { "Рід джина": dao });
    const chosen = await prisma.pers.findUniqueOrThrow({ where: { persId: withKind.persId }, select: { choiceOptions: { select: { optionNameEng: true } } } });
    expect(chosen.choiceOptions.map((option) => option.optionNameEng)).toContain("Genie Kind: Dao");

    const daoOffer = await getLevelUpSpellOffer(withKind.persId, withKind.classId, genie.subclassId, []);
    expect(names(daoOffer!)).toEqual(expect.arrayContaining(["Sanctuary", "Detect Evil and Good"]));
    expect(names(daoOffer!)).not.toEqual(expect.arrayContaining(["Thunderwave"]));
    expect(names(daoOffer!).filter((name) => ["Burning Hands", "Fog Cloud"].includes(name))).toEqual([]);

    const thunderwave = all!.spells.find((spell) => spell.engName === "Thunderwave")!;
    const invocations = await classChoiceOptionIdsAtLevel(withKind.classId, 2, (option) => ["Agonizing Blast", "Armor of Shadows"].includes(option.optionNameEng));
    const result = await levelUpCharacter(
      withKind.persId,
      minimalLevelUpForm({
        classId: withKind.classId,
        classChoiceSelections: { "Потойбічні виклики": invocations },
        classSpells: { cantripIds: [], spellbookIds: [], preparedIds: [thunderwave.spellId] },
      }),
    );
    expect(result).toEqual({ error: "Обране заклинання не з вашого списку класу або зависокого рівня" });
  });
});

describe("дунамантія 2014 — лише Школі хронургії й Школі гравітургії, не будь-якому чарівнику", () => {
  const namesOf = (spells: { engName: string }[]) => new Set(spells.map((spell) => spell.engName));

  it("чарівник 1 → 2: хронург бачить свої, гравітург — свої, евокер і конструктор — жодного", async () => {
    await signIn("levelup-2014-dunamancy");
    const { persId, classId } = await createCaster2014(Classes.WIZARD_2014);
    const offerFor = async (school: Subclasses) => {
      const offer = await getLevelUpSpellOffer(persId, classId, (await subclassByName(classId, school)).subclassId, []);
      return { cantrips: namesOf(offer!.cantrips), spells: namesOf(offer!.spells), note: offer!.spellListNote };
    };

    const chronurgy = await offerFor(Subclasses.SCHOOL_OF_CHRONURGY);
    expect(chronurgy.cantrips.has("Sapping Sting")).toBe(true);
    expect(chronurgy.spells.has("Gift of Alacrity")).toBe(true);
    expect(chronurgy.spells.has("Magnify Gravity")).toBe(false);
    expect(chronurgy.note).toBe("зі свого списку й заклинань дунамантії («Школа хронургії»)");

    const graviturgy = await offerFor(Subclasses.SCHOOL_OF_GRAVITURGY);
    expect(graviturgy.spells.has("Magnify Gravity")).toBe(true);
    expect(graviturgy.spells.has("Gift of Alacrity")).toBe(false);

    const evocation = await offerFor(Subclasses.SCHOOL_OF_EVOCATION);
    expect(evocation.cantrips.has("Sapping Sting")).toBe(false);
    expect([...evocation.spells].filter((name) => ["Gift of Alacrity", "Magnify Gravity"].includes(name))).toEqual([]);

    const creation = await getCreationSpellOffer(classId, []);
    expect(creation?.cantrips.some((spell) => spell.engName === "Sapping Sting")).toBe(false);
  });
});
