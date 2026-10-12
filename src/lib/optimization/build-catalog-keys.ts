import { getAllClasses } from "@/lib/classesData";
import type { CreatorContent } from "@/server/db/creator-content-query";
import { findSimilarKeysBySeparator } from "./build-similar-keys";

export type BuildCatalogKeys = {
  classKey: string; subclassKey?: string; raceKey: string | null; variantKey?: string;
  subraceKey: string | null; backgroundKey: string; featKey?: string; weapons: string[];
};

export function findCatalogKeyProblems(keys: BuildCatalogKeys, content: CreatorContent): string[] {
  const race = keys.raceKey ? content.races.find((entry) => entry.name === keys.raceKey) : undefined;
  return [
    ...findMissingKey("клас", "classKey", keys.classKey, content.classes.map((entry) => entry.name)),
    ...findMissingSubclass(keys),
    ...(keys.raceKey ? findMissingKey("раса", "raceKey", keys.raceKey, content.races.map((entry) => entry.name)) : ["Пресет 2014 потребує раси (raceKey не може бути null)"]),
    ...(keys.variantKey && race ? findMissingKey(`варіант раси ${keys.raceKey}`, "variantKey", keys.variantKey, race.raceVariants.map((entry) => entry.name)) : []),
    ...(keys.subraceKey && race ? findMissingKey(`підраса ${keys.raceKey}`, "subraceKey", keys.subraceKey, race.subraces.map((entry) => entry.name)) : []),
    ...findMissingKey("передісторія", "backgroundKey", keys.backgroundKey, content.backgrounds.map((entry) => entry.name)),
    ...(keys.featKey ? findMissingKey("риса", "featKey", keys.featKey, content.feats.map((entry) => entry.name)) : []),
    ...keys.weapons.flatMap((weapon) => findMissingKey("зброя", "equipment[].weapons", weapon, content.weapons.map((entry) => entry.name))),
  ];
}

export function findMissingKey(label: string, field: string, key: string, available: readonly string[]): string[] {
  if (available.includes(key)) return [];
  const similar = findSimilarKeys(key, available);
  return [`Немає в каталозі 2014: ${label} «${key}» (${field}).${similar.length ? ` Схожі: ${similar.join(", ")}` : ""}`];
}

function findMissingSubclass(keys: BuildCatalogKeys): string[] {
  const characterClass = getAllClasses("RULES_2014").find((entry) => entry.key === keys.classKey);
  if (!characterClass) return [];
  if (!keys.subclassKey) return characterClass.subclassLevel === 1 ? [`Клас ${keys.classKey} обирає підклас на 1-му рівні, тож subclassKey обовʼязковий`] : [];
  return findMissingKey(`підклас класу ${keys.classKey}`, "subclassKey", keys.subclassKey, characterClass.subclasses.map((entry) => entry.key));
}

export function findSimilarKeys(key: string, available: readonly string[]): string[] {
  return findSimilarKeysBySeparator(key, available, "_");
}

