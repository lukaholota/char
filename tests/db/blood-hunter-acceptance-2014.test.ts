/**
 * O45, KR45.7 — приймання Мисливця за кровʼю 2014 за кейсами BH-001…BH-005 зі сховища власника
 * (`char.holota.family/human only/2024 prep/chars/blood hunter.md`). Персонажі будуються справжніми
 * `createCharacter` / `levelUpCharacter`, числа читаються тими самими функціями, що й лист.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Classes, Races, BackgroundCategory, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm, type LevelUpFormData } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { setWeaponCrimsonRite } from "@/lib/actions/equipment-actions";
import { PERS_SHEET_INCLUDE } from "@/server/db/pers-sheet-include";
import { loadPersSpellcastingSources } from "@/server/db/spell-sources";
import { applyActiveStates } from "@/lib/logic/active-states";
import { buildSpellcastingStatRows } from "@/lib/logic/spellcasting-stats";
import { calculateCasterLevel, type SpellcastingPersLike } from "@/lib/logic/spell-logic";
import { calculateFinalSpeed, calculateWeaponAttackBonus, calculateWeaponDamageBonus, calculateWeaponDamageDice } from "@/lib/logic/bonus-calculator";
import { findWeaponCrimsonRite } from "@/lib/logic/crimson-rite-sheet";
import { findPoolProviderForPers } from "@/server/db/resource-pool-provider";
import { calculateMaxUsesForFeature } from "@/lib/logic/feature-resources";
import type { PersWithRelations } from "@/lib/actions/pers";

const HEMOCRAFT = "Характеристика гемокрафту";
const CURSES = "Криваві прокляття";
const RITES = "Багряні обряди";
const STYLE = "Бойовий стиль";
const MUTAGENS = "Мутагени";
const PATRON = "Потойбічний покровитель";

/// Людина 2014 дає +1 до всього: задані значення — фінальні мінус один.
const BH_001_SCORES = { STR: 9, DEX: 15, CON: 13, INT: 15, WIS: 11, CHA: 7 };
const BH_004_SCORES = { STR: 9, DEX: 15, CON: 13, INT: 15, WIS: 11, CHA: 7 };
const BH_005_SCORES = { STR: 7, DEX: 15, CON: 13, INT: 15, WIS: 9, CHA: 15 };

type Built = { persId: number };
const built: Record<string, Built> = {};
let bloodHunterClassId: number;
let aetherAtSeven: string | null;

beforeAll(async () => {
  await resetUserData();
  const user = await prisma.user.create({ data: { email: "blood-hunter-2014@holota.family", name: "blood-hunter" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
  bloodHunterClassId = (await classByName(Classes.BLOOD_HUNTER_2014)).classId;

  built.bh001 = await buildBloodHunter({ scores: BH_001_SCORES, curse: "Blood Curse of Binding", style: "Archery", rite: "Rite of the Storm", toLevel: 2 });
  built.bh002 = await buildBloodHunter({ scores: BH_001_SCORES, curse: "Blood Curse of Binding", style: "Archery", rite: "Rite of the Storm", order: Subclasses.ORDER_OF_THE_GHOSTSLAYER, toLevel: 3 });
  built.bh003 = await buildBloodHunter({
    scores: BH_001_SCORES,
    curse: "Blood Curse of Binding",
    style: "Dueling",
    rite: "Rite of the Flame",
    order: Subclasses.ORDER_OF_THE_MUTANT,
    mutagens: { 3: ["Mutagens: Potency", "Mutagens: Celerity", "Mutagens: Nighteye", "Mutagens: Rapidity"], 7: ["Mutagens: Reconstruction"] },
    toLevel: 6,
  });
  aetherAtSeven = await tryLevelUp(built.bh003.persId, { classChoiceSelections: { [RITES]: [await findOptionId("Rite of the Storm")] }, subclassChoiceSelections: { [MUTAGENS]: [await findOptionId("Mutagens: Aether")] } });
  await levelUp(built.bh003.persId, { classChoiceSelections: { [RITES]: [await findOptionId("Rite of the Storm")] }, subclassChoiceSelections: { [MUTAGENS]: [await findOptionId("Mutagens: Reconstruction")] } });
  built.bh004 = await buildBloodHunter({
    scores: BH_004_SCORES,
    curse: "Blood Curse of Binding",
    style: "Two-Weapon Fighting",
    rite: "Rite of the Storm",
    order: Subclasses.ORDER_OF_THE_LYCAN,
    asi: [{ ability: "DEX", value: 2 }],
    toLevel: 7,
  });
  built.bh005 = await buildBloodHunter({
    scores: BH_005_SCORES,
    curse: "Blood Curse of Binding",
    style: "Archery",
    rite: "Rite of the Flame",
    order: Subclasses.ORDER_OF_THE_PROFANE_SOUL,
    patron: "Otherworldly Patron: The Fiend",
    asi: [{ ability: "INT", value: 2 }],
    toLevel: 7,
  });
  await multiclassIntoWarlock(built.bh005.persId, 3);
}, 240_000);

afterAll(disconnectDatabase);

describe("BH-001 — мисливець 2 без ордену", () => {
  it("СК гемокрафту 13 з обраним Інтелектом, одне Криваве наврочення, прокляття — вибір, а не заклинання", async () => {
    const pers = await readSheetPers(built.bh001.persId);
    const [row] = buildSpellcastingStatRows(pers, await loadPersSpellcastingSources(built.bh001.persId));
    expect(row).toMatchObject({ ability: "INT", saveDC: 13 });
    expect(await findMaledictMaximum(built.bh001.persId)).toBe(1);
    expect(await countChoices(built.bh001.persId, CURSES)).toBe(1);
    expect(await prisma.persSpell.count({ where: { persId: built.bh001.persId } })).toBe(0);
  });
});

describe("BH-002 — Мисливець на привидів 3", () => {
  it("Обряд світанку додається до вивченого (обрядів 2), прокляття одне, наврочень 2 від Знавця проклять", async () => {
    const pers = await readSheetPers(built.bh002.persId);
    const rites = (await listOwnedFeatureEngNames(built.bh002.persId)).filter((engName) => engName.includes("Rite of the"));
    expect(rites.sort()).toEqual(["Rite of the Dawn (Order of the Ghostslayer)", "Rite of the Storm"]);
    expect(await countChoices(built.bh002.persId, CURSES)).toBe(1);
    expect(await findMaledictMaximum(built.bh002.persId)).toBe(2);
    expect(pers.level).toBe(3);
  });
});

describe("BH-003 — Мутант 7", () => {
  it("формул 5, мутагенів за відпочинок 2, Відновлення взято на 7-му", async () => {
    expect(await countChoices(built.bh003.persId, MUTAGENS)).toBe(5);
    const craft = await prisma.feature.findUniqueOrThrow({ where: { engName: "Mutagencraft (Order of the Mutant)" }, include: { subclassFeatures: { select: { subclass: { select: { classId: true } } } } } });
    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId: built.bh003.persId }, include: { multiclasses: true } });
    expect(calculateMaxUsesForFeature(pers, craft)).toBe(2);
  });

  it("на 7-му сервер приймає Відновлення (з 7), але не Ефір (з 11) — навіть у підробленому запиті", () => {
    expect(aetherAtSeven).toBe("Цей варіант доступний лише з вищого рівня класу");
  });
});

describe("BH-004 — Лікантроп 7", () => {
  it("швидкість 40, СПР 18, Хижі удари — рядок зброї, у формі +8 / 1к6 + 5", async () => {
    const pers = await readSheetPers(built.bh004.persId);
    expect(pers.dex).toBe(18);
    expect(calculateFinalSpeed(pers)).toBe(40);

    const strikes = pers.weapons.find((weapon) => weapon.weapon.name === "UNARMED_STRIKE");
    expect(strikes).toBeDefined();

    const hybrid = await activateHybridForm(built.bh004.persId);
    expect(calculateWeaponAttackBonus(hybrid, strikes!)).toBe(8);
    expect(calculateWeaponDamageDice(hybrid, strikes!)).toBe("1d6");
    expect(calculateWeaponDamageBonus(hybrid, strikes!)).toBe(5);
  });

  it("Багряний обряд ставиться на Хижі удари одним рядком: +1к6 блискавкою", async () => {
    const pers = await readSheetPers(built.bh004.persId);
    const strikes = pers.weapons.find((weapon) => weapon.weapon.name === "UNARMED_STRIKE")!;
    const storm = await prisma.feature.findUniqueOrThrow({ where: { engName: "Rite of the Storm" } });

    expect(await setWeaponCrimsonRite(strikes.persWeaponId, storm.featureId)).toMatchObject({ success: true });
    const after = await readSheetPers(built.bh004.persId);
    const updated = after.weapons.find((weapon) => weapon.persWeaponId === strikes.persWeaponId)!;
    expect(findWeaponCrimsonRite(after, updated)).toMatchObject({ dice: "1d6", damageType: "LIGHTNING" });

    const dead = await prisma.feature.findUniqueOrThrow({ where: { engName: "Rite of the Dead" } });
    expect(await setWeaponCrimsonRite(strikes.persWeaponId, dead.featureId)).toMatchObject({ success: false });
  });
});

describe("BH-005 — Нечестива душа 7 / чорнокнижник 3", () => {
  it("пакт 5: два слоти 3-го рівня, а не 2 + 2", async () => {
    const pers = await readSheetPers(built.bh005.persId);
    expect(calculateCasterLevel(pers as unknown as SpellcastingPersLike)).toEqual({ casterLevel: 0, pactLevel: 5 });
  });

  it("замовлянь разом 3; відомих заклинань ордену 4 і чорнокнижника 4; Розпечений промінь не займає відоме", async () => {
    const spells = await prisma.persSpell.findMany({
      where: { persId: built.bh005.persId },
      select: { badgeText: true, excludeFromKnownCount: true, spell: { select: { engName: true, level: true } } },
    });
    const own = spells.filter((spell) => !spell.excludeFromKnownCount);
    expect(own.filter((spell) => spell.spell.level === 0)).toHaveLength(3);
    expect(own.filter((spell) => spell.spell.level > 0 && spell.badgeText === "Мисливець за кровʼю")).toHaveLength(4);
    expect(own.filter((spell) => spell.spell.level > 0 && spell.badgeText === "Чорнокнижник")).toHaveLength(4);
    expect(spells.find((spell) => spell.spell.engName === "Scorching Ray")).toMatchObject({ excludeFromKnownCount: true });
  });

  it("СК заклинань 16 і атака +8 — від Інтелекту гемокрафту", async () => {
    const pers = await readSheetPers(built.bh005.persId);
    const rows = buildSpellcastingStatRows(pers, await loadPersSpellcastingSources(built.bh005.persId));
    expect(rows.find((row) => row.key === "BLOOD_HUNTER_2014")).toMatchObject({ ability: "INT", saveDC: 16, attackBonus: 8 });
  });
});

type BuildInput = {
  scores: Record<string, number>;
  curse: string;
  style: string;
  rite: string;
  order?: Subclasses;
  mutagens?: Record<number, string[]>;
  patron?: string;
  asi?: Array<{ ability: string; value: number }>;
  toLevel: number;
};

async function buildBloodHunter(input: BuildInput): Promise<Built> {
  const [race, background] = await Promise.all([raceByName(Races.HUMAN_2014), backgroundByName(BackgroundCategory.HERMIT)]);
  const created = await createCharacter(
    await withCreationSpells(
      minimalForm({
        raceId: race.raceId,
        classId: bloodHunterClassId,
        backgroundId: background.backgroundId,
        asi: Object.entries(input.scores).map(([ability, value]) => ({ ability, value })),
        classChoiceSelections: {
          [HEMOCRAFT]: await findOptionId("Hemocraft Ability: Intelligence"),
          [CURSES]: [await findOptionId(input.curse)],
        },
      }),
    ),
  );
  if ("error" in created && created.error) throw new Error(`createCharacter: ${created.error}`);
  const persId = created.persId!;

  for (let level = 2; level <= input.toLevel; level++) await levelUp(persId, await buildLevelUpData(input, level));
  return { persId };
}

async function buildLevelUpData(input: BuildInput, level: number): Promise<Partial<LevelUpFormData>> {
  const data: Partial<LevelUpFormData> = { classChoiceSelections: {}, subclassChoiceSelections: {} };
  if (level === 2) data.classChoiceSelections = { [STYLE]: await findOptionId(input.style), [RITES]: [await findOptionId(input.rite)] };
  if (level === 3 && input.order) data.subclassId = (await subclassByName(bloodHunterClassId, input.order)).subclassId;
  if (level === 3 && input.patron) data.subclassChoiceSelections = { [PATRON]: await findOptionId(input.patron) };
  if (level === 4) data.customAsi = input.asi ?? [{ ability: "CON", value: 2 }];
  if (level === 6) data.classChoiceSelections = { [CURSES]: [await findOptionId("Blood Curse of the Eyeless")] };
  if (level === 7) data.classChoiceSelections = { [RITES]: [await findOptionId(input.rite === "Rite of the Flame" ? "Rite of the Storm" : "Rite of the Flame")] };
  const mutagens = input.mutagens?.[level];
  if (mutagens) data.subclassChoiceSelections = { [MUTAGENS]: await Promise.all(mutagens.map(findOptionId)) };
  return data;
}

async function multiclassIntoWarlock(persId: number, warlockLevels: number) {
  const warlock = await classByName(Classes.WARLOCK_2014);
  const fiend = await subclassByName(warlock.classId, Subclasses.FIEND);
  for (let level = 1; level <= warlockLevels; level++) {
    const form = minimalLevelUpForm({
      classId: warlock.classId,
      levelUpPath: level === 1 ? "MULTICLASS" : "EXISTING",
      ...(level === 1 ? { subclassId: fiend.subclassId } : {}),
      ...(level === 2 ? { classChoiceSelections: { "Потойбічні виклики": await findWarlockInvocationIds(warlock.classId) } } : {}),
      ...(level === 3 ? { classChoiceSelections: { "Дар пакту": await findOptionId("Pact of the Chain") } } : {}),
    });
    const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, form));
    if (result && "error" in result && result.error) throw new Error(`чорнокнижник ${level}: ${result.error}`);
  }
}

async function findWarlockInvocationIds(classId: number): Promise<number[]> {
  const rows = await prisma.classChoiceOption.findMany({
    where: { classId, levelsGranted: { has: 2 }, choiceOption: { optionNameEng: { in: ["Agonizing Blast", "Armor of Shadows"] } } },
    select: { choiceOptionId: true },
  });
  return rows.map((row) => row.choiceOptionId);
}

async function tryLevelUp(persId: number, extra: Partial<LevelUpFormData>): Promise<string | null> {
  const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, minimalLevelUpForm({ classId: bloodHunterClassId, ...extra })));
  return result && "error" in result && result.error ? result.error : null;
}

async function levelUp(persId: number, extra: Partial<LevelUpFormData>) {
  const form = minimalLevelUpForm({ classId: bloodHunterClassId, ...extra });
  const result = await levelUpCharacter(persId, await withLevelUpSpells(persId, form));
  if (result && "error" in result && result.error) throw new Error(`levelUp: ${result.error}`);
}

async function findOptionId(optionNameEng: string): Promise<number> {
  const option = await prisma.choiceOption.findFirst({ where: { optionNameEng, ruleset: "RULES_2014" }, select: { choiceOptionId: true } });
  if (!option) throw new Error(`Немає варіанта «${optionNameEng}»`);
  return option.choiceOptionId;
}

async function readSheetPers(persId: number): Promise<PersWithRelations> {
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, include: PERS_SHEET_INCLUDE });
  return applyActiveStates(pers as unknown as PersWithRelations);
}

async function activateHybridForm(persId: number): Promise<PersWithRelations> {
  const hybrid = await prisma.feature.findUniqueOrThrow({ where: { engName: "Hybrid Transformation (Order of the Lycan)" } });
  await prisma.persFeature.update({ where: { persId_featureId: { persId, featureId: hybrid.featureId } }, data: { isActive: true } });
  return readSheetPers(persId);
}

async function findMaledictMaximum(persId: number): Promise<number | null> {
  const provider = await findPoolProviderForPers({ persId, poolKey: "BLOOD_MALEDICT" });
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, include: { multiclasses: true } });
  return provider ? calculateMaxUsesForFeature(pers, provider) : null;
}

async function countChoices(persId: number, groupName: string): Promise<number> {
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { choiceOptions: { where: { groupName }, select: { choiceOptionId: true } } } });
  return pers.choiceOptions.length;
}

async function listOwnedFeatureEngNames(persId: number): Promise<string[]> {
  const rows = await prisma.persFeature.findMany({ where: { persId }, select: { feature: { select: { engName: true } } } });
  return rows.map((row) => row.feature.engName);
}
