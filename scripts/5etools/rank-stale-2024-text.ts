/// KR16.2 — де український текст 2024 ще описує правило 2014, хоч усі поля збігаються з XPHB.
///
/// Звірка полів цього не бачить: `Counterspell` має ту саму дію, дальність і компоненти в обох
/// редакціях, а правило замінене цілком. Тому сигнал двосторонній:
///
///   englishChanged — наскільки текст XPHB відрізняється від тексту PHB (WotC справді переписав);
///   ukrainianStale — наскільки наш опис 2024 збігається з нашим же описом 2014.
///
/// Високий добуток означає «книгу переписали, а ми — ні». Сам по собі жоден із двох множників
/// не працює: партія 4 міряла лише другий і дала самі хибні влучання, бо XPHB для частини
/// заклинань справді близький до PHB.
///
/// Вхід — черга міграції WotC (`data/2024/migration/wotc-migration-queue.txt`), звужена до
/// записів, яких ще не читала жодна партія і які наш машинний diff вважає незміненими.

import { readFileSync } from "fs";
import { findLooseNameKey, readSpells, SourceSpell } from "./schema";
import { stripMarkup } from "./markup";
import { collectStringsDeep } from "./schema";
import { deriveDiffersFrom2014 } from "./differs-from-2014";

export const QUEUE_PATH = "data/2024/migration/wotc-migration-queue.txt";

const queue = readFileSync(QUEUE_PATH, "utf8")
  .split("\n").map((l) => l.trim()).filter(Boolean);

const catalog: { engName: string; description: string }[] = JSON.parse(
  readFileSync("data/2024/normalized/spells.json", "utf8")
);
const catalog2014: { engName: string; description: string }[] = JSON.parse(
  readFileSync("src/lib/generated/spells.json", "utf8")
);
const ratchet = readFileSync("tests/content/differs-from-2014.test.ts", "utf8");
const read = new Set([...ratchet.matchAll(/^\s{4}"([^"]+)",$/gmu)].map((m) => m[1]));

const derived = deriveDiffersFrom2014(catalog.map((r) => r.engName));
const by2024 = new Map(catalog.map((r, i) => [findLooseNameKey(r.engName), { row: r, d: derived[i] }]));
const by2014 = new Map(catalog2014.map((r) => [findLooseNameKey(r.engName), r]));

const TERM_SWAPS: [RegExp, string][] = [
  [/слот(?:а|у|ом|и|ів|ам|ами|ах)?\s+заклинань/giu, "чарунка"],
  [/\bХП\b/gu, "хіти"],
  [/Засліплен/gu, "осліплен"], [/Оглухл/gu, "оглушен"], [/Причарован/gu, "зачарован"],
  [/Значн\S*\s+заслоненіст\S*/giu, "непроглядн"],
  [/\*\*На вищих рівнях\.\*\*/gu, "**На вищих рівнях:**"],
];

function shingles(text: string, swap: boolean): Set<string> {
  let out = text.replace(/<[^>]+>/gu, " ").replace(/[*_`#]/gu, " ").replace(/[’'`]/gu, "'").toLowerCase();
  if (swap) for (const [p, t] of TERM_SWAPS) out = out.replace(p, t);
  const words = out.replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + 2 < words.length; i += 1) set.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return set;
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let n = 0; for (const x of a) if (b.has(x)) n += 1;
  return n / Math.min(a.size, b.size);
}

function sourceText(spell: SourceSpell): string {
  const raw = spell.raw as Record<string, unknown>;
  return [raw.entries, raw.entriesHigherLevel].flatMap((f) => collectStringsDeep(f))
    .map((l) => stripMarkup(l, "spell")).join(" ");
}

const src2024 = new Map<string, SourceSpell>();
const src2014 = new Map<string, SourceSpell>();
for (const s of readSpells()) {
  const target = s.edition === "RULES_2024" ? src2024 : src2014;
  const k = findLooseNameKey(s.nameEng);
  if (!target.has(k)) target.set(k, s);
}

const RENAMES: Record<string, string> = {
  "shiningsmite": "brandingsmite",
  "befuddlement": "feeblemind",
  "summondragon": "summondraconicspirit",
};

/// Дефолт — увесь каталог. Черга WotC лишається лише як звірка (`--queue`): виміряно, що вона
/// не додає жодного запису до верхівки, зате **відрізає 87** кандидатів із таким самим балом,
/// серед них `Eldritch Blast`, `Burning Hands`, `Thunderwave`, `Charm Person`.
const useQueue = process.argv.includes("--queue");
const names = useQueue ? queue : catalog.map((r) => r.engName);

const rows = names
  .map((name) => {
    const k = findLooseNameKey(name);
    const hit = by2024.get(k);
    if (!hit || read.has(hit.row.engName) || hit.d.differsFrom2014) return null;
    const older = by2014.get(k);
    const en24 = src2024.get(k);
    const en14 = src2014.get(RENAMES[k] ?? k);
    if (!older || !en24 || !en14) return null;

    const englishChanged = 1 - overlap(shingles(sourceText(en24), false), shingles(sourceText(en14), false));
    const ukrStale = overlap(shingles(hit.row.description, true), shingles(older.description, true));
    return { name, englishChanged, ukrStale, score: englishChanged * ukrStale };
  })
  .filter((r): r is NonNullable<typeof r> => r !== null)
  .sort((a, b) => b.score - a.score);

console.log(`оцінено: ${rows.length}\n`);
console.log("бал  англ.змінилось  укр.=2014  назва");
for (const r of rows.slice(0, 42)) {
  console.log(`${r.score.toFixed(2)}   ${r.englishChanged.toFixed(2)}          ${r.ukrStale.toFixed(2)}      ${r.name}`);
}
const BANDS = [0.6, 0.4, 0.25, 0.1, 0];
console.log("\n=== розподіл за балом ===");
for (let i = 0; i < BANDS.length; i += 1) {
  const high = i === 0 ? 1.01 : BANDS[i - 1];
  const n = rows.filter((r) => r.score >= BANDS[i] && r.score < high).length;
  console.log(`  ${BANDS[i].toFixed(2)}–${high.toFixed(2)}: ${n}`);
}

if (!useQueue) {
  const inQueue = new Set(queue.map((n) => findLooseNameKey(n)));
  const missedByQueue = rows.filter((r) => !inQueue.has(findLooseNameKey(r.name)));
  console.log(`\n=== високий бал, але СПИСКУ НЕМАЄ (${missedByQueue.length}) ===`);
  for (const r of missedByQueue.slice(0, 25)) {
    console.log(`${r.score.toFixed(2)}   ${r.englishChanged.toFixed(2)}          ${r.ukrStale.toFixed(2)}      ${r.name}`);
  }
}
