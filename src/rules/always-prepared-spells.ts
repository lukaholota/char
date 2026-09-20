/**
 * KR31.5 — заклинання, які персонаж тримає підготовленими не своїм вибором, а правилом.
 *
 * Джерел два: підклас («Домен життя дає Aid із 3-го рівня клірика») і сам клас («Улюблений ворог
 * дає Hunter's Mark із 1-го рівня слідопита»). Обидва відкриваються рівнем КЛАСУ, а не персонажа,
 * і мультиклас цього не пришвидшує, тому рівень приходить на кожне джерело окремо.
 */

import type { GrantedSpell } from "./spell-sources";
import type { AbilityKey } from "./types";

export type AlwaysPreparedSpellRow = { spellId: number; classLevel: number };

export type AlwaysPreparedSpellSource = {
  /** Стабільний ключ джерела — назва підкласу або фічі з бази, а не показовий рядок. */
  sourceKey: string;
  sourceName: string;
  classLevel: number;
  ability: AbilityKey | null;
  spells: readonly AlwaysPreparedSpellRow[];
};

export function findEarnedAlwaysPreparedSpells(
  sources: readonly AlwaysPreparedSpellSource[],
  ownedSpellIds: readonly number[],
): GrantedSpell[] {
  const alreadyGranted = new Set(ownedSpellIds);
  const earned: GrantedSpell[] = [];

  for (const source of sources) {
    for (const row of source.spells) {
      if (row.classLevel > source.classLevel) continue;
      if (alreadyGranted.has(row.spellId)) continue;

      alreadyGranted.add(row.spellId);
      earned.push({
        spellId: row.spellId,
        sourceKey: source.sourceKey,
        sourceName: source.sourceName,
        ability: source.ability,
      });
    }
  }

  return earned;
}

export type PreparedLockSpellRow = {
  level: number;
  origin: string | null | undefined;
  excludeFromPreparedCount: boolean | null | undefined;
};

/**
 * «You always have that spell prepared»: рядок, покладений правилом (риса, вид, підклас, опція
 * класу), підготований завжди й понад ліміт, тож зняти підготовку з нього не можна — на листі
 * галочка замкнена, а сервер відмовляє й офлайн-черзі.
 *
 * Ознака — підпис самого рядка: його поклало правило (`origin` не `MANUAL`) і воно ж вивело його
 * з ліміту підготовки. Заклинання, яке гравець вивів із ліміту руками в редакторі бейджа, лишається
 * `MANUAL` і замку не підлягає.
 */
export function isAlwaysPreparedSpell(row: PreparedLockSpellRow): boolean {
  if (row.level <= 0) return false;

  return Boolean(row.excludeFromPreparedCount) && isGrantedByRule(row.origin);
}

function isGrantedByRule(origin: string | null | undefined): boolean {
  const value = String(origin ?? "");
  return value.length > 0 && value !== "MANUAL";
}
