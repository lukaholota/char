/// KR31.18 — розширені списки покровителів чорнокнижника 2014 («The following spells are added to
/// the warlock spell list for you»). У базі вони лежать у `spell_classes` під назвою підкласу, але
/// файлу-джерела не мали, і рядки розійшлися з книгою (Відьмацький клинок — 6 із 10). Тепер файл
/// виводиться з пінованої ревізії дзеркала, а сід `seed:subclass-spell-lists-2014` зводить базу з ним.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { MIRROR_REVISION, readCachedValue } from "./mirror";
import { findEditionBySource, findLooseNameKey } from "./schema";

const OUTPUT_PATH = "data/2014/warlock-expanded-spell-lists.json";
const CATALOG_PATH = "data/2014/spells.json";
const WARLOCK_CLASS_PATH = "class/class-warlock.json";

const SUBCLASS_BY_SHORT_NAME: Readonly<Record<string, string>> = {
  Archfey: "ARCHFEY",
  Fiend: "FIEND",
  "Great Old One": "GREAT_OLD_ONE",
  Undying: "UNDYING",
  Celestial: "CELESTIAL",
  Hexblade: "HEXBLADE",
  Fathomless: "FATHOMLESS",
  Genie: "THE_GENIE",
  Undead: "UNDEAD",
};

const GENIE_KIND_COLUMN = /^(Dao|Djinni|Efreeti|Marid) Spells$/;

export type PatronSpellEntry = { engName: string; level: number; genieKind: string | null };

export type PatronSpellList = { subclass: string; subclassEng: string; definedIn: string; spells: PatronSpellEntry[] };

type SubclassFeature = {
  name: string;
  source: string;
  className: string;
  subclassShortName: string;
  level: number;
  entries: unknown;
};

type SpellTable = { type: "table"; colLabels: string[]; rows: string[][] };

function buildWarlockExpandedSpellLists(): void {
  const lists = collectPatronSpellLists();

  writeFileSync(
    join(process.cwd(), OUTPUT_PATH),
    JSON.stringify(
      {
        note:
          "Згенеровано scripts/5etools/build-warlock-expanded-spell-lists.ts. Руками не редагується: " +
          "джерело — пінована ревізія дзеркала 5etools, таблиця «Expanded Spell List» у class/class-warlock.json.",
        revision: MIRROR_REVISION,
        lists,
      },
      null,
      2,
    ) + "\n",
  );

  const spells = lists.reduce((sum, list) => sum + list.spells.length, 0);
  console.log(`✅ ${lists.length} покровителів, ${spells} заклинань → ${OUTPUT_PATH}`);
}

export function collectPatronSpellLists(catalogNames: Map<string, string> = readCatalogNames()): PatronSpellList[] {
  const lists = readWarlockSubclassFeatures()
    .filter((feature) => feature.className === "Warlock" && findEditionBySource(feature.source) === "RULES_2014")
    .flatMap((feature) => {
      const table = findExpandedSpellTable(feature.entries);
      return table ? [buildList(feature, table, catalogNames)] : [];
    });

  return dropRepeatedLists(lists).sort((a, b) => a.subclass.localeCompare(b.subclass));
}

export function readPatronSpellListsFile(): PatronSpellList[] {
  const file = JSON.parse(readFileSync(join(process.cwd(), OUTPUT_PATH), "utf-8")) as { lists: PatronSpellList[] };
  return file.lists;
}

function readWarlockSubclassFeatures(): SubclassFeature[] {
  const file = readCachedValue(WARLOCK_CLASS_PATH) as { subclassFeature?: SubclassFeature[] };
  return file.subclassFeature ?? [];
}

function readCatalogNames(): Map<string, string> {
  const rows = JSON.parse(readFileSync(join(process.cwd(), CATALOG_PATH), "utf-8")) as { engName: string }[];
  return new Map(rows.map((row) => [findLooseNameKey(row.engName), row.engName]));
}

/// Таблиця живе всередині вузла «Expanded Spell List»; у Джина вона одна, але з колонкою на кожен рід.
function findExpandedSpellTable(entries: unknown): SpellTable | null {
  const holder = findNode(entries, (node) => /Expanded Spell List/i.test(String(node.name ?? "")));
  const table = holder ? findNode(holder, (node) => node.type === "table") : null;
  return table ? (table as unknown as SpellTable) : null;
}

function findNode(value: unknown, matches: (node: Record<string, unknown>) => boolean): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNode(item, matches);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const node = value as Record<string, unknown>;
  if (matches(node)) return node;
  return findNode(Object.values(node), matches);
}

function buildList(feature: SubclassFeature, table: SpellTable, catalogNames: Map<string, string>): PatronSpellList {
  const subclass = SUBCLASS_BY_SHORT_NAME[feature.subclassShortName];
  if (!subclass) throw new Error(`${feature.name}: невідомий покровитель «${feature.subclassShortName}»`);

  const spells = table.rows.flatMap((row) => readRowSpells(row, table.colLabels, catalogNames, feature.subclassShortName));
  return { subclass, subclassEng: feature.subclassShortName, definedIn: feature.source, spells };
}

function readRowSpells(row: string[], colLabels: string[], catalogNames: Map<string, string>, where: string): PatronSpellEntry[] {
  const level = readSpellLevel(row[0], where);
  return row.slice(1).flatMap((cell, index) => {
    const genieKind = GENIE_KIND_COLUMN.exec(colLabels[index + 1] ?? "")?.[1] ?? null;
    return readSpellTags(cell).map((tag) => ({ engName: findCatalogName(tag, catalogNames, where), level, genieKind }));
  });
}

function readSpellLevel(label: string, where: string): number {
  const level = Number.parseInt(label, 10);
  if (!Number.isInteger(level) || level < 1 || level > 9) throw new Error(`${where}: незрозумілий рівень «${label}»`);
  return level;
}

function readSpellTags(cell: string): string[] {
  return [...cell.matchAll(/\{@spell ([^}|]+)(?:\|[^}]*)?\}/g)].map((match) => match[1]);
}

function findCatalogName(tag: string, catalogNames: Map<string, string>, where: string): string {
  const engName = catalogNames.get(findLooseNameKey(tag));
  if (!engName) throw new Error(`${where}: заклинання «${tag}» немає в ${CATALOG_PATH}`);
  return engName;
}

/// Той самий покровитель у корпусі лежить і у своїй книзі, і в перевиданні; перелік у них один.
function dropRepeatedLists(lists: PatronSpellList[]): PatronSpellList[] {
  const seen = new Map<string, PatronSpellList>();
  for (const list of lists) {
    const known = seen.get(list.subclass);
    if (known && JSON.stringify(known.spells) !== JSON.stringify(list.spells)) {
      throw new Error(`${list.subclassEng}: два різні переліки — ${known.definedIn} і ${list.definedIn}`);
    }
    if (!known) seen.set(list.subclass, list);
  }
  return [...seen.values()];
}

if (process.argv[1]?.endsWith("build-warlock-expanded-spell-lists.ts")) buildWarlockExpandedSpellLists();
