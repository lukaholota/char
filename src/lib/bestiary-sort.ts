import type { CreatureIndexEntry } from "./bestiary-index";
import { findCreatureBaseType } from "./bestiary-index";
import { parseChallengeRating } from "@/rules/wildshape";

/// Порядок каталогу — вибір читача, і всі пʼять варіантів рахуються в браузері. Серверна віддача
/// лишається байт-у-байт тією самою, тож статична сторінка бестіарію (KR22.4) кешується як і
/// кешувалася; перемішування на сервері зробило б кожну відповідь унікальною.
export type CreatureSortMode = "random" | "cr-asc" | "cr-desc" | "type" | "name";

export const CREATURE_SORT_MODES: readonly { mode: CreatureSortMode; label: string }[] = [
  { mode: "random", label: "Випадковий порядок" },
  { mode: "cr-asc", label: "CR — від меншого" },
  { mode: "cr-desc", label: "CR — від більшого" },
  { mode: "type", label: "За типом істоти" },
  { mode: "name", label: "За абеткою" },
];

export const DEFAULT_CREATURE_SORT: CreatureSortMode = "random";

/// Пікер звіриних форм відкривається з CR згори — там читач шукає найсильнішу доступну форму,
/// а не гортає каталог.
export const WILDSHAPE_PICKER_SORT: CreatureSortMode = "cr-desc";

export function parseCreatureSortMode(raw: string | null): CreatureSortMode {
  return CREATURE_SORT_MODES.some((option) => option.mode === raw)
    ? (raw as CreatureSortMode)
    : DEFAULT_CREATURE_SORT;
}

export function findCreatureSortLabel(mode: CreatureSortMode): string {
  return CREATURE_SORT_MODES.find((option) => option.mode === mode)?.label ?? "";
}

/// `seed === null` — це перший рендер до монтування: сторінка віддається статично, тож
/// перемішати можна лише тоді, коли клієнт уже взяв кермо, інакше розмітка сервера й браузера
/// розійдуться на гідратації.
export function sortCreatureIndex(
  entries: readonly CreatureIndexEntry[],
  mode: CreatureSortMode,
  seed: number | null
): CreatureIndexEntry[] {
  if (mode === "random") {
    return seed === null ? [...entries] : shuffleWithSeed(entries, seed);
  }

  return [...entries].sort(findCreatureComparator(mode));
}

type CreatureComparator = (left: CreatureIndexEntry, right: CreatureIndexEntry) => number;

function findCreatureComparator(mode: Exclude<CreatureSortMode, "random">): CreatureComparator {
  const byName: CreatureComparator = (left, right) => left.name.localeCompare(right.name, "uk");

  switch (mode) {
    case "cr-asc":
      return chain(compareChallengeAscending, byName);
    case "cr-desc":
      return chain(compareChallengeDescending, byName);
    case "type":
      return chain(compareBaseType, compareChallengeAscending, byName);
    case "name":
      return chain(byName, compareChallengeAscending);
  }
}

/// Істота без CR — прикликання або статблок-заготовка — тоне в кінець за обох напрямків: це
/// «немає значення», а не «нуль», тож у спадному порядку їй не місце попереду дракона.
function compareChallengeAscending(left: CreatureIndexEntry, right: CreatureIndexEntry): number {
  return compareChallenge(left, right, 1);
}

function compareChallengeDescending(left: CreatureIndexEntry, right: CreatureIndexEntry): number {
  return compareChallenge(left, right, -1);
}

function compareChallenge(
  left: CreatureIndexEntry,
  right: CreatureIndexEntry,
  direction: 1 | -1
): number {
  const leftCR = parseChallengeRating(left.challenge);
  const rightCR = parseChallengeRating(right.challenge);

  if (leftCR === null || rightCR === null) {
    return (leftCR === null ? 1 : 0) - (rightCR === null ? 1 : 0);
  }

  return (leftCR - rightCR) * direction;
}

function compareBaseType(left: CreatureIndexEntry, right: CreatureIndexEntry): number {
  return findCreatureBaseType(left.type).localeCompare(findCreatureBaseType(right.type), "uk");
}

function chain(...comparators: CreatureComparator[]): CreatureComparator {
  return (left, right) => {
    for (const compare of comparators) {
      const result = compare(left, right);
      if (result !== 0) return result;
    }
    return 0;
  };
}

/// Ранг кожної істоти залежить лише від сіянки та її ключа, а не від сусідів: фільтр, пошук чи
/// дозавантажене хоумбрю лише прибирають або вставляють рядки, решта не тасується заново.
function shuffleWithSeed(
  entries: readonly CreatureIndexEntry[],
  seed: number
): CreatureIndexEntry[] {
  return entries
    .map((entry) => ({ entry, rank: findShuffleRank(entry.key, seed) }))
    .sort((left, right) => left.rank - right.rank)
    .map(({ entry }) => entry);
}

/// FNV-1a з сіянкою замість базового зсуву, а наприкінці перемішування бітів з murmur3.
function findShuffleRank(key: string, seed: number): number {
  let hash = (seed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
}

export function createCreatureShuffleSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
