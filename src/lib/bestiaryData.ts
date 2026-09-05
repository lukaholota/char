/**
 * Static bestiary / creature data helpers for SSG pages and client catalogs.
 *
 * Reads from generated creatures JSON for both 2014 and 2024 editions.
 */

import { Ruleset } from "@prisma/client";
import type { CreatureSpeeds } from "@/rules/creature-speed";
import creatures2014Json from "@/lib/generated/creatures.json";
import creatures2024Json from "@/lib/generated/creatures2024.json";
import {
  type CreatureIndexEntry,
  buildCreatureIndexEntry,
  collectCreatureCRs,
  collectCreatureSizes,
  collectCreatureSources,
  collectCreatureTypes,
} from "./bestiary-index";
import { toEntitySlug } from "./slug-utils";

export { findSourceLabel } from "@/lib/refs/source-label";
export { type CreatureIndexEntry, buildCreatureIndexEntry, findEditionLabel } from "./bestiary-index";

export type CreatureData = {
  creatureId: number;
  name: string;
  nameEng: string;
  size: string;
  type: string;
  alignment: string;
  source: string;
  ac: string;
  hp: string;
  speed: string;
  strength: string;
  dexterity: string;
  constitution: string;
  intelligence: string;
  wisdom: string;
  charisma: string;
  skills: string;
  senses: string;
  languages: string;
  challenge: string;
  damageImmunity: string;
  damageResistance: string;
  conditionImmunity: string;
  savingThrows: string;
  specialAbilities: string;
  actions: string;
  reactions: string;
  legendaryActions: string;
  proficiencyBonus: string;
  description: string;
  lairActions: string;
  lairInfo: string;
  regionEffects: string;
  xp: string;
  ruleset: Ruleset;
  /// 2024 statblock fields (KR12.1). Optional because the inherited 2014 catalog predates them.
  initiative?: string;
  gear?: string;
  bonusActions?: string;
  damageVulnerability?: string;
  xpInLair?: string;
  imageUrl?: string;
  /// Розміри локального webp (KR12.4) — картка резервує місце під картинку до завантаження.
  imageWidth?: number;
  imageHeight?: number;
  /// Міфічні дії (KR16.3, партія 16) — окрема секція статблока, не різновид легендарних.
  mythicInfo?: string;
  mythicActions?: string;
} & CreatureSpeeds;

// 2014 creatures
const creatures2014: CreatureData[] = (creatures2014Json as CreatureData[]).map((c, index) => ({
  ...c,
  creatureId: c.creatureId || index + 1,
  ruleset: "RULES_2014" as Ruleset,
}));

// 2024 creatures
const creatures2024: CreatureData[] = (creatures2024Json as CreatureData[]).map((c, index) => ({
  ...c,
  creatureId: c.creatureId || 20001 + index,
  ruleset: "RULES_2024" as Ruleset,
}));

/**
 * Get all creatures for a given ruleset (defaults to RULES_2014)
 */
export function getAllCreatures(ruleset: Ruleset = "RULES_2014"): CreatureData[] {
  return ruleset === "RULES_2024" ? creatures2024 : creatures2014;
}

/**
 * Get creature by ID for a specific ruleset
 */
export function getCreatureById(id: number, ruleset: Ruleset = "RULES_2014"): CreatureData | undefined {
  const list = getAllCreatures(ruleset);
  return list.find((c) => c.creatureId === id);
}

/**
 * Get creature by ID or slug/name for a specific ruleset
 */
export function getCreatureByIdOrSlug(idOrSlug: string, ruleset: Ruleset = "RULES_2014"): CreatureData | undefined {
  const trimmed = idOrSlug.trim();
  const asNumber = Number(trimmed);

  if (Number.isFinite(asNumber)) {
    return getCreatureById(Math.trunc(asNumber), ruleset);
  }

  const slug = toEntitySlug(trimmed);
  const list = getAllCreatures(ruleset);
  return list.find(
    (c) =>
      toEntitySlug(c.nameEng) === slug ||
      toEntitySlug(c.name) === slug ||
      c.nameEng.toLowerCase() === trimmed.toLowerCase() ||
      c.name.toLowerCase() === trimmed.toLowerCase()
  );
}

/// Ключ, яким дані користувача посилаються на істоту (Р25). Не `creatureId` і не назва: слаг
/// англійської назви — те саме, чим уже адресуються сторінки бестіарію, тож нового способу
/// називати істоту не заводиться.
export function buildCreatureKey(creature: Pick<CreatureData, "nameEng">): string {
  return toEntitySlug(creature.nameEng);
}

/// Читач ключа. Порожній результат — не помилка, а стан: істота могла випасти з каталогу між
/// прикріпленням і читанням. Той, хто малює, показує «форма недоступна» й лишає рядок цілим.
export function findCreatureByKey(key: string, ruleset: Ruleset): CreatureData | null {
  const normalized = toEntitySlug(key);
  if (!normalized) return null;

  return getAllCreatures(ruleset).find((c) => toEntitySlug(c.nameEng) === normalized) ?? null;
}

/// Вузький індекс для списку каталогу — єдине, що їде в браузер (KR20.9). Будується раз на
/// редакцію: сторінки істот і `sitemap` теж імпортують цей модуль, а їм індекс не потрібен.
const creatureIndexes = new Map<Ruleset, CreatureIndexEntry[]>();

export function getCreatureIndex(ruleset: Ruleset = "RULES_2014"): CreatureIndexEntry[] {
  const cached = creatureIndexes.get(ruleset);
  if (cached) return cached;

  const index = getAllCreatures(ruleset).map(buildCreatureIndexEntry);
  creatureIndexes.set(ruleset, index);
  return index;
}

export function getAllCreatureTypes(ruleset: Ruleset = "RULES_2014"): string[] {
  return collectCreatureTypes(getCreatureIndex(ruleset));
}

export function getAllCreatureSizes(ruleset: Ruleset = "RULES_2014"): string[] {
  return collectCreatureSizes(getCreatureIndex(ruleset));
}

export function getAllCreatureCRs(ruleset: Ruleset = "RULES_2014"): string[] {
  return collectCreatureCRs(getCreatureIndex(ruleset));
}

export function getAllCreatureSources(ruleset: Ruleset = "RULES_2014"): string[] {
  return collectCreatureSources(getCreatureIndex(ruleset));
}
