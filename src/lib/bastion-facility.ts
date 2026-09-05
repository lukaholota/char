/// Форма приміщення бастіону та її підписи — без жодного імпорту згенерованого каталогу.
/// Картці приміщення й фільтру потрібне саме це, а не список усіх приміщень
/// (docs/STATE.md дефект №9); сам список лишається в bastionsData.ts.
import { bastionOrderTranslations, bastionSpaceTranslations } from "./refs/translation";

export type BastionSpace = "cramped" | "roomy" | "vast";

export type BastionOrder = "craft" | "empower" | "harvest" | "recruit" | "research" | "trade";

export type BastionOrderCode = keyof typeof bastionOrderTranslations;

export const ALL_BASTION_ORDER_CODES = Object.keys(bastionOrderTranslations) as BastionOrderCode[];

const ORDER_CODES: Record<BastionOrder, BastionOrderCode> = {
  craft: "CRAFT",
  empower: "EMPOWER",
  harvest: "HARVEST",
  recruit: "RECRUIT",
  research: "RESEARCH",
  trade: "TRADE",
};

export function toBastionOrderCode(order: BastionOrder): BastionOrderCode {
  return ORDER_CODES[order];
}

/// MAINTAIN не належить жодному приміщенню в корпусі 5etools — це загальне «нічого особливого
/// цей хід», доступне будь-якому приміщенню, включно з базовими. Решта наказів — специфічні,
/// каталог дає їх лише деяким спеціальним приміщенням (Р26: підказка, а не замок).
export function findAllowedOrderCodes(
  facility: Pick<BastionFacilityData, "orders">
): BastionOrderCode[] {
  return [...facility.orders.map(toBastionOrderCode), "MAINTAIN"];
}

export type BastionHirelings = { exact: number | null; min: number | null; space: BastionSpace | null };

export type BastionRequirement =
  | { kind: "spellcastingFocus"; focus: string }
  | { kind: "membership"; organizationEng: string }
  | { kind: "renown"; organizationEng: string; min: number }
  | { kind: "expertise"; scope: "anySkill" }
  | { kind: "skillProficiency"; skillEng: string }
  | { kind: "feature"; featureEng: string };

export type BastionFacilityData = {
  slug: string;
  name: string;
  engName: string;
  source: string;
  page: number | null;
  facilityType: "basic" | "special";
  level: number | null;
  space: BastionSpace[];
  hirelings: BastionHirelings[];
  orders: BastionOrder[];
  prerequisite: { allOf: BastionRequirement[][] } | null;
  prerequisiteText: string;
  shortDescription: string;
  description: string;
};

/// Ядро DMG 2024 — 29 спеціальних приміщень і 6 базових. Решта корпусу — пізніші книги, і в
/// каталозі вони позначаються своїм джерелом, а не змішуються з ядром.
export const CORE_BASTION_SOURCE = "DMG_2024";

export const BASTION_LEVELS = [5, 9, 13, 17] as const;

export function translateSpace(space: BastionSpace): string {
  return bastionSpaceTranslations[space.toUpperCase() as keyof typeof bastionSpaceTranslations] ?? space;
}

export function translateOrder(order: BastionOrder): string {
  return bastionOrderTranslations[order.toUpperCase() as keyof typeof bastionOrderTranslations] ?? order;
}

export function describeHirelings(hirelings: BastionHirelings[]): string {
  if (hirelings.length === 0) return "—";
  return hirelings
    .map((entry) => {
      const amount = entry.min !== null ? `${entry.min}+` : String(entry.exact ?? 0);
      return entry.space ? `${amount} (${translateSpace(entry.space).toLowerCase()})` : amount;
    })
    .join(" / ");
}
