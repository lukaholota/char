/**
 * KR31.5 — заклинання, які сам КЛАС тримає підготовленими 2024.
 *
 * Форма запису одна на весь SRD: «You always have the _Hunter's Mark_ spell prepared». Курсив і
 * є ознакою — там, де книга каже «the chosen / listed / these / those spells prepared», заклинання
 * не назване, бо його обирає гравець або дає таблиця підкласу.
 */

import type { SrdClassFeature } from "./verify-class-features";

export type ClassPreparedSpells2024 = {
  className: string;
  featureName: string;
  level: number;
  spellsEng: string[];
};

const ALWAYS_PREPARED = /always have the ((?:_[^_\n]+_(?:,? and | or |, )?)+)\s*spells? prepared/g;

export function extractClassPreparedSpells2024(
  features: readonly SrdClassFeature[],
): ClassPreparedSpells2024[] {
  return features.flatMap((feature) => {
    const spellsEng = readNamedSpells(feature.body);
    if (!spellsEng.length) return [];

    return [{ className: feature.className, featureName: feature.name, level: feature.level, spellsEng }];
  });
}

function readNamedSpells(body: string): string[] {
  const names: string[] = [];

  for (const match of body.matchAll(ALWAYS_PREPARED)) {
    for (const italic of match[1].matchAll(/_([^_\n]+)_/g)) names.push(italic[1].trim());
  }

  return names;
}
