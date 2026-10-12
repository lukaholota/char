import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
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
}

async function createWizardKnowing(cantrips: string[]) {
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.WIZARD_2014), backgroundByName(BackgroundCategory.SAGE)]);
  const base = await withCreationSpells(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
  const cantripRows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014", engName: { in: cantrips } }, select: { spellId: true } });
  const form = { ...base, classSpells: { cantripIds: cantripRows.map((row) => row.spellId), preparedIds: base.classSpells?.preparedIds ?? [], spellbookIds: base.classSpells?.spellbookIds ?? [] } };
  const created = await createCharacter(form);
  if ("error" in created) throw new Error(created.error);
  const school = await subclassByName(characterClass.classId, Subclasses.SCHOOL_OF_ILLUSION);
  return { persId: created.persId, classId: characterClass.classId, subclassId: school.subclassId };
}

async function readSpellRows(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId },
    select: { origin: true, sourceName: true, badgeText: true, learnedAtLevel: true, excludeFromKnownCount: true, spell: { select: { engName: true, level: true } } },
  });
  return rows.map((row) => ({ name: row.spell.engName, level: row.spell.level, origin: row.origin, sourceName: row.sourceName, badge: row.badgeText, learnedAtLevel: row.learnedAtLevel, free: row.excludeFromKnownCount }));
}

describe("Школа ілюзії (Удосконалена Мала ілюзія) — Р53: підклас забирає Малу ілюзію, яку Чарівник уже тримав", () => {
  it("Мала ілюзія класу на 2-му рівні стає рядком підкласу поза лімітом, інші замовляння лишаються класу", async () => {
    await signIn("illusion-savant-adopt");
    const { persId, classId, subclassId } = await createWizardKnowing(["Fire Bolt", "Mage Hand", "Minor Illusion"]);
    const offer = await getLevelUpSpellOffer(persId, classId, subclassId, []);
    const spellbookIds = offer!.spells.slice(0, 2).map((spell) => spell.spellId);

    const result = await levelUpCharacter(persId, minimalLevelUpForm({ classId, subclassId, classSpells: { cantripIds: [], preparedIds: [], spellbookIds } }));
    expect(result).not.toHaveProperty("error");

    const cantrips = (await readSpellRows(persId)).filter((row) => row.level === 0);
    expect(cantrips).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Minor Illusion", sourceName: "SCHOOL_OF_ILLUSION", badge: "Школа ілюзії", learnedAtLevel: 1, free: true }),
      expect.objectContaining({ name: "Fire Bolt", sourceName: "WIZARD_2014", free: false }),
      expect.objectContaining({ name: "Mage Hand", sourceName: "WIZARD_2014", free: false }),
    ]));
    expect(cantrips).toHaveLength(3);
  });

  it("звільнене місце серед відомих замовлянь з'являється як одне замовляння на добір під час наступного підвищення", async () => {
    await signIn("illusion-savant-freed-slot");
    const { persId, classId, subclassId } = await createWizardKnowing(["Fire Bolt", "Mage Hand", "Minor Illusion"]);
    const offerAtLevel2 = await getLevelUpSpellOffer(persId, classId, subclassId, []);
    expect(offerAtLevel2!.catchUp.cantrips).toBe(0);
    const spellbookIds = offerAtLevel2!.spells.slice(0, 2).map((spell) => spell.spellId);
    await levelUpCharacter(persId, minimalLevelUpForm({ classId, subclassId, classSpells: { cantripIds: [], preparedIds: [], spellbookIds } }));

    const offerAtLevel3 = await getLevelUpSpellOffer(persId, classId, subclassId, []);
    expect(offerAtLevel3!.quota.cantrips).toBe(0);
    expect(offerAtLevel3!.catchUp.cantrips).toBe(1);
  });

  it("Чарівник, що Малу ілюзію не знав, отримує її від підкласу окремим рядком, а три замовляння класу лишаються його", async () => {
    await signIn("illusion-savant-new");
    const { persId, classId, subclassId } = await createWizardKnowing(["Fire Bolt", "Mage Hand", "Light"]);
    const offer = await getLevelUpSpellOffer(persId, classId, subclassId, []);
    const spellbookIds = offer!.spells.slice(0, 2).map((spell) => spell.spellId);
    const result = await levelUpCharacter(persId, minimalLevelUpForm({ classId, subclassId, classSpells: { cantripIds: [], preparedIds: [], spellbookIds } }));
    expect(result).not.toHaveProperty("error");

    const cantrips = (await readSpellRows(persId)).filter((row) => row.level === 0);
    expect(cantrips.map((row) => `${row.name}:${row.sourceName}:${row.free}`).sort()).toEqual([
      "Fire Bolt:WIZARD_2014:false", "Light:WIZARD_2014:false", "Mage Hand:WIZARD_2014:false", "Minor Illusion:SCHOOL_OF_ILLUSION:true",
    ]);
  });
});
