import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SpellOrigin, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
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

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function buildForm(className: Classes, subclassName?: Subclasses) {
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(className), backgroundByName(BackgroundCategory.SOLDIER)]);
  const subclassId = subclassName ? (await subclassByName(characterClass.classId, subclassName)).subclassId : undefined;
  const form = (classSpells?: ClassSpellSelection) =>
    minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId, subclassId, ...(classSpells ? { classSpells } : {}) });
  return { form, classId: characterClass.classId, subclassId: subclassId ?? null };
}

async function readPersSpells(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId },
    select: { origin: true, isPrepared: true, badgeText: true, learnedAtLevel: true, spell: { select: { engName: true, level: true } } },
  });
  return rows.map(({ spell, ...row }) => ({ engName: spell.engName, level: spell.level, ...row }));
}

const ids = (spells: { spellId: number }[], count: number) => spells.slice(0, count).map((spell) => spell.spellId);

describe("заклинання в конструкторі 2014 — уся таблиця 1-го рівня обовʼязкова", () => {
  it("клірик обирає три замовляння: без них не створюється, з ними — рядки класу з бейджем", async () => {
    await signIn("creation-2014-cleric");
    const { form, classId, subclassId } = await buildForm(Classes.CLERIC_2014, Subclasses.LIFE_DOMAIN);
    const offer = await getCreationSpellOffer(classId, [], subclassId);

    expect(offer).toMatchObject({ ruleset: "RULES_2014", classLabel: "Клірик", quota: { cantrips: 3, prepared: 0, spellbook: 0, maxSpellLevel: 1 }, catchUp: { cantrips: 0, prepared: 0, spellbook: 0 }, swap: null });
    expect(offer!.cantrips.every((spell) => spell.level === 0 && spell.spellLists?.includes("Клірик"))).toBe(true);

    expect(await createCharacter(form())).toEqual({ error: "Оберіть замовлянь: 3" });
    expect(await createCharacter(form({ cantripIds: ids(offer!.cantrips, 4), preparedIds: [], spellbookIds: [] }))).toEqual({ error: "Оберіть замовлянь: 3" });

    const created = await createCharacter(form({ cantripIds: ids(offer!.cantrips, 3), preparedIds: [], spellbookIds: [] }));
    if (!("persId" in created) || !created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);
    const spells = await readPersSpells(created.persId);
    expect(spells).toHaveLength(3);
    expect(spells.every((spell) => spell.origin === SpellOrigin.CLASS && spell.badgeText === "Клірик" && spell.isPrepared && spell.learnedAtLevel === 1)).toBe(true);
  });

  it("чарівник: три замовляння й шість заклинань до книги, книга — не підготовлена", async () => {
    await signIn("creation-2014-wizard");
    const { form, classId } = await buildForm(Classes.WIZARD_2014);
    const offer = await getCreationSpellOffer(classId, []);
    expect(offer?.quota).toEqual({ cantrips: 3, prepared: 0, spellbook: 6, maxSpellLevel: 1 });

    const created = await createCharacter(form({ cantripIds: ids(offer!.cantrips, 3), preparedIds: [], spellbookIds: ids(offer!.spells, 6) }));
    if (!("persId" in created) || !created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);
    const spells = await readPersSpells(created.persId);
    expect(spells.filter((spell) => spell.level === 0 && spell.isPrepared)).toHaveLength(3);
    expect(spells.filter((spell) => spell.level === 1 && !spell.isPrepared && spell.badgeText === "Чарівник")).toHaveLength(6);
  });

  it("чорнокнижник Почвари бере й з розширеного списку покровителя", async () => {
    await signIn("creation-2014-fiend");
    const { form, classId, subclassId } = await buildForm(Classes.WARLOCK_2014, Subclasses.FIEND);
    const offer = await getCreationSpellOffer(classId, [], subclassId);
    const burningHands = offer?.spells.find((spell) => spell.engName === "Burning Hands");

    expect(offer?.quota).toEqual({ cantrips: 2, prepared: 2, spellbook: 0, maxSpellLevel: 1 });
    expect(burningHands).toBeDefined();
    expect(offer?.spellListNote).toBe("зі свого списку й розширеного списку патрона «Почвара»");

    const warlockSpell = offer!.spells.find((spell) => spell.spellLists?.includes("Чорнокнижник"))!;
    const created = await createCharacter(form({ cantripIds: ids(offer!.cantrips, 2), preparedIds: [burningHands!.spellId, warlockSpell.spellId], spellbookIds: [] }));
    if (!("persId" in created) || !created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);
    expect((await readPersSpells(created.persId)).map((spell) => spell.engName)).toContain("Burning Hands");
  });

  it("паладин 1-го рівня кроку не має й створюється без заклинань", async () => {
    await signIn("creation-2014-paladin");
    const { form, classId } = await buildForm(Classes.PALADIN_2014);
    expect(await getCreationSpellOffer(classId, [])).toBeNull();

    const created = await createCharacter(form());
    if (!("persId" in created) || !created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);
    expect(await readPersSpells(created.persId)).toEqual([]);
  });
});
