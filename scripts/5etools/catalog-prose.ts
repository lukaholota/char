import { decomposeMarkup } from "./markup";
import { MIRRORED_CLASSES, readCachedValue } from "./mirror";
import { findEditionBySource, findLooseNameKey, RulesEdition } from "./schema";

export type SourceProse = {
  nameKeys: string[];
  nameEng: string;
  source: string;
  edition: RulesEdition;
  words: number;
};

type Json = Record<string, unknown>;

const PROSE_KEYS = new Set(["entries", "items", "entry"]);

export function readClassProse(): SourceProse[] {
  return MIRRORED_CLASSES.flatMap((name) =>
    readRecords(`class/fluff-class-${name}.json`, "classFluff").map((fluff) =>
      buildProse(String(fluff.name), String(fluff.source), findEditionBySource(String(fluff.source)), countOwnWords(fluff)),
    ),
  );
}

/// Вступ підкласу в 5etools — рядки першої фічі, названої як сам підклас; `subclassFluff`
/// додає до нього окремий текст лише в частини книг (XGE, TCE), тож рахуються обидва.
export function readSubclassProse(): SourceProse[] {
  return MIRRORED_CLASSES.flatMap((name) => {
    const path = `class/class-${name}.json`;
    const features = readRecords(path, "subclassFeature");
    const fluff = readRecords(`class/fluff-class-${name}.json`, "subclassFluff");

    return readRecords(path, "subclass").map((subclass) => {
      const edition = findEditionBySource(String(subclass.classSource));
      const intro = features.find((feature) => isSubclassIntro(feature, subclass));
      const own = fluff.find((entry) => isSameSubclass(entry, subclass));
      const words = countTopLevelWords(intro) + (own ? countOwnWords(own) : 0);
      const prose = buildProse(String(subclass.name), `${subclass.source}/${subclass.classSource}`, edition, words);
      return { ...prose, nameKeys: [...prose.nameKeys, findLooseNameKey(String(subclass.shortName))] };
    });
  });
}

export function readRaceRecords(): SourceProse[] {
  const races = readRecords("races.json", "race").map((race) =>
    buildProse(String(race.name), String(race.source), findEditionBySource(String(race.source)), 0),
  );
  const subraces = readRecords("races.json", "subrace")
    .filter((subrace) => typeof subrace.name === "string")
    .map((subrace) => {
      const name = `${subrace.raceName} (${subrace.name})`;
      return buildProse(name, String(subrace.source), findEditionBySource(String(subrace.source)), 0);
    });
  return [...races, ...subraces];
}

export function readRaceProse(): SourceProse[] {
  return readRecords("fluff-races.json", "raceFluff").map((fluff) =>
    buildProse(String(fluff.name), String(fluff.source), findEditionBySource(String(fluff.source)), countOwnWords(fluff)),
  );
}

function buildProse(nameEng: string, source: string, edition: RulesEdition, words: number): SourceProse {
  return { nameKeys: collectNameKeys(nameEng), nameEng, source, edition, words };
}

/// «Dwarf (Hill)» у 5etools — «Hill Dwarf» у нас; «Genasi (Air)» збігається й так.
function collectNameKeys(nameEng: string): string[] {
  const parts = nameEng.match(/^(.+?) \((.+)\)$/);
  const keys = [nameEng];
  if (parts) keys.push(`${parts[2]} ${parts[1]}`, parts[2]);
  return keys.map(findLooseNameKey);
}

function isSubclassIntro(feature: Json, subclass: Json): boolean {
  return (
    feature.name === subclass.name &&
    feature.subclassShortName === subclass.shortName &&
    feature.subclassSource === subclass.source &&
    feature.classSource === subclass.classSource
  );
}

function isSameSubclass(fluff: Json, subclass: Json): boolean {
  return fluff.name === subclass.name && fluff.source === subclass.source && fluff.classSource === subclass.classSource;
}

/// Запис із `_copy` успадковує прозу батька; своїми є лише елементи `_mod`, і тільки їх
/// рахувати чесно — інакше підраса отримує слова всієї раси.
function countOwnWords(record: Json): number {
  if (!("_copy" in record)) return countWords(record.entries);
  const modifications = ((record._copy as Json)._mod as Json | undefined)?.entries as Json | undefined;
  return countWords(modifications?.items);
}

function countTopLevelWords(feature: Json | undefined): number {
  const entries = feature?.entries;
  if (!Array.isArray(entries)) return 0;
  return entries.filter((entry): entry is string => typeof entry === "string").reduce((total, text) => total + countTextWords(text), 0);
}

function countWords(value: unknown): number {
  if (typeof value === "string") return countTextWords(value);
  if (Array.isArray(value)) return value.reduce<number>((total, item) => total + countWords(item), 0);
  if (value === null || typeof value !== "object") return 0;
  return Object.entries(value as Json)
    .filter(([key]) => PROSE_KEYS.has(key))
    .reduce((total, [, item]) => total + countWords(item), 0);
}

function countTextWords(text: string): number {
  const plain = decomposeMarkup(text).text.trim();
  return plain === "" ? 0 : plain.split(/\s+/).length;
}

function readRecords(path: string, key: string): Json[] {
  const file = readCachedValue(path) as Json;
  const records = file[key];
  if (records === undefined) return [];
  if (!Array.isArray(records)) throw new Error(`${path}: «${key}» — не масив`);
  return records as Json[];
}
