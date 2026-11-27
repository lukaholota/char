import { isRecord } from "./abilities";

export type MagicSystem = "SLOTS" | "POINTS";
export type SharedHouseRules = { attunementLimit: number | null; magicSystem: MagicSystem | null };
export type PersHouseRules = SharedHouseRules & { darkvisionRange: number | null };
/// isDamageConfirmedByGm — шкода гравців чекає майстра; у старих кампаніях поля немає, і це вмикає перевірку.
export type CampaignHouseRules = SharedHouseRules & { damageTypes: string[]; isDamageConfirmedByGm: boolean };
export type HouseRules = { attunementLimit: number | null; magicSystem: MagicSystem; damageTypes: string[] };

export const ATTUNEMENT_LIMIT_MAX = 20;
export const CUSTOM_DAMAGE_TYPES_LIMIT = 8;
export const CUSTOM_DAMAGE_TYPE_MAX_LENGTH = 24;
export const DARKVISION_OVERRIDE_MAX = 300;

export function parsePersHouseRules(value: unknown): PersHouseRules {
  const raw = isRecord(value) ? value : {};
  return { ...parseSharedHouseRules(raw), darkvisionRange: readWholeInRange(raw.darkvisionRange, 0, DARKVISION_OVERRIDE_MAX) };
}

function parseSharedHouseRules(raw: Record<string, unknown>): SharedHouseRules {
  return {
    attunementLimit: readWholeInRange(raw.attunementLimit, 1, ATTUNEMENT_LIMIT_MAX),
    magicSystem: raw.magicSystem === "SLOTS" || raw.magicSystem === "POINTS" ? raw.magicSystem : null,
  };
}

function readWholeInRange(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

export function parseCampaignHouseRules(value: unknown): CampaignHouseRules {
  const raw = isRecord(value) ? value : {};
  return { ...parseSharedHouseRules(raw), damageTypes: parseCustomDamageTypes(raw.damageTypes), isDamageConfirmedByGm: raw.isDamageConfirmedByGm !== false };
}

export function parseCustomDamageTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = value.flatMap((name) => (typeof name === "string" && name.trim() ? [name.trim().slice(0, CUSTOM_DAMAGE_TYPE_MAX_LENGTH)] : []));
  return [...new Set(names)].slice(0, CUSTOM_DAMAGE_TYPES_LIMIT);
}

/// Значення героя переважає кампанію; з кількох кампаній береться найщедріший ліміт і перша обрана система магії.
export function resolveHouseRules(pers: SharedHouseRules, campaigns: readonly CampaignHouseRules[]): HouseRules {
  const campaignLimits = campaigns.flatMap((campaign) => (campaign.attunementLimit === null ? [] : [campaign.attunementLimit]));
  return {
    attunementLimit: pers.attunementLimit ?? (campaignLimits.length ? Math.max(...campaignLimits) : null),
    magicSystem: pers.magicSystem ?? campaigns.find((campaign) => campaign.magicSystem)?.magicSystem ?? "SLOTS",
    damageTypes: parseCustomDamageTypes(campaigns.flatMap((campaign) => campaign.damageTypes)),
  };
}
