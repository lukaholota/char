import { sourceTranslations } from "@/lib/refs/translation";
import type { InlineNode, OptimizationRuleset } from "./types";

type TranslatedSourceCode = keyof typeof sourceTranslations;
type UntranslatedSourceCode = keyof typeof UNTRANSLATED_SOURCE_TITLES;
export type RpgbotSourceCode = TranslatedSourceCode | UntranslatedSourceCode;

const ABBREVIATIONS_PAGE = /^https:\/\/(?:www\.)?rpgbot\.net\/(?:dnd5|2024-dnd)\/abbreviations\/?(?:[?#].*)?$/;

const UNTRANSLATED_SOURCE_TITLES = {
  EEPC: "Elemental Evil Player's Companion",
  ABOH: "Astarion's Book of Hungers",
  LFL: "Lorwyn: First Light",
  TCSR: "Tal'Dorei Campaign Setting Reborn",
  TTP: "The Tortle Package",
  NF: "Netheril's Fall",
  DROPS: "D&D Beyond Drops",
  FRAIF: "Forgotten Realms: Adventures in Faerûn",
} as const;

const ABBREVIATION_CODES: Record<string, RpgbotSourceCode> = {
  PHB: "PHB", PHN: "PHB", CRB: "PHB", "КНИГА ГРАВЦЯ": "PHB",
  DMG: "DMG", MM: "MM",
  TCOE: "TCOE", XGTE: "XGTE", SCAG: "SCAG", FRHOF: "FRHoF", BOMT: "BOMT", MTOF: "MTOF", FTOD: "FTOD",
  MMOM: "MPMM", MOTM: "MPMM", VGTM: "VGTM", GOTG: "BPGOTG",
  ERLW: "EBERRON", "E:RTLW": "EBERRON", ERFTLW: "EBERRON", ERTLW: "EBERRON",
  EFOTA: "EFA", FOTA: "EFA", SCOC: "SACOC", AI: "AI", ACINC: "AI", EGW: "EGTW", EGTW: "EGTW",
  RTHW: "RHW", GGTR: "GGTR", GGR: "GGTR", SJAIS: "SPELLJAMMER", "SJ:AIS": "SPELLJAMMER", SAIS: "SPELLJAMMER",
  MOOT: "MOOT", "ID:ROTF": "IDROTF", WBTW: "WBTW", LR: "LR",
  EEPC: "EEPC", "ELEMENTAL EVIL PLAYER'S COMPANION": "EEPC", ABOH: "ABOH", LFL: "LFL", "T:CSR": "TCSR", TP: "TTP", TORTLE: "TTP", NF: "NF", DROPS: "DROPS", FRAIF: "FRAIF",
};

const EDITION_2024_CODES: Partial<Record<RpgbotSourceCode, RpgbotSourceCode>> = { PHB: "PHB_2024", DMG: "DMG_2024", MM: "MM_2024" };

const TRANSLATED_TITLE_CODES = new Map(
  (Object.entries(sourceTranslations) as [TranslatedSourceCode, string][]).reverse().map(([code, title]) => [normalizeMarker(title), code]),
);

export function isRpgbotAbbreviationsHref(href: string): boolean {
  return ABBREVIATIONS_PAGE.test(href);
}

export function findRpgbotSourceCodes(link: { text: string; href: string }, ruleset: OptimizationRuleset): RpgbotSourceCode[] | null {
  if (!isRpgbotAbbreviationsHref(link.href)) return null;
  const codes = link.text.split("/").map((part) => findSourceCode(part, ruleset));
  return codes.every((code): code is RpgbotSourceCode => code !== undefined) ? codes : null;
}

export function findUntranslatedSourceTitle(code: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(UNTRANSLATED_SOURCE_TITLES, code) ? UNTRANSLATED_SOURCE_TITLES[code as UntranslatedSourceCode] : undefined;
}

export function dropSourceMarkerBrackets(nodes: readonly InlineNode[], ruleset: OptimizationRuleset): InlineNode[] {
  const isBracketedMarker = (index: number) => {
    const marker = nodes[index];
    return marker?.type === "link" && !!findRpgbotSourceCodes(marker, ruleset)
      && !!nodes[index - 1]?.text.endsWith("(") && !!nodes[index + 1]?.text.startsWith(")");
  };
  return nodes.flatMap((node, index): InlineNode[] => {
    if (node.type === "link") return [node];
    const opened = isBracketedMarker(index + 1) ? node.text.slice(0, -1) : node.text;
    const text = isBracketedMarker(index - 1) ? opened.slice(1) : opened;
    return text ? [{ ...node, text }] : [];
  });
}

function findSourceCode(part: string, ruleset: OptimizationRuleset): RpgbotSourceCode | undefined {
  const marker = normalizeMarker(part);
  const abbreviationCode = ABBREVIATION_CODES[marker];
  if (abbreviationCode) return ruleset === "RULES_2024" ? EDITION_2024_CODES[abbreviationCode] ?? abbreviationCode : abbreviationCode;
  return TRANSLATED_TITLE_CODES.get(marker);
}

function normalizeMarker(text: string): string {
  return text.trim().replace(/\s+/g, " ").replace(/’/g, "'").toLocaleUpperCase("uk");
}
