import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
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
import { getLevelUpFeatSpellGrowthOffer, getLevelUpFeatSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";
import { loadPersSpellcastingSources } from "@/server/db/spell-sources";

vi.setConfig({ testTimeout: 180_000 });

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

async function findRitualCaster(ability: "INT" | "WIS" | "CHA") {
  const feat = await prisma.feat.findFirstOrThrow({ where: { ruleset: "RULES_2024", name: "RITUAL_CASTER" }, select: { featId: true } });
  const link = await prisma.featChoiceOption.findFirstOrThrow({
    where: { featId: feat.featId, choiceOption: { effectKind: "ASI", effectAbility: ability } },
    select: { choiceOption: { select: { choiceOptionId: true, groupName: true } } },
  });
  return { featId: feat.featId, featChoiceSelections: { [link.choiceOption.groupName]: link.choiceOption.choiceOptionId } };
}

async function createClericAtLevelThree() {
  const [race, cleric, sage] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2024 } }),
    prisma.class.findFirstOrThrow({ where: { name: Classes.CLERIC_2024 } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SAGE_2024 } }),
  ]);
  const form = minimalForm({
    name: "Ритуалістка",
    raceId: race.raceId,
    classId: cleric.classId,
    backgroundId: sage.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "WIS", plusOne: "INT" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    classChoiceSelections: await findRequiredClassChoices2024(cleric.classId, 1),
  });
  const created = await createCharacter(await withCreationSpells(form, { cantrips: ["Guidance", "Sacred Flame", "Thaumaturgy"] }));
  if (!created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);

  const lifeDomain = await prisma.subclass.findFirstOrThrow({ where: { classId: cleric.classId, name: "LIFE_DOMAIN" } });
  for (const level of [2, 3]) {
    const levelUp = minimalLevelUpForm({ classId: cleric.classId, ...(level === 3 ? { subclassId: lifeDomain.subclassId } : {}) });
    expect(await levelUpCharacter(created.persId, await withLevelUpSpells(created.persId, levelUp)), `рівень ${level}`).not.toHaveProperty("error");
  }
  return { persId: created.persId, classId: cleric.classId };
}

async function readRitualCasterSpells(persId: number) {
  const rows = await prisma.persSpell.findMany({
    where: { persId, origin: "FEAT", sourceName: "RITUAL_CASTER" },
    select: { isPrepared: true, excludeFromPreparedCount: true, learnedAtLevel: true, spell: { select: { engName: true } } },
    orderBy: { spell: { engName: "asc" } },
  });
  return rows.map(({ spell, ...row }) => ({ engName: spell.engName, ...row }));
}

describe("KR31.5 — Ritual Caster 2024 дає ритуальні заклинання за бонусом майстерності (L03-feats-11)", () => {
  it("4-й рівень: два ритуали 1-го рівня, завжди підготовлені; 5-й — ще один; 6-й — нічого", async () => {
    await signIn("ritual-caster");
    const { persId, classId } = await createClericAtLevelThree();
    const ritualCaster = await findRitualCaster("WIS");

    const offer = await getLevelUpFeatSpellOffer(persId, ritualCaster.featId, Object.values(ritualCaster.featChoiceSelections));
    expect(offer?.picks.map((pick) => pick.count)).toEqual([2]);
    expect(offer?.picks[0].spells.every((spell) => spell.level === 1 && spell.isRitual)).toBe(true);

    const [findFamiliar, alarm, shield, identify] = await findSpellIds(["Find Familiar", "Alarm", "Shield", "Identify"]);
    const levelFour = await withLevelUpSpells(persId, minimalLevelUpForm({ classId, ...ritualCaster, featSpellIds: [findFamiliar, alarm] }));
    expect(await levelUpCharacter(persId, { ...levelFour, featSpellIds: [findFamiliar, shield] })).toEqual({ error: "Обране заклинання не підходить цій рисі" });
    expect(await levelUpCharacter(persId, { ...levelFour, featSpellIds: [findFamiliar] })).toEqual({ error: "Оберіть 2 заклинання риси" });
    expect(await levelUpCharacter(persId, levelFour)).not.toHaveProperty("error");

    const always = { isPrepared: true, excludeFromPreparedCount: true };
    expect(await readRitualCasterSpells(persId)).toEqual([
      { engName: "Alarm", learnedAtLevel: 4, ...always },
      { engName: "Find Familiar", learnedAtLevel: 4, ...always },
    ]);
    expect(await loadPersSpellcastingSources(persId)).toContainEqual(expect.objectContaining({ key: "RITUAL_CASTER", ability: "WIS", kind: "FEAT" }));

    const growth = await getLevelUpFeatSpellGrowthOffer(persId);
    expect(growth?.featName).toBe("RITUAL_CASTER");
    expect(growth?.offer.picks.map((pick) => pick.count)).toEqual([1]);
    expect(growth?.offer.picks[0].spells.map((spell) => spell.spellId)).not.toContain(alarm);

    const levelFive = await withLevelUpSpells(persId, minimalLevelUpForm({ classId, featGrowthSpellIds: [identify] }));
    expect(await levelUpCharacter(persId, { ...levelFive, featGrowthSpellIds: [] })).toEqual({ error: "Оберіть 1 заклинання риси" });
    expect(await levelUpCharacter(persId, { ...levelFive, featGrowthSpellIds: [alarm] })).toEqual({ error: "Це заклинання вже дає інше джерело — оберіть інше" });
    expect(await levelUpCharacter(persId, levelFive)).not.toHaveProperty("error");
    expect((await readRitualCasterSpells(persId)).map((row) => `${row.engName}@${row.learnedAtLevel}`)).toEqual(["Alarm@4", "Find Familiar@4", "Identify@5"]);

    expect(await getLevelUpFeatSpellGrowthOffer(persId)).toBeNull();
  });
});
