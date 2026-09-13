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
