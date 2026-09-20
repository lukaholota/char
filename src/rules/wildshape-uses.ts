/**
 * Ціна перевтілення у використаннях Дикої форми (KR24.5).
 *
 * Пул `WILD_SHAPE` носять шість фіч, але перетворюють лише дві: базова «Дика форма» (звір) і
 * «Дика форма елементаля» Кола місяця (елементаль, два використання). Решта — «Симбіотична
 * сутність», «Зоряна форма», «Дух дикого полумʼя», «Дух-тотем» — з того самого пулу тільки
 * витрачають і лишаються на ручному лічильнику слайда Рис.
 *
 * Тому ціну не можна брати ані першою-ліпшою фічею пулу, ані числом у коді: платить саме та
 * фіча, чиєю формою персонаж став, а число лежить у неї в `usePrice`.
 */

import type { Ruleset } from "./types";

export const WILDSHAPE_POOL_KEY = "WILD_SHAPE";

export type WildshapeUseFeature = {
  featureId: number;
  engName: string | null;
  usePrice: number | null;
};

/// Єдине місце, де тип істоти звʼязаний із фічею, що на неї перетворює: у даних такого звʼязку
/// немає — фіча елементальної форми ніде не називає своїх чотирьох статблоків (O24, «Поза
/// межами»).
const FORM_FEATURES_BY_CREATURE_TYPE = [
  { creatureType: "звір", engNames: ["Wild Shape", "Druid: Wild Shape (2024)"] },
  { creatureType: "елементаль", engNames: ["Elemental Wild Shape"] },
];

/// `null` — персонаж не має фічі, яка перетворює на істоту цього типу; платити нема кому.
export function findFormFeature<T extends WildshapeUseFeature>(
  features: T[],
  creatureType: string
): T | null {
  const engNames = findFormFeatureNames(creatureType);
  return features.find((feature) => feature.engName !== null && engNames.includes(feature.engName)) ?? null;
}

function findFormFeatureNames(creatureType: string): string[] {
  const type = (creatureType ?? "").trim().toLowerCase();
  return FORM_FEATURES_BY_CREATURE_TYPE.find((entry) => entry.creatureType === type)?.engNames ?? [];
}

/// Ціна завжди щонайменше одна: фіча без `usePrice` коштує використання, а не нуль.
export function findFormPrice(feature: WildshapeUseFeature | null): number {
  return Math.max(1, Math.trunc(Number(feature?.usePrice ?? 1)));
}

/// Вхід без залишку — попередження, а не заборона ([Р-3], [Р26]): застосунок трекер, а не
/// суддя, і за столом майстер може дозволити. Текст пишеться тут, щоб правило не отримало двох
/// формулювань — рівно як тексти причин придатності.
export function describeUseShortfall(input: { price: number; remaining: number }): string | null {
  if (input.remaining >= input.price) return null;

  return `Використань Дикої форми бракує: потрібно ${input.price}, лишилося ${Math.max(0, input.remaining)}. Перевтілення записане — вирішує майстер за столом.`;
}

/// Архідруїд 2014 (20 рівень друїда): «ви можете використовувати Дику форму без обмежень» —
/// лічильника більше немає, і вхід у форму нічого не списує. 2024 такого не дає взагалі: його
/// Archdruid (`data/2024/srd/classes.md:3630`) повертає одне використання на ініціативі й міняє
/// використання на комірку, тож правило свідомо звужене до 2014.
///
/// Рівень саме **друїда**, а не персонажа: Друїд 17 / Воїн 3 необмеженої Дикої форми не має.
const ARCHDRUID_LEVEL_2014 = 20;

export function hasUnlimitedWildshapeUses(input: { ruleset: Ruleset; druidLevel: number }): boolean {
  return input.ruleset === "RULES_2014" && Math.trunc(input.druidLevel) >= ARCHDRUID_LEVEL_2014;
}
