import {
  calculateDamageResistances,
  calculateDarkvisionRange,
  calculateFinalModifier,
  calculateWeaponAttackBonus,
  calculateWeaponDamageBonus,
  calculateWeaponDamageDice,
} from "@/lib/logic/bonus-calculator";
import { formatModifier } from "@/lib/logic/utils";
import { appendMissingProficiencies, calculatePersProficiencies } from "@/lib/logic/pers-proficiencies";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import {
  armorTranslations,
  backgroundTranslations,
  classTranslations,
  damageTypeTranslations,
  subclassTranslations,
  weaponTranslations,
} from "@/lib/refs/translation";
import { weaponMasteryNames } from "@/lib/refs/weapon-mastery";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { buildHitDicePools, findMainClassLevel } from "@/rules/hit-dice";
import { findAttacksPerAction } from "@/rules/attacks-per-action";
import { findSpellcastingSources } from "@/rules/spell-sources";
import type { RulesetId } from "@/rules/strategies/types";
import { collectSpellcastingClasses } from "@/server/db/spell-sources";
import { Ability, AbilityBonusType } from "@prisma/client";

import {
  formatEquipmentText,
  groupPrintableWeaponAttacks,
  type GroupedPrintableWeaponAttack,
  type PrintableWeaponAttack,
} from "./equipmentPrint";
import { buildProficiencyAndLanguageText } from "./proficiencyLanguageText";
import { translatePdfText } from "./translatePdfText";
import type { CharacterPdfData, PersSpellWithSpell } from "./types";

export type Maybe<T> = T | null | undefined;

export type PersExtraFields = {
  alignment?: string | null;
  xp?: number | null;
  tempHp?: number | null;
  deathSaveSuccesses?: number | null;
  deathSaveFailures?: number | null;
  isDead?: boolean | null;
  customProficiencies?: string | null;
  customLanguagesKnown?: string | null;
  additionalSaveProficiencies?: Ability[] | null;
  currentHitDice?: Record<string, number> | null;
};

export function getPersExtras(pers: CharacterPdfData["pers"]): PersExtraFields {
  return pers as unknown as PersExtraFields;
}

export function formatDiceUkr(value: string): string {
  return (value ?? "").replaceAll("d", "к").replaceAll("D", "к");
}

export function compactDiceSum(value: string): string {
  // Keep hit dice sums inside narrow fields by removing extra spaces.
  return String(value ?? "")
    .replaceAll(" + ", "+")
    .replaceAll(" +", "+")
    .replaceAll("+ ", "+")
    .trim();
}

export function buildEquipmentText(pers: CharacterPdfData["pers"]): string {
  const parts: string[] = [];

  const customEquipment = formatEquipmentText(String((pers as any).customEquipment ?? ""));
  if (customEquipment) parts.push(customEquipment);

  const magicItems = (pers.magicItems ?? []) as any[];
  if (magicItems.length > 0) {
    parts.push("Магічні предмети:");
    for (const pmi of magicItems) {
      if (!pmi.magicItem) continue;
      const name = pmi.magicItem.name;
      const attunementMark = pmi.isAttuned ? " (A)" : "";
      const equippedMark = pmi.isEquipped ? "[x]" : "[ ]";
      
      parts.push(`· ${equippedMark} ${name} ${attunementMark}`);
    }
  }

  return parts.filter(Boolean).join("\n");
}

export function buildAttacksSpellcastingText(
  pers: CharacterPdfData["pers"],
  overflowWeapons: GroupedPrintableWeaponAttack[]
): string {
  return [
    ...buildAttacksPerActionLines(pers),
    ...buildOverflowWeaponLines(overflowWeapons),
    ...buildWeaponMasteryLines(pers),
    buildArmorAndShieldText(pers),
  ].join("\n");
}

export function buildAttacksPerActionLines(pers: CharacterPdfData["pers"]): string[] {
  const attacksPerAction = findAttacksPerAction(
    pers.ruleset,
    (pers.features ?? []).map((entry) => entry.feature.engName),
  );
  return attacksPerAction !== null && attacksPerAction > 1 ? [`Атак за дію: ${attacksPerAction}`] : [];
}

export function buildOverflowWeaponLines(overflowWeapons: GroupedPrintableWeaponAttack[]): string[] {
  if (overflowWeapons.length === 0) return [];
  return ["Ще зброя:", ...overflowWeapons.map((weapon) => `· ${formatWeaponName(weapon)}: ${weapon.attackBonus}, ${weapon.damage}`)];
}

export function buildWeaponMasteryLines(pers: CharacterPdfData["pers"]): string[] {
  const mastered = (pers.pers_weapon_mastery ?? []).map((entry) => {
    const name = translateFromMap(weaponTranslations, entry.weapon.name);
    return entry.weapon.mastery ? `${name} (${weaponMasteryNames[entry.weapon.mastery]})` : name;
  });
  return mastered.length > 0 ? [`Майстерність зброї: ${mastered.join(", ")}`] : [];
}

export function buildArmorAndShieldText(pers: CharacterPdfData["pers"]): string {
  const lines: string[] = [];

  const uaAbilityShort: Record<string, string> = {
    STR: "Сил",
    DEX: "Спр",
    CON: "Ст",
    INT: "Інт",
    WIS: "Муд",
    CHA: "Хар",
  };

  const armors = (pers.armors ?? []) as any[];
  if (armors.length > 0) {
    lines.push("Обладунки:");
    for (const pa of armors) {
      const rawName = String(pa?.armor?.name ?? "").trim();
      const name =
        (armorTranslations as unknown as Record<string, string>)[rawName] ??
        rawName ??
        "";
      if (!name) continue;
      const equipped = Boolean(pa?.equipped);

      const base = Number.isFinite(pa?.overrideBaseAC) ? Number(pa.overrideBaseAC) : Number(pa?.armor?.baseAC ?? 0);
      const misc = Number.isFinite(pa?.miscACBonus) ? Number(pa.miscACBonus) : 0;

      const persAbilities: Ability[] = Array.isArray((pa as any).abilityBonuses) ? (((pa as any).abilityBonuses as Ability[]) ?? []) : [];
      const armorAbilities: Ability[] = Array.isArray((pa?.armor as any)?.abilityBonuses)
        ? ((((pa.armor as any).abilityBonuses as Ability[]) ?? []) as Ability[])
        : [];

      const persType = (pa as any).abilityBonusType as AbilityBonusType | undefined;
      const armorType = (pa?.armor as any)?.abilityBonusType as AbilityBonusType | undefined;
      let type: AbilityBonusType = persType ?? armorType ?? AbilityBonusType.FULL;
      if (armorType && persType === AbilityBonusType.FULL && persAbilities.length === 0) {
        type = armorType;
      }

      const abilities = type === AbilityBonusType.NONE ? persAbilities : (persAbilities.length > 0 ? persAbilities : armorAbilities);
      const unique = Array.from(new Set(abilities));

      let bonus = 0;
      for (const ab of unique) {
        let mod = calculateFinalModifier(pers as any, ab);
        if (type === AbilityBonusType.MAX2 && ab === Ability.DEX) {
          mod = Math.min(mod, 2);
        }
        bonus += mod;
      }

      const totalAC = base + misc + bonus;

      const parts: string[] = [`КБ: ${base}`];
      if (misc) parts.push(`+${misc}`);
      if (unique.length > 0 && type !== AbilityBonusType.NONE) {
        const labels = unique.map((ab) => uaAbilityShort[String(ab)] ?? String(ab));
        parts.push(`+ ${labels.join(" + ")}`);
        if (type === AbilityBonusType.MAX2 && unique.includes(Ability.DEX)) {
          parts.push("(Спр max +2)");
        }
      }

      const formula = parts.join(" ");
      const stealthNote = pa?.armor?.stealthDisadvantage ? " перешкода на Непомітність" : "";
      lines.push(`· ${equipped ? "[x]" : "[ ]"} ${name} — ${totalAC} (${formula})${stealthNote}`);
    }
  }

  if ((pers as any).wearsShield) {
    lines.push(`Щит: так (+2 КБ)`);
  } else {
    lines.push("Щит: ні");
  }

  return lines.join("\n").trim();
}

export type FeatureListItem = { name: string; source: string; featureId?: number; sortKey: string };

export function buildFeaturesListText(data: CharacterPdfData): string {
  return formatFeatureList(collectFeatureListItems(data));
}

export function formatFeatureList(items: FeatureListItem[]): string {
  return items.map((it) => `· ${it.name}`).join("\n");
}

export function collectFeatureListItems(data: CharacterPdfData): FeatureListItem[] {
  const pers = data.pers;

  const classMeta = new Map<number, { levelGranted: number; displayOrder: number }>();
  for (const cf of (pers.class as any)?.features ?? []) {
    const id = Number(cf?.featureId ?? cf?.feature?.featureId);
    if (!Number.isFinite(id)) continue;
    classMeta.set(id, { levelGranted: Number(cf.levelGranted ?? 1), displayOrder: Number(cf.displayOrder ?? 0) });
  }
  for (const sf of (pers.subclass as any)?.features ?? []) {
    const id = Number(sf?.featureId ?? sf?.feature?.featureId);
    if (!Number.isFinite(id)) continue;
    classMeta.set(id, { levelGranted: Number(sf.levelGranted ?? 1), displayOrder: 0 });
  }

  for (const mc of pers.multiclasses ?? []) {
    for (const cf of (mc.class as any)?.features ?? []) {
      const id = Number(cf?.featureId ?? cf?.feature?.featureId);
      if (!Number.isFinite(id)) continue;
      if (!classMeta.has(id)) classMeta.set(id, { levelGranted: Number(cf.levelGranted ?? 1), displayOrder: Number(cf.displayOrder ?? 0) });
    }
    for (const sf of (mc.subclass as any)?.features ?? []) {
      const id = Number(sf?.featureId ?? sf?.feature?.featureId);
      if (!Number.isFinite(id)) continue;
      if (!classMeta.has(id)) classMeta.set(id, { levelGranted: Number(sf.levelGranted ?? 1), displayOrder: 0 });
    }
  }

  const sourceBaseOrder: Record<string, number> = {
    RACE: 0,
    SUBRACE: 0,
    BACKGROUND: 0,
    CLASS: 1,
    SUBCLASS: 2,
    FEAT: 3,
    PERS: 4,
    RACE_CHOICE: 5,
    CHOICE: 6,
  };

  const seen = new Set<string>();
  const items: FeatureListItem[] = [];

  for (const group of Object.values(data.features ?? {})) {
    for (const item of group ?? []) {
      const name = String((item as any).name ?? "").trim();
      if (!name) continue;

      const displayName = translatePdfText(name).trim();
      if (!displayName) continue;

      const dedupKey = String((item as any).key ?? name).toLowerCase();
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const source = String((item as any).source ?? "").toUpperCase();
      const featureId = typeof (item as any).featureId === "number" ? (item as any).featureId : undefined;
      const meta = featureId != null ? classMeta.get(featureId) : undefined;

      const baseOrder = sourceBaseOrder[source] ?? 9;
      const lvl = meta?.levelGranted ?? (baseOrder === 0 ? 1 : 99);
      const ord = meta?.displayOrder ?? 0;

      // sortKey keeps ordering stable
      const sortKey = `${String(baseOrder).padStart(2, "0")}:${String(lvl).padStart(2, "0")}:${String(ord).padStart(3, "0")}:${displayName.toLowerCase()}`;
      items.push({ name: displayName, source, featureId, sortKey });
    }
  }

  items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return items;
}

export type CharacterPdfWeapon = CharacterPdfData["pers"]["weapons"][number];

export function getWeaponAttackBonus(pers: CharacterPdfData["pers"], weapon: CharacterPdfWeapon): number {
  return calculateWeaponAttackBonus(pers as any, weapon);
}

export function getWeaponDamageBonus(pers: CharacterPdfData["pers"], weapon: CharacterPdfWeapon): number {
  return calculateWeaponDamageBonus(pers as any, weapon);
}

export function collectPrintableWeaponAttacks(pers: CharacterPdfData["pers"]): GroupedPrintableWeaponAttack[] {
  return groupPrintableWeaponAttacks((pers.weapons ?? []).map((weapon) => buildPrintableWeaponAttack(pers, weapon)));
}

export function formatWeaponName(weapon: GroupedPrintableWeaponAttack): string {
  return weapon.quantity === 1 ? weapon.name : `${weapon.name} ×${weapon.quantity}`;
}

export function buildPrintableWeaponAttack(
  pers: CharacterPdfData["pers"],
  persWeapon: CharacterPdfWeapon
): PrintableWeaponAttack {
  const rawName = String(persWeapon.weapon?.name ?? "").trim();
  const localizedName = (weaponTranslations as unknown as Record<string, string>)[rawName] ?? rawName;
  const name = String(persWeapon.overrideName || localizedName).trim();
  const dice = calculateWeaponDamageDice(pers, persWeapon).trim();
  const damageBonus = formatModifier(getWeaponDamageBonus(pers, persWeapon));
  return {
    name,
    attackBonus: formatModifier(getWeaponAttackBonus(pers, persWeapon)),
    damage: dice ? `${formatDiceUkr(dice)}${damageBonus}` : "",
    damageType: damageTypeTranslations[persWeapon.weapon?.damageType ?? ""]?.toLocaleLowerCase("uk") ?? "",
    notes: buildWeaponNotes(pers, persWeapon),
  };
}

function buildWeaponNotes(pers: CharacterPdfData["pers"], persWeapon: CharacterPdfWeapon): string {
  const weapon = persWeapon.weapon;
  const isMastered = (pers.pers_weapon_mastery ?? []).some((entry) => entry.weapon_id === weapon?.weaponId);
  const mastery = isMastered && weapon?.mastery ? weaponMasteryNames[weapon.mastery] : "";
  const range = weapon?.normalRange ? `${weapon.normalRange}/${weapon.longRange ?? weapon.normalRange} футів` : "";
  return [mastery, range].filter(Boolean).join(", ");
}

export function safeText(value: Maybe<string | number>): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function groupPersSpellsByLevel(persSpells: PersSpellWithSpell[]): Map<number, PersSpellWithSpell[]> {
  const spellsByLevel = new Map<number, PersSpellWithSpell[]>();
  for (const persSpell of persSpells) {
    const level = persSpell.spell.level;
    spellsByLevel.set(level, [...(spellsByLevel.get(level) ?? []), persSpell]);
  }
  return spellsByLevel;
}

export function translateFromMap(map: Record<string, string>, value: Maybe<string>): string {
  if (!value) return "";
  return map[value] ?? value;
}

export function translateClassName(value: Maybe<string>): string {
  return translateFromMap(classTranslations as unknown as Record<string, string>, value);
}

export function translateBackgroundName(value: Maybe<string>): string {
  return translateFromMap(backgroundTranslations as unknown as Record<string, string>, value);
}

export function buildClassLevelString(pers: CharacterPdfData["pers"]): string {
  const multiclassLevelSum = pers.multiclasses?.reduce((acc, mc) => acc + mc.classLevel, 0) ?? 0;
  const mainClassLevel = pers.level - multiclassLevelSum;

  const parts: string[] = [];
  parts.push(`${translateClassName(pers.class.name)} ${mainClassLevel}`);

  for (const mc of pers.multiclasses ?? []) {
    parts.push(`${translateClassName(mc.class.name)} ${mc.classLevel}`);
  }

  return parts.join(" / ");
}

export function buildSubclassString(pers: CharacterPdfData["pers"]): string {
  const subclassNames = [pers.subclass, ...(pers.multiclasses ?? []).map((multiclass) => multiclass.subclass)]
    .flatMap((subclass) => (subclass ? [translateFromMap(subclassTranslations as unknown as Record<string, string>, subclass.name)] : []));
  return subclassNames.join(" / ");
}

export function buildHitDiceInfoFromPers(pers: CharacterPdfData["pers"]): {
  totalString: string;
  currentString: string;
  chunks: Array<{ current: number; max: number; die: number }>;
} {
  const multiclasses = pers.multiclasses ?? [];
  const classes = [
    {
      classId: pers.class.classId,
      hitDie: pers.class.hitDie,
      classLevel: findMainClassLevel(pers.level, multiclasses),
    },
    ...multiclasses.map((multiclass) => ({
      classId: multiclass.classId,
      hitDie: multiclass.class.hitDie,
      classLevel: multiclass.classLevel,
    })),
  ];

  const chunks = buildHitDicePools(classes, getPersExtras(pers).currentHitDice).map((pool) => ({
    current: pool.current,
    max: pool.max,
    die: pool.hitDie,
  }));

  const totalString = chunks.map((chunk) => `${chunk.max}d${chunk.die}`).join(" + ");
  const currentString = chunks.map((chunk) => `${chunk.current}d${chunk.die}`).join(" + ");
  return { totalString, currentString, chunks };
}

/** Бланк має одне поле, тож у друк іде перше джерело — початковий клас або його підклас. */
export function getSpellcastingAbility(pers: CharacterPdfData["pers"]): Ability | null {
  const [first] = findSpellcastingSources({
    ruleset: pers.ruleset as RulesetId,
    characterClasses: collectSpellcastingClasses(pers),
    raceTraits: [],
    raceChoiceOptions: [],
    featOptions: [],
  });

  return (first?.ability as Ability | undefined) ?? null;
}

export function getSpellSlots(pers: CharacterPdfData["pers"], level: number): { standard: number; pact: number } {
  const caster = calculateCasterLevel(pers as any);
  
  if (level < 1 || level > 9) return { standard: 0, pact: 0 };
  
  const standardSlotsArray = (SPELL_SLOT_PROGRESSION as any).FULL?.[caster.casterLevel] as number[] | undefined;
  const standard = standardSlotsArray ? (standardSlotsArray[level - 1] ?? 0) : 0;

  const pactRow = (SPELL_SLOT_PROGRESSION as any).PACT?.[caster.pactLevel] as { slots: number; level: number } | undefined;
  const pact = (pactRow && pactRow.level === level) ? pactRow.slots : 0;

  return { standard, pact };
}

export type SpellSlotTexts = { total: string; remaining: string };

export function formatSpellSlotTexts({ standard, pact }: { standard: number; pact: number }): SpellSlotTexts {
  if (pact === 0) return { total: standard > 0 ? String(standard) : "", remaining: "" };
  if (standard === 0) return { total: String(pact), remaining: PACT_SLOT_NOTE };
  return { total: String(standard), remaining: `+${pact} ${PACT_SLOT_NOTE}` };
}

export const PACT_SLOT_NOTE = "пакт · кор. відп.";

export function buildProficiencyAndLanguageBlock(pers: CharacterPdfData["pers"]): string {
  const extras = getPersExtras(pers);
  const proficiencyText = appendMissingProficiencies(
    { proficiencies: safeText(extras.customProficiencies), languages: safeText(extras.customLanguagesKnown) },
    calculatePersProficiencies(pers),
  );
  return buildProficiencyAndLanguageText({
    customProficiencies: proficiencyText.proficiencies,
    customLanguages: proficiencyText.languages,
    darkvisionRange: calculateDarkvisionRange(pers),
    damageResistances: calculateDamageResistances(pers).map((type) => damageTypeTranslations[type] ?? type),
  });
}

export const COIN_KEYS = ["cp", "sp", "ep", "gp", "pp"] as const;
export type CoinKey = (typeof COIN_KEYS)[number];

/// Нуль лишає клітинку порожньою: на папері гравець допише суму сам.
export function formatCoinAmount(pers: Pick<CharacterPdfData["pers"], CoinKey>, coin: CoinKey): string {
  const amount = (pers[coin] ?? "").trim();
  return /^0*$/.test(amount) ? "" : amount;
}
