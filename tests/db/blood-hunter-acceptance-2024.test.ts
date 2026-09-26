/**
 * O45, KR45.7 — приймання адаптації Мисливця за кровʼю 2024 за контрактом
 * (docs/o45-blood-hunter/README.md): механіка класу й орденів — з Blood Hunter 2020, шасі — 2024
 * (Майстерність зброї на 1-му, риса Бойового стилю на 2-му, риса ASI на 4-му).
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../user-data";
import { build2024MulticlassCharacter } from "../helpers/build-2024-multiclass-character";
import type { MulticlassLevelUpPick, Multiclass2024Fixture, NamedPick } from "../fixtures/2024-multiclass";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { PERS_SHEET_INCLUDE } from "@/server/db/pers-sheet-include";
import { loadPersSpellcastingSources } from "@/server/db/spell-sources";
import { applyActiveStates } from "@/lib/logic/active-states";
import { buildSpellcastingStatRows } from "@/lib/logic/spellcasting-stats";
import { calculateCasterLevel, type SpellcastingPersLike } from "@/lib/logic/spell-logic";
import { calculateFinalSpeed } from "@/lib/logic/bonus-calculator";
import type { PersWithRelations } from "@/lib/actions/pers";

const BH = "BLOOD_HUNTER_2024";
const pick = (choice: string, option: string): NamedPick => ({ choice, option });

let lycanId: number;
let profaneSoulId: number;

beforeAll(async () => {
  await resetUserData();
  const user = await prisma.user.create({ data: { email: "blood-hunter-2024@holota.family", name: "blood-hunter-2024" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  lycanId = await build("bh-004-2024", "ORDER_OF_THE_LYCAN", [], { STR: 8, DEX: 15, CON: 13, INT: 14, WIS: 12, CHA: 10 }, "DEX");
  profaneSoulId = await build(
    "bh-005-2024",
    "ORDER_OF_THE_PROFANE_SOUL",
    [
      { characterLevel: 8, class: "WARLOCK_2024", isNewClass: true, classChoices: [pick("Потойбічні виклики", "Pact of the Chain (2024)")] },
      { characterLevel: 9, class: "WARLOCK_2024", isNewClass: false, classChoices: [pick("Потойбічні виклики", "Agonizing Blast (2024)"), pick("Потойбічні виклики", "Devil's Sight (2024)")] },
      { characterLevel: 10, class: "WARLOCK_2024", isNewClass: false, subclass: "FIEND_PATRON" },
    ],
    { STR: 8, DEX: 14, CON: 12, INT: 15, WIS: 10, CHA: 15 },
    "INT",
  );
}, 240_000);

afterAll(disconnectDatabase);

describe("BH-001-2024 — шасі 2024", () => {
  it("Майстерність зброї на 1-му, риса Бойового стилю на 2-му, Епічного Дару ще немає", async () => {
    const pers = await readSheetPers(lycanId);
    expect(pers.pers_weapon_mastery.map((entry) => entry.weapon.name).sort()).toEqual(["LIGHT_CROSSBOW", "LONGSWORD"]);
    expect(pers.feats.map((row) => row.feat.name)).toContain("ARCHERY");
  });
});

describe("BH-004-2024 — Лікантроп 7", () => {
  it("швидкість 40, СК гемокрафту 8 + 3 + Інт 14 (+2) = 13, Кулак для Хижих ударів", async () => {
    const pers = await readSheetPers(lycanId);
    expect(calculateFinalSpeed(pers)).toBe(40);
    expect(pers.weapons.some((weapon) => weapon.weapon.name === "UNARMED_STRIKE")).toBe(true);
    const [row] = buildSpellcastingStatRows(pers, await loadPersSpellcastingSources(lycanId));
    expect(row).toMatchObject({ ability: "INT", saveDC: 13 });
  });
});

describe("BH-005-2024 — Нечестива душа 7 / чорнокнижник 3 за правилом контракту", () => {
  it("пакт 3 + ⌊7/3⌋ = 5 за таблицею чорнокнижника 2024: два слоти 3-го рівня", async () => {
    expect(calculateCasterLevel((await readSheetPers(profaneSoulId)) as unknown as SpellcastingPersLike)).toEqual({ casterLevel: 0, pactLevel: 5 });
  });

  it("замовлянь разом 3, ордену 4 відомих, чорнокнижника 4 підготовлених; Розпечений промінь понад ліміт", async () => {
    const spells = await prisma.persSpell.findMany({
      where: { persId: profaneSoulId },
      select: { badgeText: true, excludeFromKnownCount: true, spell: { select: { engName: true, level: true } } },
    });
    const own = spells.filter((spell) => !spell.excludeFromKnownCount);
    expect(own.filter((spell) => spell.spell.level === 0)).toHaveLength(3);
    expect(own.filter((spell) => spell.spell.level > 0 && spell.badgeText === "Мисливець за кровʼю")).toHaveLength(4);
    expect(own.filter((spell) => spell.spell.level > 0 && spell.badgeText === "Чорнокнижник")).toHaveLength(4);
    expect(spells.find((spell) => spell.spell.engName === "Scorching Ray")).toMatchObject({ excludeFromKnownCount: true });
  });
});

async function build(id: string, order: string, extraLevelUps: MulticlassLevelUpPick[], baseAbilityScores: Record<string, number>, asiAbility: "DEX" | "INT") {
  const riteSeven = order === "ORDER_OF_THE_PROFANE_SOUL" ? "Rite of the Storm (2024)" : "Rite of the Flame (2024)";
  const levelUps: MulticlassLevelUpPick[] = [
    { characterLevel: 2, class: BH, isNewClass: false, classChoices: [pick("Бойовий стиль", "Fighting Style 2024 (Archery)"), pick("Багряні обряди", order === "ORDER_OF_THE_PROFANE_SOUL" ? "Rite of the Flame (2024)" : "Rite of the Storm (2024)")] },
    {
      characterLevel: 3,
      class: BH,
      isNewClass: false,
      subclass: order,
      ...(order === "ORDER_OF_THE_PROFANE_SOUL" ? { subclassChoices: [pick("Потойбічний покровитель", "Otherworldly Patron: The Fiend (2024)")] } : {}),
    },
    { characterLevel: 4, class: BH, isNewClass: false, asi: [{ ability: asiAbility, value: 2 }] },
    { characterLevel: 5, class: BH, isNewClass: false },
    { characterLevel: 6, class: BH, isNewClass: false, classChoices: [pick("Криваві прокляття", "Blood Curse of the Eyeless (2024)")] },
    { characterLevel: 7, class: BH, isNewClass: false, classChoices: [pick("Багряні обряди", riteSeven)] },
    ...extraLevelUps,
  ];

  const fixture = {
    id,
    title: id,
    reference: "O45 KR45.7",
    why: "приймання адаптації Мисливця за кровʼю 2024",
    input: {
      species: "HUMAN_2024",
      startingClass: BH,
      background: "SOLDIER_2024",
      baseAbilityScores,
      backgroundAsi: { mode: "+2/+1" as const, plusTwo: "DEX" as const, plusOne: "CON" as const },
      originFeat: "SAVAGE_ATTACKER",
      classChoices: [pick("Характеристика гемокрафту", "Hemocraft Ability: Intelligence (2024)"), pick("Криваві прокляття", "Blood Curse of Binding (2024)")],
      speciesChoices: [],
      weaponMastery: ["Longsword", "Light Crossbow"],
      levelUps,
    },
    expected: {} as Multiclass2024Fixture["expected"],
  } as unknown as Multiclass2024Fixture;

  const built = await build2024MulticlassCharacter(fixture, { createCharacter, levelUpCharacter, getLevelUpInfo });
  if (built.creationError || built.levelUpErrors.length) throw new Error(`${id}: ${built.creationError ?? built.levelUpErrors.join("; ")}`);
  return built.persId!;
}

async function readSheetPers(persId: number): Promise<PersWithRelations> {
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, include: PERS_SHEET_INCLUDE });
  return applyActiveStates(pers as unknown as PersWithRelations);
}
