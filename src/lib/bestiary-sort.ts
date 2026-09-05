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

function shuffleWithSeed(
  entries: readonly CreatureIndexEntry[],
  seed: number
): CreatureIndexEntry[] {
  const shuffled = [...entries];
  const nextRandom = createSeededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/// mulberry32: та сама сіянка дає ту саму перестановку, тож зміна фільтра чи пошуку не тасує
/// список заново під руками читача — він лише коротшає.
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCreatureShuffleSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
