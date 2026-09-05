import type { Ruleset } from "@prisma/client";
import {
  type WildshapeCandidate,
  type WildshapeContext,
  type WildshapeEligibility,
  findWildshapeEligibility,
} from "@/rules/wildshape";
import type { CreatureIndexEntry } from "./bestiary-index";
import {
  buildCatalogEmbedParams,
  findCatalogEmbed,
  getBoolParam,
  setBoolParam,
} from "./catalog-url-helpers";

/// Місток між рядком каталогу й правилом придатності. Індекс везе швидкості розріджено (KR24.1):
/// відсутній ключ означає «режиму немає», а правило чекає на `null`. Переклад робиться тут, в
/// одному місці, — інакше кожен споживач заводить свій, і саме так розходяться копії.

const PERS_PARAM = "wsPers";
const ONLY_ELIGIBLE_PARAM = "ws";

export function buildWildshapeCandidate(entry: CreatureIndexEntry): WildshapeCandidate {
  return {
    nameEng: entry.nameEng,
    type: entry.type,
    challenge: entry.challenge,
    flySpeed: entry.flySpeed ?? null,
    swimSpeed: entry.swimSpeed ?? null,
    climbSpeed: entry.climbSpeed ?? null,
    hasConditionalSpeed: entry.hasConditionalSpeed ?? false,
  };
}

export function findEntryEligibility(
  entry: CreatureIndexEntry,
  context: WildshapeContext
): WildshapeEligibility {
  return findWildshapeEligibility(buildWildshapeCandidate(entry), context);
}

/// Персонаж у контексті й сам перемикач — дві різні речі. Кнопка «додати як форму» потрібна й
/// тоді, коли фільтр вимкнено ([Р-3]: непридатна форма не зникає, а додається з попередженням).
export type WildshapeFilter = { persId: number | null; onlyEligible: boolean };

export const NO_WILDSHAPE_FILTER: WildshapeFilter = { persId: null, onlyEligible: false };

/// Персонаж приходить або з режиму вбудовування (пікер із листа), або з власного параметра —
/// щоб секція фільтрів працювала й тоді, коли гравець відкрив бестіарій сам.
export function findWildshapeFilter(params: URLSearchParams): WildshapeFilter {
  const persId = findFilterPersId(params);

  return { persId, onlyEligible: persId !== null && getBoolParam(params, ONLY_ELIGIBLE_PARAM) === true };
}

export function writeWildshapeFilter(params: URLSearchParams, filter: WildshapeFilter): void {
  const embedPersId = findCatalogEmbed(params)?.persId ?? null;

  if (filter.persId === null || filter.persId === embedPersId) params.delete(PERS_PARAM);
  else params.set(PERS_PARAM, String(filter.persId));

  setBoolParam(params, ONLY_ELIGIBLE_PARAM, filter.persId !== null && filter.onlyEligible ? true : null);
}

/// Поки межі персонажа ще в дорозі, фільтр нікого не ховає: порожній список замість повного
/// виглядав би як «нічого не знайдено», а це неправда.
export function matchesWildshapeFilter(
  entry: CreatureIndexEntry,
  filter: WildshapeFilter,
  context: WildshapeContext | null
): boolean {
  if (!filter.onlyEligible || !context) return true;

  return findEntryEligibility(entry, context).eligible;
}

/// Адреса пікера форм: той самий бестіарій, відкритий із листа. Замовчування — з фільтром.
export function buildWildshapePickerUrl(input: {
  persId: number;
  persName?: string;
  ruleset: Ruleset;
  onlyEligible: boolean;
}): string {
  const params = new URLSearchParams(buildCatalogEmbedParams(input));
  writeWildshapeFilter(params, { persId: input.persId, onlyEligible: input.onlyEligible });

  return `${input.ruleset === "RULES_2024" ? "/2024" : ""}/bestiary?${params.toString()}`;
}

function findFilterPersId(params: URLSearchParams): number | null {
  const own = Number(params.get(PERS_PARAM));
  if (Number.isInteger(own) && own > 0) return own;

  return findCatalogEmbed(params)?.persId ?? null;
}
