import { AREA_LIMITS, type AreaShape } from "./game-areas";

export type SpellArea = { shape: AreaShape; sizeFeet: number };
export type SpellAreaSource = { engName: string; range: string; description: string };
type AreaPhrase = { index: number; area: SpellArea };

const LETTERS = "[\\p{L}ʼ']*";
const SIZE = "(\\d+)";
const LENGTH_WORD = "(?:[\\p{L}ʼ']+\\s+){0,3}?(?:завдовжки|довжиною)\\s+";
const FEET = "ф(?:ут|т)";

const AREA_PATTERNS: { shape: AreaShape; pattern: RegExp }[] = [
  { shape: "cone", pattern: new RegExp(`${SIZE}-футов${LETTERS}\\s+конус|конус${LETTERS}\\s+(?:${LENGTH_WORD})?${SIZE}\\s+${FEET}`, "iu") },
  { shape: "line", pattern: new RegExp(`${SIZE}-футов${LETTERS}\\s+лін|лін${LETTERS}\\s+(?:${LENGTH_WORD})?${SIZE}\\s+${FEET}`, "iu") },
  { shape: "square", pattern: new RegExp(`${SIZE}-футов${LETTERS}\\s+куб|куб${LETTERS}\\s+(?:(?:зі\\s+стороною|з\\s+ребром)\\s+)?${SIZE}\\s+${FEET}`, "iu") },
  {
    shape: "circle",
    pattern: new RegExp(`(?:сфер|півсфер|напівсфер|цилінд|випромінюван)${LETTERS}[^.]{0,45}?радіус${LETTERS}\\s+(?:до\\s+)?${SIZE}\\s+${FEET}|${SIZE}-футов${LETTERS}\\s+радіус`, "iu"),
  },
];

const RANGE_RADIUS_PATTERN = new RegExp(`радіус${LETTERS}\\s+${SIZE}\\s+${FEET}`, "iu");
const SIZE_CAP_CUE = /поміщ|вміщ|поміст|вміст|не більш|не може бути|перебільш|завбільшки|розміром|[ву] межах\s*$/iu;

/// Згадка розміру в тексті є, але області дії на мапі немає: стіни, дихання, купа кубів.
const AREA_OVERRIDES: Record<string, SpellArea | null> = {
  "Booming Blade": null,
  "Green-Flame Blade": null,
  "Flaming Sphere": null,
  "Hallucinatory Terrain": null,
  "Heroes' Feast": null,
  "Fire Storm": null,
  "Draconic Transformation": null,
  "Illusory Dragon": null,
  "Wall of Force": null,
  "Wall of Ice": null,
  "Aganazzar's Scorcher": { shape: "line", sizeFeet: 30 },
  "Thunder Step": { shape: "circle", sizeFeet: 10 },
  "Glyph of Warding": { shape: "circle", sizeFeet: 20 },
  "Plant Growth": { shape: "circle", sizeFeet: 100 },
  "Maelstrom": { shape: "circle", sizeFeet: 30 },
  "Earthquake": { shape: "circle", sizeFeet: 100 },
  "Warding Wind": { shape: "circle", sizeFeet: 10 },
  "Calm Emotions": { shape: "circle", sizeFeet: 20 },
};

function findFirstAreaPhrase(text: string): AreaPhrase | null {
  let first: AreaPhrase | null = null;
  for (const { shape, pattern } of AREA_PATTERNS) {
    const match = pattern.exec(text);
    if (!match || (first && first.index <= match.index)) continue;
    first = { index: match.index, area: { shape, sizeFeet: Number(match.slice(1).find((group) => group !== undefined)) } };
  }
  return first;
}

function findRangeArea(range: string): SpellArea | null {
  const radius = RANGE_RADIUS_PATTERN.exec(range);
  return findFirstAreaPhrase(range)?.area ?? (radius ? { shape: "circle", sizeFeet: Number(radius[1]) } : null);
}

function findDescriptionArea(description: string): SpellArea | null {
  const text = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const phrase = findFirstAreaPhrase(text);
  if (!phrase) return null;
  const isSizeLimit = phrase.area.shape === "square" && SIZE_CAP_CUE.test(text.slice(Math.max(0, phrase.index - 40), phrase.index));
  return isSizeLimit ? null : phrase.area;
}

const isSizeInRange = (area: SpellArea) => area.sizeFeet >= AREA_LIMITS.minFeet && area.sizeFeet <= AREA_LIMITS.maxFeet;

export function findSpellArea(spell: SpellAreaSource): SpellArea | null {
  if (spell.engName in AREA_OVERRIDES) return AREA_OVERRIDES[spell.engName];
  const area = findRangeArea(spell.range) ?? findDescriptionArea(spell.description);
  return area && isSizeInRange(area) ? area : null;
}
