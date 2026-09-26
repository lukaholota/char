/// KR48.3 — заклинання, які раса чи підраса 2014 дає сама, за рівнем ПЕРСОНАЖА: замовляння з 1-го
/// («you know the thaumaturgy cantrip») і вроджена магія з 3-го й 5-го («Hellish Rebuke once per long rest»).
/// Вибір замовляння гравцем (Високий ельф, Кобольд, Астральний ельф) сюди не входить — лише в `uncovered`.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { MIRROR_REVISION, readCachedValue } from "./mirror";
import { findLooseNameKey } from "./schema";

const OUTPUT_PATH = "data/2014/race-granted-spells.json";
const CATALOG_PATH = "data/2014/spells.json";

export type RaceGrantMechanic = "known" | "innate";

export type RaceGrantedSpell = { engName: string; characterLevel: number; mechanic: RaceGrantMechanic };

export type RaceGrantedSpells = { race: string; subrace: string | null; definedIn: string; spells: RaceGrantedSpell[] };

export type UncoveredRaceGrant = { race: string; subrace: string | null; reason: string };

export type RaceGrantedSpellsFile = { races: RaceGrantedSpells[]; uncovered: UncoveredRaceGrant[] };

type Target = { race: string; subrace: string | null };

/// Ключ раси — «Назва|книга», підраси — «Раса|Назва|книга». Раса з заклинаннями поза переліком і поза
/// `SOURCES_WITHOUT_OUR_RACES` зупиняє генерацію.
const TARGET_BY_MIRROR_KEY: Readonly<Record<string, Target>> = {
  "Aarakocra|MPMM": { race: "AARAKOCRA_MPMM", subrace: null },
  "Aasimar|MPMM": { race: "AASIMAR_MPMM", subrace: null },
  "Astral Elf|AAG": { race: "ASTRAL_ELF_SPELLJAMMER", subrace: null },
  "Deep Gnome|MPMM": { race: "DEEP_GNOME_MPMM", subrace: null },
  "Duergar|MPMM": { race: "DUERGAR_MPMM", subrace: null },
  "Fairy|MPMM": { race: "FAIRY_MPMM", subrace: null },
  "Firbolg|MPMM": { race: "FIRBOLG_MPMM", subrace: null },
  "Githyanki|MPMM": { race: "GITHYANKI_MPMM", subrace: null },
  "Githzerai|MPMM": { race: "GITHZERAI_MPMM", subrace: null },
  "Hexblood|VRGR": { race: "HEXBLOOD_VRGTR", subrace: null },
  "Kobold|MPMM": { race: "KOBOLD_MPMM", subrace: null },
  "Tiefling|PHB": { race: "TIEFLING_2014", subrace: null },
  "Triton|MPMM": { race: "TRITON_MPMM", subrace: null },
  "Yuan-Ti|MPMM": { race: "YUAN_TI_MPMM", subrace: null },
  "Dwarf|Duergar|MTF": { race: "DWARF_2014", subrace: "DWARF_DUERGAR_GRAY_SCAG" },
  "Elf|Drow|PHB": { race: "ELF_2014", subrace: "ELF_DARK_DROW_2014" },
  "Elf|Eladrin|DMG": { race: "ELF_2014", subrace: "ELF_ELADRIN_DMG" },
  "Elf|High|PHB": { race: "ELF_2014", subrace: "ELF_HIGH_2014" },
  "Elf|Pallid|EGW": { race: "ELF_2014", subrace: "ELF_PALLID_EGTW" },
  "Genasi|Air|MPMM": { race: "GENASI_AIR_MPMM", subrace: null },
  "Genasi|Earth|MPMM": { race: "GENASI_EARTH_MPMM", subrace: null },
  "Genasi|Fire|MPMM": { race: "GENASI_FIRE_MPMM", subrace: null },
  "Genasi|Water|MPMM": { race: "GENASI_WATER_MPMM", subrace: null },
  "Gnome|Forest|PHB": { race: "GNOME_2014", subrace: "GNOME_FOREST_2014" },
};

/// Книги й варіанти, яких у нашому каталозі 2014 немає: старі видання рас, перевидані в MPMM, UA-подібні
/// PS*, Eberron-мітки, Lorwyn, варіанти тифлінгів і напівельфів без окремої підраси в нас.
const SOURCES_WITHOUT_OUR_RACES = new Set([
  "DMG", "VGM", "EEPC", "MTF", "SCAG", "ERLW", "EGW", "PSK", "PSZ", "PSX", "LFL", "WBtW", "RHW", "EFA",
]);

const MECHANICS: readonly RaceGrantMechanic[] = ["known", "innate"];

type MirrorRace = { name: string; source: string; additionalSpells?: AdditionalSpells[] | null };
type MirrorSubrace = { raceName: string; name?: string; source: string; additionalSpells?: AdditionalSpells[] | null };
type AdditionalSpells = Partial<Record<RaceGrantMechanic | "expanded" | "prepared", Record<string, unknown>>>;

function buildRaceGrantedSpells2014(): void {
  const collected = collectRaceGrantedSpells();

  writeFileSync(
    join(process.cwd(), OUTPUT_PATH),
    JSON.stringify(
      {
        note:
          "Згенеровано scripts/5etools/build-race-granted-spells-2014.ts. Руками не редагується: " +
          "джерело — пінована ревізія дзеркала 5etools, поле additionalSpells (known/innate) рас 2014.",
        revision: MIRROR_REVISION,
        ...collected,
      },
      null,
      2,
    ) + "\n",
  );

  const spells = collected.races.reduce((sum, entry) => sum + entry.spells.length, 0);
  console.log(`✅ ${collected.races.length} рас і підрас, ${spells} заклинань, ${collected.uncovered.length} не покрито → ${OUTPUT_PATH}`);
}

export function collectRaceGrantedSpells(catalogNames: Map<string, string> = readCatalogNames()): RaceGrantedSpellsFile {
  const races: RaceGrantedSpells[] = [];
  const uncovered: UncoveredRaceGrant[] = [];

  for (const entry of readGrantingEntries()) {
    const target = findTarget(entry);
    if (!target) continue;

    const grants = entry.additionalSpells ?? [];
    if (grants.length > 1) {
      uncovered.push({ ...target, reason: `вибір варіанта: ${grants.length}` });
      continue;
    }

    const where = [target.race, target.subrace].filter(Boolean).join("/");
    const read = readGrantSpells(grants[0], catalogNames, where);
    if (read.hasChoice) uncovered.push({ ...target, reason: "вибір заклинання гравцем (choose)" });
    if (read.spells.length) races.push({ ...target, definedIn: entry.source, spells: read.spells });
  }

  return {
    races: races.sort(compareTargets),
    uncovered: uncovered.sort(compareTargets),
  };
}

export function readRaceGrantedSpellsFile(): RaceGrantedSpellsFile & { revision: string } {
  return JSON.parse(readFileSync(join(process.cwd(), OUTPUT_PATH), "utf-8"));
}

type GrantingEntry = { key: string; source: string; additionalSpells?: AdditionalSpells[] | null };

function readGrantingEntries(): GrantingEntry[] {
  const file = readCachedValue("races.json") as { race: MirrorRace[]; subrace: MirrorSubrace[] };
  const races = file.race.map((race) => ({ key: `${race.name}|${race.source}`, source: race.source, additionalSpells: race.additionalSpells }));
  const subraces = file.subrace
    .filter((subrace) => subrace.name)
    .map((subrace) => ({ key: `${subrace.raceName}|${subrace.name}|${subrace.source}`, source: subrace.source, additionalSpells: subrace.additionalSpells }));
  return [...races, ...subraces].filter(hasGrantedSpells);
}

function hasGrantedSpells(entry: GrantingEntry): boolean {
  return (entry.additionalSpells ?? []).some((grant) => MECHANICS.some((mechanic) => grant[mechanic] !== undefined));
}

function findTarget(entry: GrantingEntry): Target | null {
  const target = TARGET_BY_MIRROR_KEY[entry.key];
  if (target) return target;
  if (SOURCES_WITHOUT_OUR_RACES.has(entry.source) || entry.source.startsWith("X")) return null;
  throw new Error(`${entry.key} дає заклинання, але не зіставлений з нашою расою`);
}

function readGrantSpells(grant: AdditionalSpells, catalogNames: Map<string, string>, where: string): { spells: RaceGrantedSpell[]; hasChoice: boolean } {
  const spells: RaceGrantedSpell[] = [];
  let hasChoice = false;

  for (const mechanic of MECHANICS) {
    for (const [levelKey, entries] of Object.entries(grant[mechanic] ?? {})) {
      const characterLevel = levelKey === "_" ? 1 : readCharacterLevel(levelKey, where);
      for (const entry of flattenSpellEntries(entries)) {
        if (typeof entry === "string") spells.push({ engName: findCatalogName(entry, catalogNames, where), characterLevel, mechanic });
        else hasChoice = true;
      }
    }
  }

  return { spells: dropRepeatedSpells(spells), hasChoice };
}

/// `{"daily": {"1": [...]}}` — раз на довгий відпочинок, `{"rest": …}` — на короткий, `{"_": [...]}` — без
/// обмеження; для списку персонажа це те саме заклинання.
function flattenSpellEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [value];
  const node = value as Record<string, unknown>;
  if ("choose" in node) return [node];
  return Object.values(node).flatMap(flattenSpellEntries);
}

function readCharacterLevel(label: string, where: string): number {
  const level = Number.parseInt(label, 10);
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new Error(`${where}: незрозумілий рівень персонажа «${label}»`);
  return level;
}

/// `light#c` — замовляння, `hellish rebuke#2` — накладається 2-м рівнем, `wall of water|xge` — книга.
function findCatalogName(tag: string, catalogNames: Map<string, string>, where: string): string {
  const name = tag.split("#")[0].split("|")[0];
  const engName = catalogNames.get(findLooseNameKey(name));
  if (!engName) throw new Error(`${where}: заклинання «${name}» немає в ${CATALOG_PATH}`);
  return engName;
}

function dropRepeatedSpells(spells: readonly RaceGrantedSpell[]): RaceGrantedSpell[] {
  const byName = new Map<string, RaceGrantedSpell>();
  for (const spell of [...spells].sort((a, b) => a.characterLevel - b.characterLevel)) {
    if (!byName.has(spell.engName)) byName.set(spell.engName, spell);
  }
  return [...byName.values()];
}

function compareTargets(a: Target, b: Target): number {
  return `${a.race}|${a.subrace ?? ""}`.localeCompare(`${b.race}|${b.subrace ?? ""}`);
}

function readCatalogNames(): Map<string, string> {
  const rows = JSON.parse(readFileSync(join(process.cwd(), CATALOG_PATH), "utf-8")) as { engName: string }[];
  return new Map(rows.map((row) => [findLooseNameKey(row.engName), row.engName]));
}

if (process.argv[1]?.endsWith("build-race-granted-spells-2014.ts")) buildRaceGrantedSpells2014();
