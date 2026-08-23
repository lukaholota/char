/// KR16.2 — вхід для сіда розширених списків заклинань 2014.
///
/// Рішення власника 2026-08-23 (питання 3): розширені списки (`classVariant` у 5etools,
/// здебільшого TCE) беремо дефолтно, але показуємо книгу, що їх дає. Привʼязки не пишуться
/// руками: вони виводяться з пінованої ревізії дзеркала й лягають у
/// `data/2014/extended-spell-lists.json`, який і читає сід.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { MIRROR_REVISION } from "./mirror";
import {
  findEditionBySource,
  findLooseNameKey,
  readSpellClassIndex,
  readSpells,
  SpellClassEntry,
} from "./schema";
import { findUkrainianClassName } from "./spell-facts";

const OUTPUT_PATH = "data/2014/extended-spell-lists.json";

/// Той самий каталог, що його читає `compare-spells.ts`: дамп бази в `src/lib/generated/`.
/// Межа корпусом тут не годиться — 5etools кодує через `classVariant` і власний перелік
/// заклинання з супліменту, тож корпус дає 396 привʼязок у чотирьох книгах, а нашого
/// каталогу стосуються далеко не всі. Файл описує рядки **нашого** каталогу, не чужого.
const CATALOG_PATH = "src/lib/generated/spells.json";

/// Книга розширеного списку в 5etools → наш enum `Source`. Мапа навмисно тісна: невідомий код
/// валить збірку, бо мовчазний пропуск дав би клас без атрибуції — рівно те, чого рішення
/// власника уникає. `BMT` тут немає свідомо: жодного заклинання з тієї книги в каталозі 2014
/// немає, і збірка впаде, якщо воно там колись з'явиться.
const SOURCE_BY_MIRROR_CODE: Record<string, string> = {
  TCE: "TCOE",
  XGE: "XGTE",
  FTD: "FTOD",
};

/// 5etools зараховує до переліку класу й заклинання, які дає фіча, а не список. Монах списку
/// заклинань не має взагалі: `Astral Projection` він дістає з «Empty Body» на 18 рівні.
/// Той самий виняток, що й у `compare-spells.ts`, і з тієї самої причини.
const CLASSES_GRANTED_BY_FEATURE: Record<string, string[]> = {
  "Astral Projection": ["Monk"],
};

export type ExtendedListBinding = {
  engName: string;
  className: string;
  classEng: string;
  source: string;
  definedIn: string;
};

function buildExtendedSpellLists(): void {
  const bindings = collectExtendedListBindings();

  writeFileSync(
    join(process.cwd(), OUTPUT_PATH),
    JSON.stringify(
      {
        note:
          "Згенеровано scripts/5etools/build-extended-spell-lists.ts. Руками не редагується: " +
          "джерело — пінована ревізія дзеркала 5etools, ключ classVariant у spells/sources.json.",
        revision: MIRROR_REVISION,
        bindings,
      },
      null,
      2
    ) + "\n"
  );

  console.log(`✅ ${bindings.length} привʼязок розширених списків → ${OUTPUT_PATH}`);
}

/// `engName` у файлі — назва **нашого** каталогу, а не корпусу: 5etools пише «Meld into Stone»
/// і «Protection from Evil and Good», у нас же обидві з великої літери. Сід шукає заклинання
/// точною назвою, тож розбіжність реєстру означала б «заклинання немає в каталозі».
export function collectExtendedListBindings(
  catalogNames: Map<string, string> = readCatalogNames()
): ExtendedListBinding[] {
  const classIndex = readSpellClassIndex();
  const bindings: ExtendedListBinding[] = [];

  for (const spell of readSpells()) {
    if (spell.edition !== "RULES_2014") continue;

    const engName = catalogNames.get(findLooseNameKey(spell.nameEng));
    if (!engName) continue;

    const entries = classIndex.get(`${spell.source}|${findLooseNameKey(spell.nameEng)}`);
    for (const entry of pickVariantOnlyClasses(entries, spell.nameEng)) {
      bindings.push(buildBinding(engName, entry));
    }
  }

  return dropRepeatedBindings(bindings).sort(
    (a, b) => a.engName.localeCompare(b.engName) || a.classEng.localeCompare(b.classEng)
  );
}

function readCatalogNames(): Map<string, string> {
  const rows: unknown = JSON.parse(readFileSync(join(process.cwd(), CATALOG_PATH), "utf-8"));
  if (!Array.isArray(rows)) throw new Error(`${CATALOG_PATH}: очікували масив`);

  return new Map(
    rows.map((row) => {
      const engName = String((row as { engName?: unknown }).engName ?? "");
      return [findLooseNameKey(engName), engName];
    })
  );
}

/// Клас лічиться розширеним, тільки якщо його немає в базовому переліку тієї ж редакції:
/// `Bard` у `Aid` приходить із TCE, а от `Cleric` там і в PHB, і в TCE — і це не розширення.
function pickVariantOnlyClasses(
  entries: SpellClassEntry[] | undefined,
  engName: string
): SpellClassEntry[] {
  const grantedByFeature = CLASSES_GRANTED_BY_FEATURE[engName] ?? [];
  const ofEdition = (entries ?? []).filter(
    (entry) =>
      findEditionBySource(entry.source) === "RULES_2014" && !grantedByFeature.includes(entry.name)
  );

  const base = new Set(ofEdition.filter((entry) => !entry.isVariant).map((entry) => entry.name));
  return ofEdition.filter((entry) => entry.isVariant && !base.has(entry.name));
}

function buildBinding(engName: string, entry: SpellClassEntry): ExtendedListBinding {
  const className = findUkrainianClassName(entry.name);
  if (!className) throw new Error(`${engName}: невідомий клас «${entry.name}»`);

  const source = SOURCE_BY_MIRROR_CODE[entry.definedIn];
  if (!source) {
    throw new Error(`${engName}: невідома книга розширеного списку «${entry.definedIn}»`);
  }

  return { engName, className, classEng: entry.name, source, definedIn: entry.definedIn };
}

/// Те саме заклинання лежить у кількох книгах корпусу, і кожна може повторити ту саму
/// привʼязку. У базі це був би дубль рядка — той самий дефект, що вже виправляв сід 2014.
export function dropRepeatedBindings(bindings: ExtendedListBinding[]): ExtendedListBinding[] {
  const seen = new Map<string, ExtendedListBinding>();

  for (const binding of bindings) {
    const key = `${binding.engName}|${binding.className}`;
    const known = seen.get(key);
    if (known && known.source !== binding.source) {
      throw new Error(`${binding.engName}: «${binding.className}» із двох книг — ${known.source} і ${binding.source}`);
    }
    if (!known) seen.set(key, binding);
  }

  return [...seen.values()];
}

if (process.argv[1]?.endsWith("build-extended-spell-lists.ts")) buildExtendedSpellLists();
