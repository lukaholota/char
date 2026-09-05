/**
 * Іменовані пастки й небезпеки поза SRD — з пінованого дзеркала 5etools (Р19).
 * Джерела: DMG, XGtE, TCoE (2014) і XDMG, XPHB (2024); пригодницькі джерела (VRGR, BMT, RtG,
 * AZfyT, FRAiF, NF, IDRotF, VGM, BGDIA…) не беремо — той самий фільтр, що в variant-rules.ts.
 */

import { readFileSync } from "fs";
import { Ruleset } from "@prisma/client";

import { findCachePath, MIRROR_REPOSITORY, MIRROR_REVISION } from "./mirror";
import { renderEntries } from "./source-item";
import { claimSlug, kebabCase, numberArticlesWithinCategory, ParsedRuleSubSection } from "../srd/rules-markdown";
import { TrapHazardRating } from "../../src/lib/trapHazardTypes";

export type TrapHazardKind = "trap" | "hazard";
export type TrapHazardBookSource = "DMG" | "XGE" | "TCE" | "XDMG" | "XPHB";

export type ParsedTrapHazardArticle = {
  id: string;
  slug: string;
  kind: TrapHazardKind;
  ruleset: Ruleset;
  category: "gamemaster";
  engTitle: string;
  engTags: string[];
  bookSource: TrapHazardBookSource;
  page: number;
  trapHazType: string | null;
  rating: TrapHazardRating[];
  order: number;
  subsections: ParsedRuleSubSection[];
};

type RawTrapHazard = {
  name: string;
  source: string;
  page?: number;
  trapHazType?: string;
  rating?: TrapHazardRating[];
  entries: unknown[];
  trigger?: unknown[];
  effect?: unknown[];
  initiative?: number;
  initiativeNote?: string;
  eActive?: unknown[];
  eDynamic?: unknown[];
  eConstant?: unknown[];
  countermeasures?: unknown[];
  srd?: boolean | string;
  srd52?: boolean | string;
};

/// Редакція за джерелом, як у Р19: DMG/XGE/TCE → 2014, XDMG/XPHB → 2024. Будь-яке джерело поза
/// цим переліком — пригодницька книга (VRGR, BMT, RtG, AZfyT, FRAiF, NF, IDRotF, VGM, BGDIA…) і
/// відкидається без потреби перелічувати кожну поіменно.
const RULESET_BY_BOOK: Record<TrapHazardBookSource, Ruleset> = {
  DMG: "RULES_2014",
  XGE: "RULES_2014",
  TCE: "RULES_2014",
  XDMG: "RULES_2024",
  XPHB: "RULES_2024",
};

const TRAP_INIT_TO_FULL: Record<number, string> = {
  1: "initiative count 10",
  2: "initiative count 20",
  3: "initiative count 20 and initiative count 10",
};

/// `srd`/`srd52` на записах trapshazards.json покривають лише вісім прикладів пасток у додатку
/// книги — не всю SRD 5.2.1. XPHB (сама PHB 2024) і частина XDMG повторюють без прапорця
/// небезпеки, які довідник уже має дослівно перекладеними зі SRD-корпусу («Falling»,
/// «Extreme Cold»…): звірено вручну по заголовку й тексту з src/lib/generated/rules-2024.json,
/// той самий клас перевірки, що ALREADY_IN_SRD у variant-rules.ts.
const ALREADY_IN_SRD_2024 = new Set([
  "Burning",
  "Deep Water",
  "Dehydration",
  "Extreme Cold",
  "Extreme Heat",
  "Falling",
  "Frigid Water",
  "Heavy Precipitation",
  "High Altitude",
  "Malnutrition",
  "Slippery Ice",
  "Strong Wind",
  "Suffocation",
  "Thin Ice",
]);

export function parseTrapsHazards(
  options: { reservedSlugsByRuleset?: Record<Ruleset, string[]> } = {}
): ParsedTrapHazardArticle[] {
  /// 2014 і 2024 рендеряться на різних сторінках, тому якір, зайнятий у 2014, не заважає тому
  /// самому якорю у 2024 (обидва «Brown Mold»/«Green Slime» доїжджають без потреби суфіксувати
  /// другу редакцію) — набір зайнятих слагів окремий на редакцію.
  const takenSlugs: Record<Ruleset, Set<string>> = {
    RULES_2014: new Set(options.reservedSlugsByRuleset?.RULES_2014 ?? []),
    RULES_2024: new Set(options.reservedSlugsByRuleset?.RULES_2024 ?? []),
  };

  const raw = JSON.parse(readFileSync(findCachePath("trapshazards.json"), "utf-8")) as {
    trap: RawTrapHazard[];
    hazard: RawTrapHazard[];
  };

  const wanted = [
    ...raw.trap.map((record) => ({ record, kind: "trap" as const })),
    ...raw.hazard.map((record) => ({ record, kind: "hazard" as const })),
  ].filter(({ record }) => isKept(record));

  const articles = wanted.map(({ record, kind }) => {
    const ruleset = RULESET_BY_BOOK[record.source as TrapHazardBookSource];
    return buildArticle(record, kind, takenSlugs[ruleset]);
  });
  return numberArticlesWithinCategory(articles);
}

/// `srd`/`srd52` тут не «показується в SRD-книзі», а «цей самий текст уже друкує SRD 5.1/5.2.1»
/// — довідник має ці 16 пасток дослівно в підрозділі «Приклади пасток», другий примірник був би
/// дублем, який гейт KR20.4 (для звичайних статей) не ловить, бо ці записи не RuleArticle.
function isKept(record: RawTrapHazard): boolean {
  if (!(record.source in RULESET_BY_BOOK)) return false;
  if (record.srd === true || record.srd52 === true) return false;
  if (RULESET_BY_BOOK[record.source as TrapHazardBookSource] === "RULES_2024") {
    return !ALREADY_IN_SRD_2024.has(record.name);
  }
  return true;
}

function buildArticle(
  record: RawTrapHazard,
  kind: TrapHazardKind,
  takenSlugs: Set<string>
): Omit<ParsedTrapHazardArticle, "order"> {
  const bookSource = record.source as TrapHazardBookSource;
  const slug = claimSlug(kebabCase(record.name), kind, takenSlugs);
  const where = `${record.name} (${bookSource})`;

  return {
    id: `beyond-${kind}-${slug}`,
    slug,
    kind,
    ruleset: RULESET_BY_BOOK[bookSource],
    category: "gamemaster",
    engTitle: record.name,
    engTags: [record.name, bookSource, kind],
    bookSource,
    page: record.page ?? 0,
    trapHazType: record.trapHazType ?? null,
    rating: record.rating ?? [],
    subsections: buildSubsections(record, slug, where),
  };
}

function buildSubsections(record: RawTrapHazard, slug: string, where: string): ParsedRuleSubSection[] {
  const defs: { field: unknown; id: string; engTitle: string }[] = [
    { field: record.entries, id: "description", engTitle: "Description" },
    { field: record.trigger, id: "trigger", engTitle: "Trigger" },
    { field: record.effect, id: "effect", engTitle: "Effect" },
    { field: buildInitiativeEntries(record), id: "initiative", engTitle: "Initiative" },
    { field: record.eActive, id: "active-elements", engTitle: "Active Elements" },
    { field: record.eDynamic, id: "dynamic-elements", engTitle: "Dynamic Elements" },
    { field: record.eConstant, id: "constant-elements", engTitle: "Constant Elements" },
    { field: record.countermeasures, id: "countermeasures", engTitle: "Countermeasures" },
  ];

  return defs
    .filter((def) => Array.isArray(def.field) && def.field.length > 0)
    .map((def) => ({
      id: `${slug}--${def.id}`,
      engTitle: def.engTitle,
      engContent: renderEntries(def.field, record as unknown as Record<string, unknown>, `${where} › ${def.engTitle}`),
    }))
    .filter((subsection) => subsection.engContent.length > 0);
}

/// `initiative` — число з таблиці `TRAP_INIT_TO_FULL`, не проза; речення збирається так само,
/// як `Renderer.trap.getTrapInitiativeEntries` у js/render.js пінованої ревізії.
function buildInitiativeEntries(record: RawTrapHazard): string[] | undefined {
  if (record.initiative === undefined) return undefined;

  const full = TRAP_INIT_TO_FULL[record.initiative];
  if (!full) throw new Error(`${record.name}: невідома initiative ${record.initiative}`);

  const note = record.initiativeNote ? ` (${record.initiativeNote})` : "";
  return [`The trap acts on ${full}${note}.`];
}

export function buildTrapHazardUrl(article: { engTitle: string; bookSource: TrapHazardBookSource }): string {
  const anchor = `${article.engTitle.toLowerCase().replace(/[^a-z0-9]+/g, "%20").trim()}_${article.bookSource.toLowerCase()}`;
  return `https://5e.tools/trapshazards.html#${anchor}`;
}

export const TRAP_HAZARD_MIRROR_ATTRIBUTION = { repository: MIRROR_REPOSITORY, revision: MIRROR_REVISION };
