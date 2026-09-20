/**
 * Опції підкласу, які книга дозволяє перевибрати після довгого відпочинку — Коло землі 2024:
 * «Whenever you finish a Long Rest, choose one type of land». Платформа не примушує чекати
 * відпочинку (як і з формами Дикої форми, KR24.6): перевибір доступний з листа будь-коли,
 * а підказка називає відпочинок.
 */

import type { RulesetId } from "./strategies/types";

export type RechoosableSubclassOptionGroup = {
  ruleset: RulesetId;
  groupName: string;
  /** Що саме перевибирає гравець — підпис кнопки на листі. */
  actionLabel: string;
  hint: string;
};

const RECHOOSABLE_GROUPS: readonly RechoosableSubclassOptionGroup[] = [
  {
    ruleset: "RULES_2024",
    groupName: "Коло землі",
    actionLabel: "Змінити землю",
    hint: "Книга дає обрати тип землі щоразу після довгого відпочинку; заклинання попередньої землі зникають, нової — стають підготовленими.",
  },
];

export function findRechoosableSubclassOptionGroup(groupName: string, ruleset: RulesetId): RechoosableSubclassOptionGroup | null {
  return RECHOOSABLE_GROUPS.find((group) => group.groupName === groupName && group.ruleset === ruleset) ?? null;
}
