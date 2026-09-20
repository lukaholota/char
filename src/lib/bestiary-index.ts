import type { Ruleset } from "@prisma/client";
import type { CreatureData } from "./bestiaryData";
import { matchesSourceSelection, type SourceSelection } from "./catalog-source-filter";
import { findSourceLabel } from "./refs/source-label";
import { toEntitySlug } from "./slug-utils";

/// Рядок списку бестіарію, і нічого більше (дефект №9 у docs/STATE.md). Каталог істот важить
/// 4,7 МіБ, і 64% цієї ваги — тексти дій, особливостей і описів, які потрібні лише розгорнутому
/// статблоку. Список фільтрує й малює ось ці поля, тож у браузер їде тільки вони, а повний запис
/// довантажується на розкриття.
export type CreatureIndexEntry = {
  key: string;
  creatureId: number;
  name: string;
  nameEng: string;
  type: string;
  size: string;
  challenge: string;
  source: string;
  ac: string;
  hp: string;
  imageUrl?: string;
  /// Швидкості, які питає правило придатності Дикої форми (KR24.1): політ і плавання обмежені
  /// рівнем друїда, лазіння не обмежене ніде, але фільтр каталогу ним користується. Ключ без
  /// швидкості означає «режиму немає» — розріджений запис коштує 12,5 КіБ на 1 490 істот проти
  /// 113 КіБ, якби кожен запис ніс пʼять полів із `null`.
  flySpeed?: number;
  swimSpeed?: number;
  climbSpeed?: number;
  hasConditionalSpeed?: boolean;
};

export type CreatureSelection = {
  q: string;
  types: Set<string>;
  sizes: Set<string>;
  crs: Set<string>;
  source: SourceSelection;
  moves: Set<string>;
};

/// Способи пересування, за якими фільтрує каталог: індекс несе лише ці три швидкості.
export const CREATURE_MOVE_LABELS = {
  fly: "Літає",
  swim: "Плаває",
  climb: "Лазить",
} as const;

export type CreatureMove = keyof typeof CREATURE_MOVE_LABELS;

export function hasCreatureMove(entry: CreatureIndexEntry, move: string): boolean {
  if (move === "fly") return (entry.flySpeed ?? 0) > 0;
  if (move === "swim") return (entry.swimSpeed ?? 0) > 0;
  if (move === "climb") return (entry.climbSpeed ?? 0) > 0;
  return false;
}

/// Позначка редакції для рядка каталогу й пошуку: та сама істота у двох редакціях — це два
/// записи ([Р12](docs/DECISIONS.md#р12)), тож рядок мусить казати, який саме.
export function findEditionLabel(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "2024" : "2014";
}

export function buildCreatureIndexEntry(creature: CreatureData): CreatureIndexEntry {
  return {
    key: toEntitySlug(creature.nameEng),
    creatureId: creature.creatureId,
    name: creature.name,
    nameEng: creature.nameEng,
    type: creature.type,
    size: creature.size,
    challenge: creature.challenge,
    source: creature.source,
    ac: creature.ac,
    hp: creature.hp,
    ...(creature.imageUrl ? { imageUrl: creature.imageUrl } : {}),
    ...findIndexedSpeeds(creature),
  };
}

function findIndexedSpeeds(creature: CreatureData): Partial<CreatureIndexEntry> {
  return {
    ...(creature.flySpeed !== null ? { flySpeed: creature.flySpeed } : {}),
    ...(creature.swimSpeed !== null ? { swimSpeed: creature.swimSpeed } : {}),
    ...(creature.climbSpeed !== null ? { climbSpeed: creature.climbSpeed } : {}),
    ...(creature.hasConditionalSpeed ? { hasConditionalSpeed: true } : {}),
  };
}

/// «Монстр (перевертень)» фільтрується за базовим типом, а підтип у дужках лишається тільки в
/// підписі рядка.
export function findCreatureBaseType(type: string): string {
  return type.split("(")[0].trim();
}

/// Текст, по якому шукає рядок пошуку каталогу. Вузька частина — назви, тип і розмір — лежить у
/// індексі й збігається миттєво; повна додає прозу статблока й тому рахується на сервері
/// ([findCreatureKeysMatchingText]). Вузька — префікс повної, тож обʼєднання двох фаз дає рівно
/// той самий набір, що й один синхронний пошук по всьому запису до KR20.9.
export function buildIndexedSearchText(entry: CreatureIndexEntry): string {
  return `${entry.name} ${entry.nameEng} ${entry.type} ${entry.size}`.toLowerCase();
}

/// Якір на стан (O34) стоїть посеред фрази — без зняття тегів «отримує стан повалений» не знаходився б.
export function buildFullSearchText(creature: CreatureData): string {
  return `${creature.name} ${creature.nameEng} ${creature.type} ${creature.size} ${creature.description} ${creature.specialAbilities} ${creature.actions}`
    .replace(/<\/?a\b[^>]*>/g, "")
    .toLowerCase();
}

export function rankNameMatchesFirst(entries: readonly CreatureIndexEntry[], query: string): CreatureIndexEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...entries];
  const tiers: CreatureIndexEntry[][] = [[], [], []];
  for (const entry of entries) tiers[findNameMatchTier(entry, needle)].push(entry);
  return tiers.flat();
}

function findNameMatchTier(entry: CreatureIndexEntry, needle: string): number {
  const words = `${entry.name} ${entry.nameEng}`.toLowerCase().split(/[\s\-()[\],]+/);
  if (words.some((word) => word.startsWith(needle))) return 0;
  return words.join(" ").includes(needle) ? 1 : 2;
}

export function matchesCreatureSelection(
  entry: CreatureIndexEntry,
  selection: CreatureSelection,
  deepMatchKeys: ReadonlySet<string> | null
): boolean {
  const q = selection.q.trim().toLowerCase();
  if (q && !buildIndexedSearchText(entry).includes(q) && !deepMatchKeys?.has(entry.key)) return false;

  if (selection.types.size > 0 && (!entry.type || !selection.types.has(findCreatureBaseType(entry.type)))) {
    return false;
  }
  if (selection.sizes.size > 0 && (!entry.size || !selection.sizes.has(entry.size))) return false;
  if (selection.crs.size > 0 && (!entry.challenge || !selection.crs.has(entry.challenge))) return false;
  if (!matchesSourceSelection(entry.source, selection.source)) return false;
  if (selection.moves.size > 0 && !Array.from(selection.moves).some((move) => hasCreatureMove(entry, move))) {
    return false;
  }

  return true;
}

export function collectCreatureTypes(entries: readonly CreatureIndexEntry[]): string[] {
  return collectDistinct(entries, (entry) => findCreatureBaseType(entry.type)).sort((a, b) =>
    a.localeCompare(b, "uk")
  );
}

export function collectCreatureSizes(entries: readonly CreatureIndexEntry[]): string[] {
  return collectDistinct(entries, (entry) => entry.size.trim());
}

export function collectCreatureCRs(entries: readonly CreatureIndexEntry[]): string[] {
  return collectDistinct(entries, (entry) => entry.challenge.trim());
}

export function collectCreatureSources(entries: readonly CreatureIndexEntry[]): string[] {
  return collectDistinct(entries, (entry) => entry.source.trim()).sort((a, b) =>
    findSourceLabel(a).localeCompare(findSourceLabel(b), "uk")
  );
}

function collectDistinct(
  entries: readonly CreatureIndexEntry[],
  read: (entry: CreatureIndexEntry) => string
): string[] {
  const values = new Set<string>();
  for (const entry of entries) {
    const value = read(entry);
    if (value) values.add(value);
  }
  return Array.from(values);
}
