/// Переписує назви рис бестіарію 2024 на затверджені в `dictionary.json → statblockFeatures`,
/// але ТІЛЬКИ для 24 назв «купи 1» зі звірки 2026-08-21 (`ratification-diff-2024.md`).
/// Колізійні назви (`Spellcasting`, `Claw`, `Pounce`, `Charge`, `Talons`, `Claws`, `Slam`,
/// `Constrict`, `Swallow`, `Javelin`) свідомо НЕ чіпає — вони чекають на рішення власника.
///
///   npx tsx data/aidedd/apply-ratification-safe.ts            # сухий прогін, нічого не пише
///   npx tsx data/aidedd/apply-ratification-safe.ts --apply    # запис у партії
///
/// Ідемпотентний: повторний прогін після --apply дає 0 змін. Падає, якщо правка створила б
/// у записі дві риси з однаковою назвою або якщо стару назву згадано в прозі того ж запису.
/// Файл лежить у data/aidedd/ навмисно — межі сесії звірки не дозволяли писати в scripts/.
/// Після підпису власника йому місце у scripts/aidedd/.

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parseMonster2024 } from "../../scripts/aidedd/parse-monster-2024";
import { cutSuffix } from "../../scripts/aidedd/ratify-glossary";
import dictionaryFile from "../../src/lib/refs/dictionary.json";

const RATIFIED: Record<string, string> = dictionaryFile.DND_DICTIONARY.statblockFeatures;
const TRANSLATIONS = join(process.cwd(), "data/aidedd/translations/monsters-2024");
const RAW = join(process.cwd(), "data/aidedd/raw/monsters-2024");
const SECTIONS = ["traits", "actions", "bonusActions", "reactions", "legendaryActions"] as const;

const SAFE_ENGLISH = [
  "Amphibious", "Pack Tactics", "Fire Breath", "Flyby", "Acid Breath", "Cold Breath",
  "Lightning Breath", "Web Walker", "Water Breathing", "Hold Breath", "Magic Resistance",
  "Amorphous", "Sleep Breath", "Ram", "Standing Leap", "Blood Frenzy", "Spider Climb",
  "Repulsion Breath", "Superior Invisibility", "Arcane Burst", "Illumination", "Mimicry",
  "Telepathic Shroud", "Touch",
];

type Entry = { name: string; text: string };
type Row = { slug: string; name: string } & Partial<Record<(typeof SECTIONS)[number], Entry[]>>;
type Change = { batch: string; slug: string; section: string; english: string; from: string; to: string };

function applyRatification(): void {
  const shouldWrite = process.argv.includes("--apply");
  const changes: Change[] = [];
  let touchedFiles = 0;

  for (const batch of readdirSync(TRANSLATIONS).filter((file) => file.endsWith(".json")).sort()) {
    const path = join(TRANSLATIONS, batch);
    const source = readFileSync(path, "utf-8");
    const rows = JSON.parse(source) as Row[];
    const before = JSON.stringify(rows);

    for (const row of rows) changes.push(...rewriteRow(batch, row));

    if (before === JSON.stringify(rows)) continue;
    touchedFiles += 1;
    if (shouldWrite) writeFileSync(path, serializeLikeSource(rows, source), "utf-8");
  }

  printChanges(changes);
  console.log(
    `\n${changes.length} назв у ${new Set(changes.map((c) => c.slug)).size} істот, файлів: ${touchedFiles}` +
      (shouldWrite ? " — записано" : " — сухий прогін, нічого не записано (--apply, щоб застосувати)")
  );
}

/// Партії 12–14 записані з відступом в один пробіл, решта — у два. Повне пересеріалізування
/// «за замовчуванням» дало б діф на 5 400 рядків замість 160, тому відступ читаємо з файлу.
function serializeLikeSource(rows: Row[], source: string): string {
  const indent = /^\[\r?\n( +)\{/.exec(source)?.[1].length ?? 2;
  const text = JSON.stringify(rows, null, indent);
  return source.endsWith("\n") ? `${text}\n` : text;
}

function rewriteRow(batch: string, row: Row): Change[] {
  const parsed = parseMonster2024(readFileSync(join(RAW, `${row.slug}.html`), "utf-8"), row.slug);
  const prose = collectProse(row);
  const changes: Change[] = [];

  for (const section of SECTIONS) {
    const english = parsed[section];
    const ukrainian = row[section] ?? [];

    for (let index = 0; index < Math.min(english.length, ukrainian.length); index += 1) {
      const key = cutSuffix(english[index].name).base;
      if (!SAFE_ENGLISH.includes(key)) continue;

      const target = RATIFIED[key];
      if (!target) throw new Error(`«${key}» немає в statblockFeatures — словник змінився, перевір перелік`);

      const current = cutSuffix(ukrainian[index].name);
      if (current.base === target) continue;

      assertProseIsClean(row.slug, current.base, prose);
      const renamed = current.suffix === "" ? target : `${target} (${current.suffix})`;
      assertNoDuplicate(row, renamed, section, index);

      changes.push({ batch, slug: row.slug, section, english: key, from: ukrainian[index].name, to: renamed });
      ukrainian[index].name = renamed;
    }
  }

  return changes;
}

function collectProse(row: Row): string {
  return SECTIONS.flatMap((section) => (row[section] ?? []).map((entry) => entry.text)).join("\n");
}

function assertProseIsClean(slug: string, oldName: string, prose: string): void {
  if (prose.includes(oldName)) {
    throw new Error(
      `${slug}: стару назву «${oldName}» згадано в прозі запису — перейменування розсинхронізує текст, правити вручну`
    );
  }
}

function assertNoDuplicate(row: Row, renamed: string, section: string, index: number): void {
  const clash = SECTIONS.some((other) =>
    (row[other] ?? []).some((entry, at) => !(other === section && at === index) && entry.name === renamed)
  );
  if (clash) throw new Error(`${row.slug}: назва «${renamed}» уже зайнята в цьому записі`);
}

function printChanges(changes: Change[]): void {
  const grouped = new Map<string, Change[]>();
  for (const change of changes) {
    grouped.set(change.english, [...(grouped.get(change.english) ?? []), change]);
  }
  for (const [english, list] of [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${english} → «${RATIFIED[english]}» (${list.length})`);
    for (const change of list) console.log(`  ${change.batch} ${change.slug}: «${change.from}» → «${change.to}»`);
  }
}

applyRatification();
