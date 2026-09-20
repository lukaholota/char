import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { CreatureRuleset, normalizeName } from "../aidedd/creature-images";
import { RAW_CACHE_DIR } from "./mirror";

export type PictureKind = "art" | "token";

export type PictureCandidate = {
  source: string;
  path: string;
  kind: PictureKind;
};

export type PictureCorpus = Map<string, PictureCandidate[]>;

export type PicturePick = PictureCandidate & { nameEng: string };

const SOURCES_2024 = ["XMM", "XPHB", "XDMG", "FRAiF"];
const CANON_2014 = ["MM", "MPMM", "VGM", "MTF", "TCE", "XGE", "FTD", "BGG", "ESK", "DMG"];

/// Crossover sets draw their monsters in another franchise's style («Stranger Things», «Rick and
/// Morty»); a Commoner from there would sit next to Monster Manual paintings and look wrong.
export const SKIPPED_ART_SOURCES = ["WttHC", "RMBRE", "RMR"];

/// Our `Source` enum spells the books its own way; only the codes that differ from 5etools are listed.
const SOURCE_ALIASES: Record<string, string> = {
  MMotM: "MPMM",
  VGTM: "VGM",
  TCOE: "TCE",
  XGTE: "XGE",
  FTOD: "FTD",
  BPGOTG: "BGG",
  ESSENTIALS_KIT: "ESK",
  IDROTF: "IDRotF",
  TOA: "ToA",
  POTA: "PotA",
  WBTW: "WBtW",
  DRAGONLANCE: "DSotDQ",
  QFTIS: "QftIS",
  VEOR: "VEoR",
  CHAINS_OF_ASMODEUS: "CoA",
  MM_2024: "XMM",
  PHB_2024: "XPHB",
  DMG_2024: "XDMG",
};

type FluffFile = { monsterFluff?: Array<{ name: string; source: string; images?: Array<{ href?: { type?: string; path?: string } }> }> };
type BestiaryFile = { monster?: Array<{ name: string; source: string; hasToken?: boolean }> };

/// The first fluff image is the creature's own illustration; later ones are variants and maps.
/// Tokens are listed for every statblock that has one, because half the names aidedd lacks art
/// for have no illustration in 5etools either — only the round token cut from the book.
export function collectPictureCorpus(bestiaryDir = join(RAW_CACHE_DIR, "bestiary")): PictureCorpus {
  const corpus: PictureCorpus = new Map();

  for (const file of readdirSync(bestiaryDir)) {
    if (file.startsWith("fluff-bestiary-")) {
      const parsed = JSON.parse(readFileSync(join(bestiaryDir, file), "utf-8")) as FluffFile;
      for (const entry of parsed.monsterFluff ?? []) {
        if (SKIPPED_ART_SOURCES.includes(entry.source)) continue;
        const path = entry.images?.find((image) => image.href?.type === "internal")?.href?.path;
        if (path) addCandidate(corpus, entry.name, { source: entry.source, path, kind: "art" });
      }
    }

    if (file.startsWith("bestiary-")) {
      const parsed = JSON.parse(readFileSync(join(bestiaryDir, file), "utf-8")) as BestiaryFile;
      for (const entry of parsed.monster ?? []) {
        if (!entry.hasToken) continue;
        addCandidate(corpus, entry.name, {
          source: entry.source,
          path: `bestiary/tokens/${entry.source}/${entry.name}.webp`,
          kind: "token",
        });
      }
    }
  }

  return corpus;
}

export function pickPicture(
  creature: { nameEng: string; source: string },
  ruleset: CreatureRuleset,
  corpus: PictureCorpus
): PicturePick | undefined {
  const candidates = listNameVariants(creature.nameEng)
    .map((name) => corpus.get(normalizeName(name)))
    .find((found) => found && found.length > 0);
  if (!candidates) return undefined;

  const ranked = [...candidates].sort(
    (left, right) => rankCandidate(left, ruleset, creature.source) - rankCandidate(right, ruleset, creature.source)
  );
  return { ...ranked[0], nameEng: creature.nameEng };
}

/// «Goblin (2024)» is our own disambiguation, and «Succubus / Incubus» is one aidedd page where
/// 5etools has two statblocks — the first half names the pictured one.
function listNameVariants(nameEng: string): string[] {
  const variants = [nameEng];
  const withoutEdition = nameEng.replace(/\s*\(2024\)\s*$/, "");
  if (withoutEdition !== nameEng) variants.push(withoutEdition);
  if (nameEng.includes("/")) variants.push(nameEng.split("/")[0]);
  return variants;
}

/// Art beats a token whatever the book; among books, the creature's own comes first, then the
/// edition's core books, then anything else from the same edition, and the other edition last.
function rankCandidate(candidate: PictureCandidate, ruleset: CreatureRuleset, ownSource: string): number {
  const kindWeight = candidate.kind === "art" ? 0 : 1000;
  return kindWeight + rankSource(candidate.source, ruleset, ownSource);
}

function rankSource(source: string, ruleset: CreatureRuleset, ownSource: string): number {
  if (source === (SOURCE_ALIASES[ownSource] ?? ownSource)) return 0;

  const [own, other] = ruleset === "RULES_2024" ? [SOURCES_2024, CANON_2014] : [CANON_2014, SOURCES_2024];
  if (own.includes(source)) return 1 + own.indexOf(source);
  if (other.includes(source)) return 200 + other.indexOf(source);
  return 100;
}

function addCandidate(corpus: PictureCorpus, name: string, candidate: PictureCandidate): void {
  const key = normalizeName(name);
  const list = corpus.get(key) ?? [];
  list.push(candidate);
  corpus.set(key, list);
}
