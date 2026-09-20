/**
 * KR16.2 — механічні виправлення каталогу заклинань 2014.
 *
 * Вхід — data/2014/corrections/spells.json, звірений із пінованим корпусом 5etools.
 * Сід, що писав їх у базу, знято в KR34.5: текст заклинань тепер правиться в
 * `data/2014/spells.json`, а цей файл лишився записом звірки для гейта.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const CORRECTIONS_PATH = "data/2014/corrections/spells.json";

export type SpellCorrection = {
  engName: string;
  why: string;
  set?: Record<string, string | number>;
  replaceInDescription?: [string, string][];
  addClasses?: string[];
  removeClasses?: string[];
};

export function readSpellCorrections2014(): SpellCorrection[] {
  const raw = readFileSync(join(process.cwd(), CORRECTIONS_PATH), "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (parsed === null || typeof parsed !== "object" || !("corrections" in parsed)) {
    throw new Error(`${CORRECTIONS_PATH}: очікували обʼєкт із ключем corrections`);
  }

  const corrections = (parsed as { corrections: unknown }).corrections;
  if (!Array.isArray(corrections)) {
    throw new Error(`${CORRECTIONS_PATH}: corrections має бути масивом`);
  }

  return corrections as SpellCorrection[];
}
