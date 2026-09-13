import type { Ability } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import { calculateSpellAttack, calculateSpellDC, getSimpleBonus } from "@/lib/logic/bonus-calculator";
import { classTranslations, featTranslations, subclassTranslations } from "@/lib/refs/translation";
import type { SpellSource } from "@/rules/spell-sources";

export type SpellcastingStatRow = {
  key: string;
  label: string;
  ability: Ability | null;
  attackBonus: number;
  saveDC: number;
};

const NO_SOURCE_ROW_KEY = "no-source";

/**
 * КС і атака за кожним джерелом заклинань (клас, підклас третинного заклинача, родовід, риса).
 * Без жодного джерела лист тримає один рядок без характеристики — ручний бонус і там видно.
 */
export function buildSpellcastingStatRows(pers: PersWithRelations, sources: readonly SpellSource[]): SpellcastingStatRow[] {
  if (sources.length === 0) return [buildRowWithoutAbility(pers)];

  return sources.map((source) => buildRow(pers, source));
}

function buildRow(pers: PersWithRelations, source: SpellSource): SpellcastingStatRow {
  const ability = source.ability as Ability | null;
  if (!ability) return { ...buildRowWithoutAbility(pers), key: source.key, label: translateSourceName(source.name) };

  return {
    key: source.key,
    label: translateSourceName(source.name),
    ability,
    attackBonus: calculateSpellAttack(pers, ability),
    saveDC: calculateSpellDC(pers, ability),
  };
}

function buildRowWithoutAbility(pers: PersWithRelations): SpellcastingStatRow {
  return {
    key: NO_SOURCE_ROW_KEY,
    label: "",
    ability: null,
    attackBonus: getSimpleBonus(pers, "spellAttack"),
    saveDC: 8 + getSimpleBonus(pers, "spellDC"),
  };
}

function translateSourceName(name: string): string {
  const known = classTranslations as Partial<Record<string, string>>;
  const subclasses = subclassTranslations as Partial<Record<string, string>>;
  return known[name] ?? subclasses[name] ?? featTranslations[name] ?? name;
}
