/**
 * Magical Discoveries 2024 — Магічні відкриття Колегії знань на 6-му рівні барда: два заклинання
 * зі списків клірика, друїда й чарівника до рівня слотів барда, завжди підготовані, поза лімітом.
 * Кейс — QA-персонаж №003 (Бард Знань 10). Механізм той самий, що в Книги тіней (O37).
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Skills, SpellOrigin, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm, type LevelUpFormData } from "../helpers/levelup-form";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpClassOptionSpellOffer, levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 180_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const SOURCE = "College of Lore: Magical Discoveries (2024)";

describe("Magical Discoveries 2024 — Магічні відкриття на підвищенні", () => {
  it("6-й рівень Колегії знань просить два заклинання чужих списків; без них рівня немає; 7-й уже нічого не просить", async () => {
    const user = await prisma.user.create({ data: { email: `lore-${Math.random()}@holota.family`, name: "lore" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
    const bard = await prisma.class.findFirstOrThrow({ where: { name: Classes.BARD_2024 } });
    const lore = await prisma.subclass.findFirstOrThrow({ where: { classId: bard.classId, name: Subclasses.COLLEGE_OF_LORE }, select: { subclassId: true } });
    const persId = await createBard(bard.classId);
    await raiseTo(persId, bard.classId, lore.subclassId, 4);

    expect(await getLevelUpClassOptionSpellOffer(persId, [], { classId: bard.classId, subclassId: null })).toBeNull();
    await levelUp(persId, minimalLevelUpForm({ classId: bard.classId }));

    const offer = await getLevelUpClassOptionSpellOffer(persId, [], { classId: bard.classId, subclassId: null });
    expect(offer?.label).toBe("Магічні відкриття");
    expect(offer?.offer.picks.map((pick) => [pick.count, pick.spellLevel, pick.maxSpellLevel])).toEqual([[2, 0, 3]]);
    const offered = offer!.offer.picks[0].spells.map((spell) => spell.engName);
    expect(offered).toEqual(expect.arrayContaining(["Guiding Bolt", "Fireball", "Sacred Flame", "Moonbeam"]));
    expect(offered).not.toContain("Vicious Mockery");
    expect(offered).not.toContain("Polymorph");
    const ownedShared = await prisma.persSpell.findFirstOrThrow({
      where: { persId, spell: { spellClasses: { some: { className: "Чарівник", ruleset: "RULES_2024" } } } },
      select: { spellId: true },
    });
    expect(offer!.offer.picks[0].spells.map((spell) => spell.spellId)).not.toContain(ownedShared.spellId);

    const [guidingBolt, fireball, polymorph, dispelMagic] = await findSpellIds(["Guiding Bolt", "Fireball", "Polymorph", "Dispel Magic"]);
    const levelSix = await withLevelUpSpells(persId, minimalLevelUpForm({ classId: bard.classId }));
    expect(levelSix.classOptionSpellIds).toHaveLength(2);

    expect(await levelUpCharacter(persId, { ...levelSix, classOptionSpellIds: [] })).toEqual({ error: "Оберіть 2 заклинання: Магічні відкриття" });
    expect(await levelUpCharacter(persId, { ...levelSix, classOptionSpellIds: [fireball, polymorph] })).toEqual({
      error: "Обране заклинання не підходить: Магічні відкриття",
    });
    expect(await levelUpCharacter(persId, { ...levelSix, classOptionSpellIds: [ownedShared.spellId, fireball] })).toEqual({
      error: "Це заклинання у вас уже є — оберіть інше: Магічні відкриття",
    });
    expect(
      await levelUpCharacter(persId, {
        ...levelSix,
        classOptionSpellIds: [fireball, dispelMagic],
        classSpells: { ...levelSix.classSpells!, preparedIds: [dispelMagic] },
      }),
    ).toEqual({ error: "Це заклинання вже дає інше джерело — оберіть інше" });
    expect(await levelUpCharacter(persId, { ...levelSix, classOptionSpellIds: [guidingBolt, fireball] })).toEqual({ success: true });

    const rows = await prisma.persSpell.findMany({
      where: { persId, sourceName: SOURCE },
      select: { origin: true, isPrepared: true, excludeFromPreparedCount: true, badgeText: true, learnedAtLevel: true, spell: { select: { engName: true } } },
    });
    expect(rows.map((row) => row.spell.engName).sort()).toEqual(["Fireball", "Guiding Bolt"]);
    expect(new Set(rows.map(({ spell: _spell, ...row }) => JSON.stringify(row)))).toEqual(
      new Set([JSON.stringify({ origin: SpellOrigin.CLASS, isPrepared: true, excludeFromPreparedCount: true, badgeText: "Магічні відкриття", learnedAtLevel: 6 })]),
    );

    expect(await getLevelUpClassOptionSpellOffer(persId, [], { classId: bard.classId, subclassId: null })).toBeNull();
    const levelSeven = await withLevelUpSpells(persId, minimalLevelUpForm({ classId: bard.classId }));
    expect(levelSeven.classOptionSpellIds).toBeUndefined();
    expect(await levelUpCharacter(persId, levelSeven)).toEqual({ success: true });
    expect(await prisma.persSpell.count({ where: { persId, sourceName: SOURCE } })).toBe(2);
  });
});

async function createBard(classId: number): Promise<number> {
  const [race, background] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2024 } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.ENTERTAINER_2024 } }),
  ]);
  const instruments = await prisma.classChoiceOption.findMany({
    where: { classId, levelsGranted: { has: 1 }, choiceOption: { optionNameEng: { in: ["FLUTE", "LUTE", "LYRE"].map((tool) => `Class Tool 2024 (BARD_2024: ${tool})`) } } },
    select: { choiceOptionId: true, choiceOption: { select: { groupName: true } } },
  });
  const form = minimalForm({
    name: "Бард Знань",
    raceId: race.raceId,
    classId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "CHA", plusOne: "DEX" },
    languagesSchema: { languages: ["DWARVISH", "GIANT"] },
    skills: [Skills.PERFORMANCE, Skills.PERSUASION, Skills.DECEPTION],
    classChoiceSelections: { [instruments[0].choiceOption.groupName]: instruments.map((row) => row.choiceOptionId) },
  });
  const created = await createCharacter(await withCreationSpells(form));
  if (!created.persId) throw new Error(`не створився: ${created.error}`);
  return created.persId;
}

async function raiseTo(persId: number, classId: number, subclassId: number, level: number) {
  const bonusProficiencies = await prisma.feature.findFirstOrThrow({ where: { engName: "College of Lore: Bonus Proficiencies (2024)" }, select: { featureId: true } });
  const byLevel: Record<number, Partial<LevelUpFormData>> = {
    2: { expertiseSchema: { expertises: [Skills.PERFORMANCE, Skills.PERSUASION] } },
    3: { subclassId, levelUpSkillSelections: { [String(bonusProficiencies.featureId)]: [Skills.ARCANA, Skills.HISTORY, Skills.INSIGHT] } },
    4: { customAsi: [{ ability: "CHA", value: 2 }] },
  };
  for (let next = 2; next <= level; next += 1) await levelUp(persId, minimalLevelUpForm({ classId, ...byLevel[next] }));
}

async function levelUp(persId: number, form: LevelUpFormData) {
  const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, form));
  if (!("success" in result)) throw new Error(`рівень не взявся: ${JSON.stringify(result)}`);
}

async function findSpellIds(engNames: string[]): Promise<number[]> {
  const spells = await prisma.spell.findMany({ where: { ruleset: "RULES_2024", engName: { in: engNames } }, select: { spellId: true, engName: true } });
  return engNames.map((engName) => spells.find((spell) => spell.engName === engName)!.spellId);
}
