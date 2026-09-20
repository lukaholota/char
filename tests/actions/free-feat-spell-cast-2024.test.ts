import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, FeatureDisplayType, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { findRequiredClassChoices2024 } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getCharacterFeaturesGrouped, getPersById } from "@/lib/actions/pers";
import { spendFeatureUse } from "@/lib/actions/feature-uses";
import { setSpellPrepared } from "@/lib/actions/spell-actions";
import { collectFreeSpellCasts } from "@/lib/logic/free-feat-spell-casts";

vi.setConfig({ testTimeout: 120_000 });

afterAll(disconnectDatabase);

const MAGIC_INITIATE_FEATURE_NAME = "Посвячений у магію: список чарівника";

let persId = 0;

async function findSpellIds(engNames: string[]): Promise<number[]> {
  const spells = await prisma.spell.findMany({ where: { ruleset: "RULES_2024", engName: { in: engNames } }, select: { spellId: true, engName: true } });
  return engNames.map((engName) => {
    const spell = spells.find((candidate) => candidate.engName === engName);
    if (!spell) throw new Error(`немає заклинання 2024 ${engName}`);
    return spell.spellId;
  });
}

async function buildInitiateChoices(): Promise<Record<string, number>> {
  const options = await prisma.choiceOption.findMany({
    where: { optionNameEng: { in: ["Magic Initiate 2024 (Wizard)", "Magic Initiate 2024 (INT)"] } },
    select: { choiceOptionId: true, groupName: true },
  });
  return Object.fromEntries(options.map((option) => [option.groupName, option.choiceOptionId]));
}

async function readFreeCasts() {
  const pers = await getPersById(persId);
  if (!pers) throw new Error("персонаж не читається");
  return collectFreeSpellCasts(pers);
}

/// Один персонаж на весь файл (Р45): створення — 26 запитів, а перевірки лише читають стан.
beforeAll(async () => {
  await resetUserData();

  const user = await prisma.user.create({ data: { email: `free-cast-${Math.random()}@holota.family`, name: "free-cast" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, cleric, sage] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: Races.HUMAN_2024 } }),
    prisma.class.findFirstOrThrow({ where: { name: Classes.CLERIC_2024 } }),
    prisma.background.findFirstOrThrow({ where: { name: BackgroundCategory.SAGE_2024 } }),
  ]);

  const form = await withCreationSpells(
    minimalForm({
      name: "Посвячений клірик",
      raceId: race.raceId,
      classId: cleric.classId,
      backgroundId: sage.backgroundId,
      ruleset: "RULES_2024",
      backgroundAsiChoice: { mode: "+2/+1", plusTwo: "WIS", plusOne: "INT" },
      languagesSchema: { languages: ["DWARVISH", "GIANT"] },
      classChoiceSelections: await findRequiredClassChoices2024(cleric.classId, 1),
      backgroundFeatChoiceSelections: await buildInitiateChoices(),
      featSpellSelections: { BACKGROUND_ORIGIN: await findSpellIds(["Fire Bolt", "Mage Hand", "Shield"]) },
    }),
    { cantrips: ["Guidance", "Sacred Flame", "Thaumaturgy"] },
  );

  const created = await createCharacter(form);
  if (!created.persId) throw new Error(`не створився: ${JSON.stringify(created)}`);
  persId = created.persId;
});

describe("Р38 — безкоштовне застосування заклинання «Посвяченого у магію» на листі", () => {
  it("лічильник риси стоїть у «Ресурсах класу» — раз на довгий відпочинок", async () => {
    const grouped = await getCharacterFeaturesGrouped(persId);
    const feature = grouped?.passive.find((item) => item.name === MAGIC_INITIATE_FEATURE_NAME);

    expect(feature?.displayTypes).toContain(FeatureDisplayType.CLASS_RESOURCE);
    expect({ usesPer: feature?.usesPer, restType: feature?.restType }).toEqual({ usesPer: 1, restType: "LONG_REST" });
  });

  it("заклинання 1-го рівня від риси пропонує застосування без слоту, замовляння — ні", async () => {
    const casts = await readFreeCasts();
    const [shield] = await findSpellIds(["Shield"]);

    expect(casts).toEqual([
      expect.objectContaining({ spellId: shield, featureName: MAGIC_INITIATE_FEATURE_NAME, remaining: 1, maxUses: 1 }),
    ]);
  });

  it("витрата використання гасить пропозицію до відпочинку", async () => {
    const [{ featureId }] = await readFreeCasts();

    expect(await spendFeatureUse({ persId, featureId })).toEqual({ success: true, usesRemaining: 0 });
    expect((await readFreeCasts())[0].remaining).toBe(0);
  });

  it("підготовку з заклинання риси не знімає навіть прямий виклик дії", async () => {
    const [shield] = await findSpellIds(["Shield"]);

    expect(await setSpellPrepared({ persId, spellId: shield, isPrepared: false })).toEqual({
      success: false,
      error: "Це заклинання завжди підготоване",
    });
    const row = await prisma.persSpell.findFirstOrThrow({ where: { persId, spellId: shield }, select: { isPrepared: true } });
    expect(row.isPrepared).toBe(true);
  });
});
