import { buildMediaImageUrl } from "@/lib/media-url";
import { findCreatureHitPoints, isCreatureDown, type CreatureHitPoints } from "@/rules/creature-hit-points";
import type { TokenPosition } from "@/rules/game-map";
import { normalizeTokenConditions, type TokenConditions } from "@/rules/token-conditions";
import { readTokenTransform, type TokenTransform } from "@/rules/token-transform";

export const MAP_CREATURE_LIMITS = { perScene: 40, perAdd: 10, keyLength: 120, customNameLength: 40, imagesPerUser: 60 } as const;
export const MAP_CREATURE_RULESETS = ["RULES_2014", "RULES_2024"] as const;
export type MapCreatureRuleset = (typeof MAP_CREATURE_RULESETS)[number];

export const TOKEN_NAME_MODES = ["short", "wrap", "full"] as const;
export type TokenNameMode = (typeof TOKEN_NAME_MODES)[number];

export const CREATURE_TOKEN_SIZES = ["tiny", "small", "medium", "large", "huge", "gargantuan"] as const;
export type CreatureTokenSize = (typeof CREATURE_TOKEN_SIZES)[number];

/// Множник до розміру токена героя: дракон на мапі більший за пацюка ще до того, як майстер щось змінить.
export const CREATURE_TOKEN_SIZE_SCALES: Record<CreatureTokenSize, number> = { tiny: 0.6, small: 0.8, medium: 1, large: 1.5, huge: 2, gargantuan: 2.6 };
/// Скільки клітинок сітки займає істота: крихітна — пів клітинки, велика — 2×2, гігантська — 4×4.
export const CREATURE_SIZE_CELLS: Record<CreatureTokenSize, number> = { tiny: 0.5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 };
export const CREATURE_TOKEN_SIZE_LABELS: Record<CreatureTokenSize, string> = {
  tiny: "Крихітний",
  small: "Малий",
  medium: "Середній",
  large: "Великий",
  huge: "Величезний",
  gargantuan: "Гігантський",
};

export type MapCreatureRow = {
  id: number;
  creatureKey: string;
  ruleset: MapCreatureRuleset;
  number: number;
  isAlly: boolean;
  customName: string | null;
  tokenSize: string | null;
  isCutout: boolean;
  customImageKey: string | null;
  tokenX: number | null;
  tokenY: number | null;
  tokenRotation: number;
  tokenScalePercent: number;
  hpMax: number | null;
  hpCurrent: number | null;
  conditions: string[];
  exhaustionLevel: number;
};
export type MapCreatureCatalogEntry = { name: string; size: string; hp?: string; imageUrl?: string; imageShape?: "round" };

/// creatureKey — лише майстру: статблок гравцям не віддається ніколи, картинка й назва лишаються.
/// customName і statblockName бачить лише майстер.
/// Числа хітів бачить лише майстер; гравцям іде тільки isDown.
export type MapCreatureView = {
  id: number;
  creatureKey: string | null;
  ruleset: MapCreatureRuleset;
  label: string;
  statblockName: string | null;
  customName: string | null;
  badge: number | null;
  isAlly: boolean;
  imageUrl: string | null;
  isRoundImage: boolean;
  customImageKey: string | null;
  tokenSize: CreatureTokenSize;
  isCutout: boolean;
  token: TokenPosition | null;
  tokenTransform: TokenTransform;
  hitPoints: CreatureHitPoints | null;
  isDown: boolean;
  conditions: TokenConditions;
};

export type NewMapCreatures = { creatureKey: string; ruleset: MapCreatureRuleset; count: number; isAlly: boolean; customName: string | null };

export function parseNewMapCreatures(raw: unknown): NewMapCreatures | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { creatureKey, ruleset, count, isAlly, customName } = raw as Record<string, unknown>;
  if (typeof creatureKey !== "string" || !creatureKey || creatureKey.length > MAP_CREATURE_LIMITS.keyLength) return null;
  if (!MAP_CREATURE_RULESETS.includes(ruleset as MapCreatureRuleset) || typeof isAlly !== "boolean") return null;
  if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > MAP_CREATURE_LIMITS.perAdd) return null;
  const name = parseCustomName(customName);
  if (name === undefined) return null;
  return { creatureKey, ruleset: ruleset as MapCreatureRuleset, count: count as number, isAlly, customName: name };
}

/// undefined — недійсне імʼя; null — імені немає, гравці бачать справжню істоту.
export function parseCustomName(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length > MAP_CREATURE_LIMITS.customNameLength) return undefined;
  return name || null;
}

export function parseTokenNameMode(raw: unknown): TokenNameMode | null {
  return TOKEN_NAME_MODES.includes(raw as TokenNameMode) ? (raw as TokenNameMode) : null;
}

export function parseCreatureTokenSize(raw: unknown): CreatureTokenSize | null {
  return CREATURE_TOKEN_SIZES.includes(raw as CreatureTokenSize) ? (raw as CreatureTokenSize) : null;
}

/// «Малий або Середній» — береться перший розмір.
export function findStatblockTokenSize(sizeLabel: string | undefined): CreatureTokenSize {
  const first = sizeLabel?.split(/\s+/)[0];
  return CREATURE_TOKEN_SIZES.find((size) => CREATURE_TOKEN_SIZE_LABELS[size] === first) ?? "medium";
}

/// Перейменовані істоти рахуються за своїм іменем, а не за статблоком: «Тінь 1, 2» не видають, що це ті самі гобліни.
export function findCreatureGroupKey(row: Pick<MapCreatureRow, "creatureKey" | "ruleset" | "customName">): string {
  return row.customName ? `name:${row.customName}` : `kind:${row.ruleset}:${row.creatureKey}`;
}

/// Нові копії займають найменші вільні номери: прибраний «Гоблін 2» звільняє двійку для наступного.
export function findFreeCreatureNumbers(takenNumbers: number[], count: number): number[] {
  const taken = new Set(takenNumbers);
  const free: number[] = [];
  for (let number = 1; free.length < count; number++) if (!taken.has(number)) free.push(number);
  return free;
}

/// Гравці бачать лише істот на мапі: ряд під мапою — підготовка майстра до бою.
export function buildMapCreatureViews(
  rows: MapCreatureRow[],
  findEntry: (key: string, ruleset: MapCreatureRuleset) => MapCreatureCatalogEntry | null,
  isGm: boolean,
): MapCreatureView[] {
  const copiesByGroup = new Map<string, number>();
  for (const row of rows) copiesByGroup.set(findCreatureGroupKey(row), (copiesByGroup.get(findCreatureGroupKey(row)) ?? 0) + 1);
  return rows
    .filter((row) => isGm || row.tokenX !== null)
    .map((row) => {
      const entry = findEntry(row.creatureKey, row.ruleset);
      const hasCopies = (copiesByGroup.get(findCreatureGroupKey(row)) ?? 0) > 1;
      const statblockName = entry?.name ?? row.creatureKey;
      const name = row.customName ?? statblockName;
      const hitPoints = findCreatureHitPoints(row, entry?.hp);
      return {
        id: row.id,
        creatureKey: isGm ? row.creatureKey : null,
        ruleset: row.ruleset,
        label: hasCopies ? `${name} ${row.number}` : name,
        statblockName: isGm && row.customName ? statblockName : null,
        customName: isGm ? row.customName : null,
        badge: hasCopies ? row.number : null,
        isAlly: row.isAlly,
        imageUrl: row.customImageKey ? buildMediaImageUrl(row.customImageKey, "full") : entry?.imageUrl ?? null,
        isRoundImage: !row.customImageKey && entry?.imageShape === "round",
        customImageKey: isGm ? row.customImageKey : null,
        tokenSize: parseCreatureTokenSize(row.tokenSize) ?? findStatblockTokenSize(entry?.size),
        isCutout: row.isCutout,
        token: row.tokenX !== null && row.tokenY !== null ? { x: row.tokenX, y: row.tokenY } : null,
        tokenTransform: readTokenTransform(row),
        hitPoints: isGm ? hitPoints : null,
        isDown: isCreatureDown(hitPoints),
        conditions: normalizeTokenConditions(row),
      };
    });
}

export function buildCreatureInitials(label: string): string {
  const words = label.replace(/\s+\d+$/, "").split(/[\s-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}
