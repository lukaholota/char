/**
 * Обʼєкти-статблоки поза SRD — з пінованого дзеркала 5etools (Р19, KR23.5).
 * `objects.json` здебільшого дублює вже наявне («Generic Object» — та сама стаття «Objects»,
 * яку довідник уже має зі SRD; три хвости TCoE «Eldritch Cannon» — та сама проза, що вже
 * стоїть у рисі підкласу «Містична гармата»). Реально нове — 17 облогових знарядь DMG/XDMG.
 */

import { readFileSync } from "fs";
import { Ruleset } from "@prisma/client";

import { findCachePath, MIRROR_REPOSITORY, MIRROR_REVISION } from "./mirror";
import { renderEntries } from "./source-item";
import { claimSlug, kebabCase, numberArticlesWithinCategory } from "../srd/rules-markdown";

export type ObjectBookSource = "DMG" | "XDMG";

export type ParsedObjectStatblock = {
  id: string;
  slug: string;
  category: "gamemaster";
  ruleset: Ruleset;
  engTitle: string;
  engTags: string[];
  bookSource: ObjectBookSource;
  page: number;
  size: string;
  objectType: string;
  ac: number;
  hp: number;
  immune: string[];
  order: number;
  subsections: { id: string; engTitle: string; engContent: string }[];
};

type RawObject = {
  name: string;
  source: string;
  page?: number;
  size?: string[];
  objectType?: string;
  ac?: unknown;
  hp?: unknown;
  immune?: string[];
  entries?: unknown[];
  actionEntries?: unknown[];
};

const RULESET_BY_BOOK: Record<ObjectBookSource, Ruleset> = {
  DMG: "RULES_2014",
  XDMG: "RULES_2024",
};

/// Точковий перелік, не фільтр за прапорцем: `objects.json` не позначає жодного з цих записів
/// `srd`, тому дублі довелося ловити вручну, звіркою заголовка й тексту з наявним корпусом
/// (журнал KR23.5). `Generic Object` (DMG, `srd: true`) — та сама стаття «Objects» зі SRD 5.1.
/// `Eldritch Cannon`/`Eldritch Cannon, …` (TCE, EFA) — той самий текст, що вже стоїть у рисі
/// підкласу «Містична гармата» (`prisma/seed/subclassFeatureSeed.ts`).
const WANTED_2014: string[] = [
  "Ballista",
  "Cannon",
  "Mangonel",
  "Ram",
  "Siege Tower",
  "Suspended Cauldron",
  "Trebuchet",
];

const WANTED_2024: string[] = [
  ...WANTED_2014,
  "Flamethrower Coach",
  "Keg Launcher",
  "Lightning Cannon",
];

export function parseObjectStatblocks(
  options: { reservedSlugsByRuleset?: Record<Ruleset, string[]> } = {}
): ParsedObjectStatblock[] {
  const takenSlugs: Record<Ruleset, Set<string>> = {
    RULES_2014: new Set(options.reservedSlugsByRuleset?.RULES_2014 ?? []),
    RULES_2024: new Set(options.reservedSlugsByRuleset?.RULES_2024 ?? []),
  };

  const raw = JSON.parse(readFileSync(findCachePath("objects.json"), "utf-8")) as { object: RawObject[] };

  const wanted = raw.object.filter(
    (record) =>
      (record.source === "DMG" && WANTED_2014.includes(record.name)) ||
      (record.source === "XDMG" && WANTED_2024.includes(record.name))
  );

  const articles = wanted.map((record) => {
    const bookSource = record.source as ObjectBookSource;
    return buildArticle(record, bookSource, takenSlugs[RULESET_BY_BOOK[bookSource]]);
  });

  return numberArticlesWithinCategory(articles);
}

function buildArticle(
  record: RawObject,
  bookSource: ObjectBookSource,
  takenSlugs: Set<string>
): Omit<ParsedObjectStatblock, "order"> {
  const slug = claimSlug(kebabCase(record.name), "object", takenSlugs);
  const where = `${record.name} (${bookSource})`;

  return {
    id: `beyond-object-${slug}`,
    slug,
    category: "gamemaster",
    ruleset: RULESET_BY_BOOK[bookSource],
    engTitle: record.name,
    engTags: [record.name, bookSource, "обʼєкт"],
    bookSource,
    page: record.page ?? 0,
    size: readSingle(record.size, where, "size"),
    objectType: record.objectType ?? "",
    ac: readNumber(record.ac, where, "ac"),
    hp: readNumber(record.hp, where, "hp"),
    immune: record.immune ?? [],
    subsections: buildSubsections(record, slug, where),
  };
}

function buildSubsections(
  record: RawObject,
  slug: string,
  where: string
): { id: string; engTitle: string; engContent: string }[] {
  const defs: { field: unknown[] | undefined; id: string; engTitle: string }[] = [
    { field: record.entries, id: "description", engTitle: "Description" },
    { field: record.actionEntries, id: "actions", engTitle: "Actions" },
  ];

  return defs
    .filter((def): def is { field: unknown[]; id: string; engTitle: string } => Array.isArray(def.field) && def.field.length > 0)
    .map((def) => ({
      id: `${slug}--${def.id}`,
      engTitle: def.engTitle,
      engContent: renderEntries(def.field, record as unknown as Record<string, unknown>, `${where} › ${def.engTitle}`),
    }))
    .filter((subsection) => subsection.engContent.length > 0);
}

function readSingle(value: string[] | undefined, where: string, field: string): string {
  if (!value || value.length !== 1) throw new Error(`${where}: очікували один код у полі «${field}»`);
  return value[0];
}

function readNumber(value: unknown, where: string, field: string): number {
  if (typeof value !== "number") throw new Error(`${where}: поле «${field}» не число`);
  return value;
}

export function buildObjectUrl(article: { engTitle: string; bookSource: ObjectBookSource }): string {
  const anchor = `${article.engTitle.toLowerCase().replace(/[^a-z0-9]+/g, "%20").trim()}_${article.bookSource.toLowerCase()}`;
  return `https://5e.tools/objects.html#${anchor}`;
}

export const OBJECT_MIRROR_ATTRIBUTION = { repository: MIRROR_REPOSITORY, revision: MIRROR_REVISION };
