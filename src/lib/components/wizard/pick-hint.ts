import { countWithWordUk, type UkrainianWordForms } from "@/lib/ukrainian-plural";

export const SKILL_FORMS: UkrainianWordForms = { one: "навичку", few: "навички", many: "навичок" };
export const LANGUAGE_FORMS: UkrainianWordForms = { one: "мову", few: "мови", many: "мов" };
export const WEAPON_KIND_FORMS: UkrainianWordForms = { one: "вид зброї", few: "види зброї", many: "видів зброї" };
export const INFUSION_FORMS: UkrainianWordForms = { one: "вливання", few: "вливання", many: "вливань" };
export const OPTION_FORMS: UkrainianWordForms = { one: "варіант", few: "варіанти", many: "варіантів" };
export const SPELL_FORMS: UkrainianWordForms = { one: "заклинання", few: "заклинання", many: "заклинань" };
export const CANTRIP_FORMS: UkrainianWordForms = { one: "замовляння", few: "замовляння", many: "замовлянь" };
export const POINT_FORMS: UkrainianWordForms = { one: "очко", few: "очка", many: "очок" };

/// «Оберіть ще 2 навички класу.» / «Обрано забагато: приберіть 1 мову.» / null, коли рівно.
export function buildPickHint(chosen: number, required: number, forms: UkrainianWordForms, suffix = ""): string | null {
  const tail = suffix ? ` ${suffix}` : "";
  if (chosen < required) return `Оберіть ще ${countWithWordUk(required - chosen, forms)}${tail}.`;
  if (chosen > required) return `Обрано забагато: приберіть ${countWithWordUk(chosen - required, forms)}${tail}.`;
  return null;
}

export function joinHints(hints: ReadonlyArray<string | null>): string | null {
  const present = hints.filter((hint): hint is string => Boolean(hint));
  return present.length ? present.join(" ") : null;
}

export function findFirstHint(hints: ReadonlyArray<string | null>): string | null {
  return hints.find((hint): hint is string => Boolean(hint)) ?? null;
}

export function countGroupSelection(selected: number | number[] | undefined | null): number {
  if (Array.isArray(selected)) return selected.length;
  return selected === undefined || selected === null ? 0 : 1;
}

export function buildGroupPickHint(groupName: string, chosen: number, required: number): string | null {
  return buildPickHint(chosen, required, OPTION_FORMS, `у групі «${groupName}»`);
}

export function buildSpendPointsHint(spent: number, total: number): string | null {
  if (spent < total) return `Розподіліть ще ${countWithWordUk(total - spent, POINT_FORMS)} підвищення характеристик.`;
  if (spent > total) return `Розподілено забагато: приберіть ${countWithWordUk(spent - total, POINT_FORMS)}.`;
  return null;
}
