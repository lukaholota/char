import { readFileSync } from "fs";
import { join } from "path";

const DICTIONARY_PATH = join(process.cwd(), "src/lib/refs/dictionary.json");
const TRANSLATION_PATH = join(process.cwd(), "src/lib/refs/translation.ts");

export function readKnownEnglishTerms(): Set<string> {
  const known = new Set<string>();

  const dictionary = JSON.parse(readFileSync(DICTIONARY_PATH, "utf-8")) as {
    SPELLS?: Array<{ eng_name?: string }>;
  };
  collectObjectKeys(dictionary, known);

  for (const spell of dictionary.SPELLS ?? []) {
    if (spell.eng_name) known.add(normalize(spell.eng_name));
  }

  const translation = readFileSync(TRANSLATION_PATH, "utf-8");
  for (const match of translation.matchAll(/^\s*["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*:/gm)) {
    known.add(normalize(match[1]));
  }

  return known;
}

function collectObjectKeys(node: unknown, into: Set<string>): void {
  if (Array.isArray(node)) {
    node.forEach((child) => collectObjectKeys(child, into));
    return;
  }
  if (node === null || typeof node !== "object") return;

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    into.add(normalize(key));
    collectObjectKeys(value, into);
  }
}

export function normalize(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/// Gear arrives as "Studded Leather Armor" or "Javelins (6)" while translation.ts keys it as
/// STUDDED_LEATHER and JAVELIN, so a term counts as known if any of its plain variants matches.
export function isKnownTerm(term: string, known: Set<string>): boolean {
  const withoutCount = term.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const withoutArmor = withoutCount.replace(/\s+Armor$/i, "");
  const singular = withoutArmor.replace(/s$/i, "");

  return [term, withoutCount, withoutArmor, singular].some((variant) =>
    known.has(normalize(variant))
  );
}

/// Ukrainian spell names live in `SPELLS` as «Тіло звіра [Animal shapes]»; the batch prompt needs
/// exactly that string, so nothing downstream re-translates a name that is already ratified.
export function readRatifiedSpellNames(): Map<string, string> {
  const dictionary = JSON.parse(readFileSync(DICTIONARY_PATH, "utf-8")) as {
    SPELLS?: Array<{ eng_name?: string; name?: string }>;
  };

  return new Map(
    (dictionary.SPELLS ?? [])
      .filter((spell): spell is { eng_name: string; name: string } =>
        typeof spell.eng_name === "string" && typeof spell.name === "string"
      )
      .map((spell) => [normalize(spell.eng_name), spell.name])
  );
}
