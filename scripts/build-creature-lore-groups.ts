/**
 * KR33.8 — вступи до груп істот («Дракони», «Демони») → `src/lib/generated/creature-lore-groups.json`.
 *
 *   bun run build:creature-lore-groups
 *
 * Текст береться з `data/<редакція>/bestiary-lore/groups.json`, склад групи — з дерева лору
 * 5etools у дзеркалі (`_copy` від істоти до кореня), а id істот — з уже зібраних каталогів
 * `creatures.json` / `creatures2024.json`. Потрібне стягнуте дзеркало.
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { readLoreGroups } from "./5etools/bestiary-lore";
import { findLooseNameKey } from "./5etools/schema";
import {
  BESTIARY_LORE_EDITIONS,
  BestiaryLoreEdition,
  LORE_GROUPS_AWAITING_CREATURES,
  LORE_GROUPS_WITHOUT_LORE,
  readBestiaryLoreSource,
} from "./lib/bestiary-lore-source";
import { failOnShrunkCatalog } from "./lib/fail-on-shrunk-catalog";
import creatures2014 from "../src/lib/generated/creatures.json";
import creatures2024 from "../src/lib/generated/creatures2024.json";

type CatalogRow = { creatureId: number; nameEng: string; source: string };

type LoreGroupRecord = {
  key: string;
  ruleset: BestiaryLoreEdition;
  name: string;
  engName: string;
  source: string;
  description: string;
  creatureIds: number[];
};

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/creature-lore-groups.json");

/// Виміряно 2026-09-18: 26 коренів дерева в MM 2014 і 83 у MM 2024, з яких модрони 2024 чекають
/// на істот, а «Animals» несе службову врізку замість лору.
const MINIMUM_EXPECTED_LORE_GROUPS = 107;

const CATALOGS: Record<BestiaryLoreEdition, { rows: CatalogRow[]; source: string }> = {
  RULES_2014: { rows: creatures2014 as CatalogRow[], source: "MM" },
  RULES_2024: { rows: creatures2024 as CatalogRow[], source: "MM_2024" },
};

const groups = BESTIARY_LORE_EDITIONS.flatMap(buildEditionGroups);
failOnShrunkCatalog("групи лору бестіарію", groups.length, MINIMUM_EXPECTED_LORE_GROUPS);
writeFileSync(OUTPUT_PATH, `${JSON.stringify(groups, null, 2)}\n`, "utf-8");
console.log(
  `✅ ${groups.length} груп лору у ${OUTPUT_PATH} (${groups.reduce((total, group) => total + group.creatureIds.length, 0)} істот у групах)`
);

function buildEditionGroups(edition: BestiaryLoreEdition): LoreGroupRecord[] {
  const translated = readBestiaryLoreSource(edition);
  const mirrored = new Map(readLoreGroups(edition).map((group) => [group.key, group]));
  const catalog = buildCatalogIndex(edition);

  const untranslated = [...mirrored.keys()].filter((key) => !translated.some((entry) => entry.key === key));
  if (untranslated.length > 0) throw new Error(`${edition}: у файлі-джерелі немає груп із дзеркала: ${untranslated.join(", ")}`);

  return translated.flatMap((entry) => {
    const group = mirrored.get(entry.key);
    if (!group) throw new Error(`${edition}: групи «${entry.key}» немає в дереві лору 5etools`);
    if (LORE_GROUPS_WITHOUT_LORE[edition].includes(entry.key)) return [];
    if (LORE_GROUPS_AWAITING_CREATURES[edition].includes(entry.key)) {
      failOnArrivedCreatures(group.memberNames, catalog, `${edition}/${entry.key}`);
      return [];
    }
    return {
      key: entry.key,
      ruleset: edition,
      name: entry.name,
      engName: entry.engName,
      source: entry.source,
      description: entry.description,
      creatureIds: resolveMemberIds(group.memberNames, catalog, `${edition}/${entry.key}`),
    };
  });
}

function failOnArrivedCreatures(memberNames: string[], catalog: Map<string, number>, where: string): void {
  const arrived = memberNames.filter((name) => catalog.has(findLooseNameKey(name)));
  if (arrived.length > 0)
    throw new Error(`${where}: істоти вже є в каталозі (${arrived.join(", ")}) — прибрати групу з LORE_GROUPS_AWAITING_CREATURES`);
}

function buildCatalogIndex(edition: BestiaryLoreEdition): Map<string, number> {
  const { rows, source } = CATALOGS[edition];
  return new Map(rows.filter((row) => row.source === source).map((row) => [findLooseNameKey(row.nameEng), row.creatureId]));
}

/// «Faerie Dragon (Red)» у дереві лору — один запис «Faerie Dragon» у каталозі: варіант у дужках
/// відкидається, коли повної назви немає. Істота, якої в каталозі немає взагалі, лишається поза
/// групою й називається в журналі, а не губиться мовчки.
function resolveMemberIds(memberNames: string[], catalog: Map<string, number>, where: string): number[] {
  const ids = new Set<number>();
  const unmatched: string[] = [];
  for (const name of memberNames) {
    const id = catalog.get(findLooseNameKey(name)) ?? catalog.get(findLooseNameKey(name.replace(/\s*\([^)]*\)\s*$/, "")));
    if (id === undefined) unmatched.push(name);
    else ids.add(id);
  }
  if (unmatched.length > 0) console.warn(`⚠ ${where}: у каталозі немає ${unmatched.join(", ")}`);
  if (ids.size === 0) throw new Error(`${where}: жодної істоти групи немає в каталозі`);
  return [...ids].sort((a, b) => a - b);
}
