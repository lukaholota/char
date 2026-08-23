import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { findRawDir } from "./aidedd-catalogs";
import { CreatureEdition, StatblockEntry } from "./creature-schema";
import { parseMonster2014 } from "./parse-monster-2014";
import { parseMonster2024 } from "./parse-monster-2024";
import { CreatureTranslation } from "./build-creature-record";
import { TRANSLATIONS_DIR as TRANSLATIONS_DIR_2014 } from "./import-creatures-2014";
import { TRANSLATIONS_DIR as TRANSLATIONS_DIR_2024 } from "./import-creatures-2024";

const DICTIONARY_PATH = join(process.cwd(), "src/lib/refs/dictionary.json");
const SECTION_KEYS = ["traits", "actions", "bonusActions", "reactions", "legendaryActions"] as const;
const MINIMUM_USES = 2;

type Usage = { ukrainian: string; uses: number; lastSeen: number };
type Ratification = { english: string; winner: string; rejected: Usage[] };

/// Trait and action names never passed through the converter's dictionary, so every session
/// invented them again and the corpus drifted (Multiattack 57/9, Claw 28/1/1). Owner decision
/// 2026-08-19: names used twice or more become terms, and shipped batches are rewritten to match.
function ratifyGlossary(): void {
  const edition = readEdition();
  const usages = collectUsages(edition);
  const ratified = findRatifications(usages);

  writeGlossary(ratified);
  const rewritten = rewriteBatches(edition, ratified);

  printRatifications(ratified);
  console.log(`\n${ratified.length} назв у словнику, ${rewritten} назв переписано у вже готових партіях`);
}

function collectUsages(edition: CreatureEdition): Map<string, Usage[]> {
  const usages = new Map<string, Usage[]>();
  const files = readBatchFiles(edition);

  files.forEach(({ rows }, batchIndex) => {
    for (const row of rows) {
      for (const { english, ukrainian } of readNamePairs(edition, row)) {
        const base = cutSuffix(english).base;
        const ukrainianBase = cutSuffix(ukrainian).base;
        const known = usages.get(base) ?? [];
        const seen = known.find((usage) => usage.ukrainian === ukrainianBase);
        if (seen) {
          seen.uses += 1;
          seen.lastSeen = batchIndex;
        } else {
          known.push({ ukrainian: ukrainianBase, uses: 1, lastSeen: batchIndex });
        }
        usages.set(base, known);
      }
    }
  });

  return usages;
}

/// A tie is broken by recency: the later batch reflects the more recent decision.
function findRatifications(usages: Map<string, Usage[]>): Ratification[] {
  return [...usages.entries()]
    .filter(([, variants]) => countUses(variants) >= MINIMUM_USES)
    .map(([english, variants]) => {
      const ranked = [...variants].sort(
        (left, right) => right.uses - left.uses || right.lastSeen - left.lastSeen
      );
      return { english, winner: ranked[0].ukrainian, rejected: ranked.slice(1) };
    })
    .sort((left, right) => left.english.localeCompare(right.english));
}

function countUses(variants: Usage[]): number {
  return variants.reduce((total, variant) => total + variant.uses, 0);
}

function writeGlossary(ratified: Ratification[]): void {
  const dictionary = JSON.parse(readFileSync(DICTIONARY_PATH, "utf-8"));
  dictionary.DND_DICTIONARY.statblockFeatures = Object.fromEntries(
    ratified.map((entry) => [entry.english, entry.winner])
  );
  writeFileSync(DICTIONARY_PATH, `${JSON.stringify(dictionary, null, 2)}\n`, "utf-8");
}

function rewriteBatches(edition: CreatureEdition, ratified: Ratification[]): number {
  const winners = new Map(ratified.map((entry) => [entry.english, entry.winner]));
  let rewritten = 0;

  for (const { path, rows } of readBatchFiles(edition)) {
    for (const row of rows) {
      for (const key of SECTION_KEYS) {
        for (const [index, entry] of (row[key] ?? []).entries()) {
          const english = readSourceName(edition, row.slug, key, index);
          const renamed = buildRatifiedName(english, entry.name, winners);
          if (renamed !== entry.name) rewritten += 1;
          entry.name = renamed;
        }
      }
    }
    writeFileSync(path, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
  }

  return rewritten;
}

function buildRatifiedName(
  english: string,
  ukrainian: string,
  winners: Map<string, string>
): string {
  const source = cutSuffix(english);
  const current = cutSuffix(ukrainian);
  const base = winners.get(source.base) ?? current.base;
  const suffix = buildCanonicalSuffix(source.suffix) ?? current.suffix;
  return suffix === "" ? base : `${base} (${suffix})`;
}

/// The usage limits are a closed set of formats, so they are rendered by rule rather than
/// ratified one by one. "N per day" follows the house style from the dnd-ua-translation skill,
/// which outranks the batches' own "3/день" precedent the same way translation.ts does.
export function buildCanonicalSuffix(english: string): string | null {
  const recharge = /^Recharge\s+(\d)\s*[-–]\s*(\d)$/i.exec(english);
  if (recharge) return `перезарядка ${recharge[1]}–${recharge[2]}`;

  const rechargeSingle = /^Recharge\s+(\d)$/i.exec(english);
  if (rechargeSingle) return `перезарядка ${rechargeSingle[1]}`;

  if (/^Recharges after a Short or Long Rest$/i.test(english)) {
    return "перезаряджається після короткого чи тривалого відпочинку";
  }

  const perDay = /^(\d+)\/Day$/i.exec(english);
  if (perDay) return `${perDay[1]} ${buildTimesWord(Number(perDay[1]))} на день`;

  const perTurn = /^(\d+)\/Turn$/i.exec(english);
  if (perTurn) return `${perTurn[1]} ${buildTimesWord(Number(perTurn[1]))} на хід`;

  const costsActions = /^Costs\s+(\d+)\s+Actions?$/i.exec(english);
  if (costsActions) return `коштує ${costsActions[1]} ${buildActionWord(Number(costsActions[1]))}`;

  return null;
}

function buildTimesWord(count: number): string {
  if (count === 1) return "раз";
  return count < 5 ? "рази" : "разів";
}

function buildActionWord(count: number): string {
  if (count === 1) return "дію";
  return count < 5 ? "дії" : "дій";
}

export function cutSuffix(name: string): { base: string; suffix: string } {
  const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(name.trim());
  return match ? { base: match[1], suffix: match[2] } : { base: name.trim(), suffix: "" };
}

type BatchFile = { path: string; rows: CreatureTranslation[] };

function readBatchFiles(edition: CreatureEdition): BatchFile[] {
  const dir = edition === "RULES_2014" ? TRANSLATIONS_DIR_2014 : TRANSLATIONS_DIR_2024;
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      path: join(dir, file),
      rows: JSON.parse(readFileSync(join(dir, file), "utf-8")) as CreatureTranslation[],
    }));
}

function readNamePairs(
  edition: CreatureEdition,
  row: CreatureTranslation
): Array<{ english: string; ukrainian: string }> {
  return SECTION_KEYS.flatMap((key) =>
    (row[key] ?? []).map((entry, index) => ({
      english: readSourceName(edition, row.slug, key, index),
      ukrainian: entry.name,
    }))
  ).filter((pair) => pair.english !== "");
}

const parsedCache = new Map<string, Record<string, StatblockEntry[]>>();

function readSourceName(
  edition: CreatureEdition,
  slug: string,
  key: (typeof SECTION_KEYS)[number],
  index: number
): string {
  const cached = parsedCache.get(slug) ?? readSections(edition, slug);
  parsedCache.set(slug, cached);
  return cached[key]?.[index]?.name ?? "";
}

function readSections(
  edition: CreatureEdition,
  slug: string
): Record<string, StatblockEntry[]> {
  const dir = findRawDir(edition === "RULES_2014" ? "monsters-2014" : "monsters-2024");
  const parse = edition === "RULES_2014" ? parseMonster2014 : parseMonster2024;
  const parsed = parse(readFileSync(join(dir, `${slug}.html`), "utf-8"), slug);
  return {
    traits: parsed.traits,
    actions: parsed.actions,
    bonusActions: parsed.bonusActions,
    reactions: parsed.reactions,
    legendaryActions: parsed.legendaryActions,
  };
}

function printRatifications(ratified: Ratification[]): void {
  const contested = ratified.filter((entry) => entry.rejected.length > 0);
  console.log(`Назви, де був дрейф і обрано переможця — ${contested.length}:`);
  for (const entry of contested) {
    const losers = entry.rejected.map((usage) => `${usage.ukrainian} (${usage.uses})`).join(", ");
    console.log(`  ${entry.english} → ${entry.winner}   [відкинуто: ${losers}]`);
  }
}

function readEdition(): CreatureEdition {
  return process.argv.includes("--edition=2024") ? "RULES_2024" : "RULES_2014";
}

if (process.argv[1]?.endsWith("ratify-glossary.ts")) ratifyGlossary();
