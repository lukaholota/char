import type { Ruleset } from "@prisma/client";

import { buildHomebrewSpellKey } from "@/lib/logic/homebrew-view";

const MAX_SPELLS_PER_PRINT = 100;
const HOMEBREW_KEY_PREFIX = "homebrew:";

export type SpellPrintRequest = {
  ruleset: Ruleset;
  catalogKeys: string[];
  homebrewEntryIds: number[];
};

export class SpellPrintRequestError extends Error {}

/**
 * Друк приймає ключ, а не позиційний номер каталогу: номер 2024 живий лише заради старих адрес
 * і рядка бази не означає (KR25.2).
 */
export function parseSpellPrintRequest(searchParams: URLSearchParams): SpellPrintRequest {
  const ruleset = parseRuleset(searchParams.get("ruleset"));
  const keys = parseKeys(searchParams);
  if (keys.length === 0) throw new SpellPrintRequestError("Оберіть хоча б одне заклинання");
  if (keys.length > MAX_SPELLS_PER_PRINT) {
    throw new SpellPrintRequestError(`За один раз можна надрукувати до ${MAX_SPELLS_PER_PRINT} заклинань`);
  }
  return { ruleset, ...splitCatalogAndHomebrewKeys(keys) };
}

function parseRuleset(rawRuleset: string | null): Ruleset {
  if (rawRuleset === null) return "RULES_2014";
  if (rawRuleset === "RULES_2014" || rawRuleset === "RULES_2024") return rawRuleset;
  throw new SpellPrintRequestError("Невідома редакція правил");
}

function parseKeys(searchParams: URLSearchParams): string[] {
  const rawKeys = searchParams.get("keys");
  if (rawKeys !== null) return splitList(rawKeys);
  return splitList(searchParams.get("ids") ?? searchParams.get("spellIds") ?? "").map(toLegacyKey);
}

/** Давні адреси шлють номери, де відʼємний — запис спільноти. */
function toLegacyKey(rawId: string): string {
  const id = Number(rawId);
  if (!Number.isFinite(id)) return rawId;
  return id < 0 ? buildHomebrewSpellKey(-Math.trunc(id)) : String(Math.trunc(id));
}

function splitList(raw: string): string[] {
  return Array.from(new Set(raw.split(",").map((key) => key.trim()).filter(Boolean)));
}

function splitCatalogAndHomebrewKeys(keys: string[]) {
  const catalogKeys: string[] = [];
  const homebrewEntryIds: number[] = [];

  for (const key of keys) {
    if (!key.startsWith(HOMEBREW_KEY_PREFIX)) {
      catalogKeys.push(key);
      continue;
    }
    const entryId = Number(key.slice(HOMEBREW_KEY_PREFIX.length));
    if (!Number.isInteger(entryId) || entryId <= 0) {
      throw new SpellPrintRequestError(`Невідомий ключ заклинання: ${key}`);
    }
    homebrewEntryIds.push(entryId);
  }

  return { catalogKeys, homebrewEntryIds };
}
