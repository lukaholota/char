import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { CreatureTranslation } from "../aidedd/build-creature-record";
import { StatblockEntry } from "../aidedd/creature-schema";
import { findPinnedStatblock, readBatchRows } from "./creature-batches";
import { readCreatures } from "./schema";

/// Чи вживалася вже українська форма цієї англійської назви секції — і чи вживалася вона в
/// одному вигляді. Питання не дозвільне: «Air Form», «Vanish» і «Teleport» уже приїжджали в
/// цей KR під двома іменами кожен, і щоразу це знаходили після збірки, а не до неї.
/// Індекс зводиться з самих партій: англійська назва береться з пінованого статблока, а
/// українська — з рядка перекладу на тій самій позиції секції.
const TRANSLATIONS_DIR = join(process.cwd(), "data/5etools/translations/monsters-2014");

const SECTIONS = [
  "traits",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
  "lairActions",
  "regionEffects",
  "mythicActions",
] as const;

function printPrecedents(): void {
  const index = buildNameIndex();
  const wanted = readWantedNames();
  const keys = wanted.length > 0 ? wanted : [...index.keys()].sort();

  for (const key of keys) {
    const forms = index.get(key);
    if (!forms) {
      console.log(`${key}\t— немає в проведених партіях`);
      continue;
    }
    const printed = [...forms].map(([ukrainian, uses]) => `${ukrainian} (${uses})`).join(" | ");
    console.log(`${key}\t${printed}${forms.size > 1 ? "   ⚠ РОЗХІД" : ""}`);
  }
}

function buildNameIndex(): Map<string, Map<string, number>> {
  const corpus = readCreatures().filter((creature) => creature.isFullStatblock);
  const index = new Map<string, Map<string, number>>();

  for (const file of readdirSync(TRANSLATIONS_DIR).sort()) {
    const batch = Number(file.replace("batch-", "").replace(".json", ""));
    const translations = JSON.parse(readFileSync(join(TRANSLATIONS_DIR, file), "utf-8")) as CreatureTranslation[];
    const bySlug = new Map(translations.map((entry) => [entry.slug, entry]));

    for (const row of readBatchRows(batch)) {
      const translation = bySlug.get(row.slug);
      if (!translation) continue;
      const parsed = findPinnedStatblock(row, corpus);

      for (const section of SECTIONS) {
        const english = parsed[section] as StatblockEntry[];
        const ukrainian = (translation[section] ?? []) as StatblockEntry[];
        english.forEach((entry, position) => countPair(index, entry.name, ukrainian[position]?.name ?? ""));
      }
    }
  }

  return index;
}

function countPair(index: Map<string, Map<string, number>>, english: string, ukrainian: string): void {
  if (english === "" || ukrainian === "") return;
  const forms = index.get(english) ?? new Map<string, number>();
  forms.set(ukrainian, (forms.get(ukrainian) ?? 0) + 1);
  index.set(english, forms);
}

/// Назви приймаються файлом, по одній на рядок: у них є коми, апострофи й дужки, і командний
/// рядок їх калічить.
function readWantedNames(): string[] {
  const path = process.argv[2];
  if (!path) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

printPrecedents();
