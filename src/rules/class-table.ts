import type { Ruleset, SpellcastingKind } from "@/rules/types";
import { findClassTableSpellSlots } from "@/rules/class-table-spell-slots";
import { INFUSIONS_KNOWN_BY_ARTIFICER_LEVEL } from "@/rules/artificer-infusions";
import { sneakAttackDice } from "@/lib/refs/static";
import { attributesUkrShort } from "@/lib/refs/translation";

/// Таблиця класу — одна на конструктор і каталог (O44): рядок на рівень, колонки — бонус
/// майстерності, здібності, ресурси класу, фокуси й комірки заклять.

type ClassTableFeature = {
  name: string;
  engName?: string | null;
  displayType?: unknown;
  usesCount?: number | null;
  usesCountSpecial?: unknown;
  usesCountDependsOnProficiencyBonus?: boolean | null;
};

export type ClassTableSource = {
  name: string;
  ruleset: Ruleset;
  spellcastingType: SpellcastingKind;
  specialSpellSlotProgression?: unknown;
  features: readonly { levelGranted: number | null; classFeatureId?: number | null; feature: ClassTableFeature | null }[];
};

export type ClassTableSubclass = { features?: readonly { levelGranted?: number | null }[] };

export type ClassTableColumnKind = "level" | "proficiency" | "features" | "compact" | "slot";
export type ClassTableColumn = { key: string; label: string; kind: ClassTableColumnKind };
/// Посилання з колонки «Фічі»: власна здібність класу або позначка «Фіча підкласу».
export type ClassTableFeatureRef =
  | { kind: "class"; name: string; engName: string; level: number }
  | { kind: "subclass"; name: string };
export type ClassTableRow = { level: number; cells: string[]; features: ClassTableFeatureRef[] };
export type ClassTable = { columns: ClassTableColumn[]; rows: ClassTableRow[]; minWidth: number };

type CustomColumn = {
  key: string;
  label: string;
  values: Record<number, string | number>;
  mode?: "STEP" | "EXACT";
};

type Resource = { levelGranted: number; feature: ClassTableFeature };

const CANTRIPS_BY_CLASS: Record<string, number[]> = {
  BARD_2014: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  CLERIC_2014: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  DRUID_2014: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  SORCERER_2014: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  WARLOCK_2014: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ARTIFICER_2014: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
};

const BLOOD_HUNTER_COLUMNS: CustomColumn[] = [
  { key: "hemocraft_die", label: "Кубик гемокрафту", values: { 1: "к4", 5: "к6", 11: "к8", 17: "к10" }, mode: "STEP" },
  { key: "blood_curses_known", label: "Відомі криваві прокляття", values: { 1: 1, 6: 2, 10: 3, 14: 4, 18: 5 }, mode: "STEP" },
];

const CUSTOM_COLUMNS: Partial<Record<string, CustomColumn[]>> = {
  BLOOD_HUNTER_2014: BLOOD_HUNTER_COLUMNS,
  BLOOD_HUNTER_2024: BLOOD_HUNTER_COLUMNS,
  BARBARIAN_2014: [{ key: "rage_damage", label: "Шкода люті", values: { 1: "+2", 9: "+3", 16: "+4" }, mode: "STEP" }],
  BARD_2014: [
    { key: "bardic_inspiration_die", label: "Кістка натхнення", values: { 1: "к6", 5: "к8", 10: "к10", 15: "к12" }, mode: "STEP" },
  ],
  WARLOCK_2014: [
    { key: "invocations_known", label: "Знані інвокації", values: { 2: 2, 5: 3, 7: 4, 9: 5, 12: 6, 15: 7, 18: 8 }, mode: "STEP" },
  ],
  ARTIFICER_2014: [
    { key: "infusions_known", label: "Знані вливання", values: INFUSIONS_KNOWN_BY_ARTIFICER_LEVEL, mode: "STEP" },
    { key: "infused_items", label: "Вливання в предмети", values: { 2: 2, 6: 3, 10: 4, 14: 5, 18: 6 }, mode: "STEP" },
  ],
  ROGUE_2014: [
    {
      key: "sneak_attack",
      label: "Підступна атака",
      values: Object.keys(sneakAttackDice).length
        ? (sneakAttackDice as Record<number, string>)
        : { 1: "1к6", 3: "2к6", 5: "3к6", 7: "4к6", 9: "5к6", 11: "6к6", 13: "7к6", 15: "8к6", 17: "9к6", 19: "10к6" },
      mode: "STEP",
    },
  ],
};

const LEVELS = Array.from({ length: 20 }, (_, index) => index + 1);
const ARTIFICER_RESOURCE_FEATURES_TO_HIDE = new Set(["Infuse Item", "Spell-Storing Item"]);
const SUBCLASS_FEATURE_LABEL = "Фіча підкласу";
const COLUMN_WIDTHS: Record<ClassTableColumnKind, number> = { level: 64, proficiency: 112, features: 240, compact: 96, slot: 36 };

export function buildClassTable(cls: ClassTableSource, subclasses: readonly ClassTableSubclass[]): ClassTable {
  const features = sortFeatures(cls.features);
  const featuresByLevel = collectFeatureRefsByLevel(features, collectSubclassFeatureLevels(subclasses));
  const resources = collectResources(features, cls.name);
  const resourceNames = [...new Set(resources.map((resource) => resource.feature.name.trim()).filter(Boolean))];
  const customColumns = CUSTOM_COLUMNS[cls.name] ?? [];
  const cantrips = CANTRIPS_BY_CLASS[cls.name] ?? null;
  const hasSpellSlots = cls.spellcastingType !== "NONE";

  const columns: ClassTableColumn[] = [
    { key: "level", label: "Рівень", kind: "level" },
    { key: "proficiency", label: "Бонус майстерності", kind: "proficiency" },
    { key: "features", label: "Фічі", kind: "features" },
    ...customColumns.map((column) => ({ key: column.key, label: column.label, kind: "compact" as const })),
    ...resourceNames.map((name) => ({ key: `resource:${name}`, label: name, kind: "compact" as const })),
    ...(cantrips ? [{ key: "cantrips", label: "К-сть знаних замовлянь", kind: "compact" as const }] : []),
    ...(hasSpellSlots ? Array.from({ length: 9 }, (_, index) => ({ key: `slot:${index + 1}`, label: String(index + 1), kind: "slot" as const })) : []),
  ];

  const rows = LEVELS.map((level) => {
    const resourceValues = findResourceValuesAtLevel(resources, level);
    const slots = hasSpellSlots ? findClassTableSpellSlots(cls, level) : null;
    return {
      level,
      cells: [
        String(level),
        `+${findProficiencyBonus(level)}`,
        featuresByLevel.get(level)?.map((feature) => feature.name).join(", ") || "—",
        ...customColumns.map((column) => findCustomColumnValue(column, level) ?? "—"),
        ...resourceNames.map((name) => resourceValues[name] ?? "—"),
        ...(cantrips ? [typeof cantrips[level - 1] === "number" ? String(cantrips[level - 1]) : "—"] : []),
        ...(hasSpellSlots ? Array.from({ length: 9 }, (_, index) => ((slots?.[index] ?? 0) > 0 ? String(slots![index]) : "-")) : []),
      ],
      features: featuresByLevel.get(level) ?? [],
    };
  });

  const minWidth = columns.reduce((total, column) => total + COLUMN_WIDTHS[column.kind], 0);
  return { columns, rows, minWidth };
}

function findProficiencyBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

function sortFeatures(features: ClassTableSource["features"]) {
  return [...features].sort((a, b) => {
    const levelDifference = (a.levelGranted ?? 0) - (b.levelGranted ?? 0);
    return levelDifference || (a.classFeatureId || 0) - (b.classFeatureId || 0);
  });
}

function collectSubclassFeatureLevels(subclasses: readonly ClassTableSubclass[]): Set<number> {
  const levels = new Set<number>();
  for (const subclass of subclasses) {
    for (const feature of subclass.features ?? []) {
      const level = Number(feature.levelGranted ?? 0);
      if (level > 0) levels.add(level);
    }
  }
  return levels;
}

function collectFeatureRefsByLevel(features: ClassTableSource["features"], subclassLevels: Set<number>): Map<number, ClassTableFeatureRef[]> {
  const map = new Map<number, ClassTableFeatureRef[]>();
  for (const entry of features) {
    const level = Number(entry.levelGranted ?? 0);
    const name = String(entry.feature?.name ?? "").trim();
    if (!level || !name) continue;
    const ref: ClassTableFeatureRef = { kind: "class", name, engName: String(entry.feature?.engName ?? ""), level };
    map.set(level, [...(map.get(level) ?? []), ref]);
  }
  for (const level of subclassLevels) {
    const existing = map.get(level) ?? [];
    if (!existing.some((ref) => ref.name === SUBCLASS_FEATURE_LABEL)) {
      map.set(level, [...existing, { kind: "subclass", name: SUBCLASS_FEATURE_LABEL }]);
    }
  }
  return map;
}

function collectResources(features: ClassTableSource["features"], className: string): Resource[] {
  const isArtificer = className === "ARTIFICER_2014";
  return features
    .filter((entry) => {
      const displayType = entry.feature?.displayType;
      if (!Array.isArray(displayType) || !displayType.includes("CLASS_RESOURCE")) return false;
      if (!isArtificer) return true;
      return !ARTIFICER_RESOURCE_FEATURES_TO_HIDE.has(String(entry.feature?.engName ?? "").trim());
    })
    .flatMap((entry) => {
      const levelGranted = Number(entry.levelGranted ?? 0);
      return levelGranted > 0 && entry.feature ? [{ levelGranted, feature: entry.feature }] : [];
    });
}

function findResourceValuesAtLevel(resources: Resource[], level: number): Record<string, string> {
  const values: Record<string, string> = {};
  for (const resource of resources) {
    const name = resource.feature.name.trim();
    const value = name ? findResourceValue(resource, level) : null;
    if (value) values[name] = value;
  }
  return values;
}

function findCustomColumnValue(column: CustomColumn, level: number): string | null {
  if (column.mode === "EXACT") {
    const exact = column.values[level];
    return exact === undefined || exact === null ? null : String(exact);
  }
  const valuesByLevel = Object.entries(column.values)
    .map(([columnLevel, value]) => ({ level: Number(columnLevel), value }))
    .filter((item) => Number.isFinite(item.level) && item.level > 0)
    .sort((a, b) => a.level - b.level);
  const bestMatch = valuesByLevel.filter((item) => level >= item.level).at(-1);
  return bestMatch ? String(bestMatch.value) : null;
}

type UsesFormula = {
  equalsToClassLevel?: boolean;
  type?: string;
  stat?: string;
  operation?: string;
  minimum?: number;
  group?: string;
  multiplier?: number;
  base?: number;
};

function findResourceValue(resource: Resource, level: number): string | null {
  if (level < resource.levelGranted) return null;

  const { usesCount, usesCountDependsOnProficiencyBonus, usesCountSpecial } = resource.feature;
  if (Array.isArray(usesCountSpecial)) {
    const best = (usesCountSpecial as { lvl?: unknown; uses?: unknown }[])
      .filter((entry) => typeof entry?.lvl === "number" && level >= entry.lvl)
      .sort((a, b) => Number(b.lvl) - Number(a.lvl))[0];
    if (best && typeof best.uses === "number") return String(best.uses);
  }

  if (usesCountSpecial && typeof usesCountSpecial === "object" && !Array.isArray(usesCountSpecial)) {
    const formulaValue = findFormulaValue(usesCountSpecial as UsesFormula, level);
    if (formulaValue !== undefined) return formulaValue;
  }

  if (usesCountDependsOnProficiencyBonus) return String(findProficiencyBonus(level));
  if (typeof usesCount === "number") return String(usesCount);
  return null;
}

/// `undefined` — формула не впізнана, і рахуємо далі звичайними полями; `null` — впізнана, але
/// дала нечисло, і клітинка лишається порожньою, як і було в конструкторі.
function findFormulaValue(special: UsesFormula, level: number): string | null | undefined {
  if (special.equalsToClassLevel === true) return String(level);
  if (special.type === "STATIC_FROM_STAT") return `мод. ${findStatLabel(special.stat)}`;
  if (special.type !== "FORMULA") return undefined;

  const operation = String(special.operation || "ADD").toUpperCase();
  const minimum = typeof special.minimum === "number" ? special.minimum : null;
  const multiplier = Number(special.multiplier ?? 1);
  const base = Number(special.base ?? 0);
  const applyMinimum = (value: number) => {
    const finalValue = minimum !== null ? Math.max(minimum, value) : value;
    return Number.isFinite(finalValue) ? String(finalValue) : null;
  };

  if (special.group === "LEVEL_BASED") return applyMinimum(operation === "MULTIPLY" ? level * multiplier : base + level);
  if (special.group === "PROFICIENCY_BONUS") {
    const bonus = findProficiencyBonus(level);
    return applyMinimum(operation === "MULTIPLY" ? bonus * multiplier : base + bonus);
  }
  if (special.group === "STAT_BASED") {
    const statLabel = findStatLabel(special.stat);
    return operation === "MULTIPLY" ? `${base}×мод. ${statLabel}` : `${base} + мод. ${statLabel}`;
  }
  return undefined;
}

function findStatLabel(stat: string | undefined): string {
  const key = String(stat || "").toUpperCase();
  return attributesUkrShort[key as keyof typeof attributesUkrShort] || key || "характеристики";
}
