/// KR48.1 — заклинання, які підклас 2014 дає сам, за рівнем класу: домени клірика, клятви паладина,
/// кола друїда, підкласи артифіцера («always prepared») і магія підкласів чародія, слідопита й інших
/// («you learn… it doesn't count against the number of spells you know»). Розширені списки покровителів
/// сюди не входять — їх гравець обирає сам (`build-warlock-expanded-spell-lists.ts`).

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { MIRRORED_CLASSES, MIRROR_REVISION, readCachedValue } from "./mirror";
import { findLooseNameKey } from "./schema";

const OUTPUT_PATH = "data/2014/subclass-granted-spells.json";
const CATALOG_PATH = "data/2014/spells.json";

export type GrantMechanic = "prepared" | "known";

export type SubclassGrantedSpell = { engName: string; classLevel: number; mechanic: GrantMechanic };

export type SubclassGrantedSpells = { subclass: string; className: string; subclassEng: string; definedIn: string; spells: SubclassGrantedSpell[] };

export type UncoveredGrant = { subclass: string; reason: string };

export type SubclassGrantedSpellsFile = { subclasses: SubclassGrantedSpells[]; uncovered: UncoveredGrant[] };

/// Ключ — «Клас|коротка назва|книга» з корпусу. Підклас поза цим переліком, що має `prepared` чи `known`,
/// зупиняє генерацію: нова ревізія дзеркала має змусити вирішити, а не мовчки загубитись.
const SUBCLASS_BY_MIRROR_KEY: Readonly<Record<string, { subclass: string; className: string }>> = {
  "Artificer|Alchemist|TCE": { subclass: "ALCHEMIST", className: "ARTIFICER_2014" },
  "Artificer|Armorer|TCE": { subclass: "ARMORER", className: "ARTIFICER_2014" },
  "Artificer|Artillerist|TCE": { subclass: "ARTILLERIST", className: "ARTIFICER_2014" },
  "Artificer|Battle Smith|TCE": { subclass: "BATTLE_SMITH", className: "ARTIFICER_2014" },
  "Bard|Lore|PHB": { subclass: "COLLEGE_OF_LORE", className: "BARD_2014" },
  "Bard|Spirits|VRGR": { subclass: "COLLEGE_OF_SPIRITS", className: "BARD_2014" },
  "Cleric|Arcana|SCAG": { subclass: "ARCANA_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Death|DMG": { subclass: "DEATH_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Forge|XGE": { subclass: "FORGE_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Grave|XGE": { subclass: "GRAVE_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Knowledge|PHB": { subclass: "KNOWLEDGE_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Life|PHB": { subclass: "LIFE_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Light|PHB": { subclass: "LIGHT_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Nature|PHB": { subclass: "NATURE_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Order|TCE": { subclass: "ORDER_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Peace|TCE": { subclass: "PEACE_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Tempest|PHB": { subclass: "TEMPEST_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Trickery|PHB": { subclass: "TRICKERY_DOMAIN", className: "CLERIC_2014" },
  "Cleric|Twilight|TCE": { subclass: "TWILIGHT_DOMAIN", className: "CLERIC_2014" },
  "Cleric|War|PHB": { subclass: "WAR_DOMAIN", className: "CLERIC_2014" },
  "Druid|Land|PHB": { subclass: "CIRCLE_OF_THE_LAND", className: "DRUID_2014" },
  "Druid|Moon|PHB": { subclass: "CIRCLE_OF_THE_MOON", className: "DRUID_2014" },
  "Druid|Spores|TCE": { subclass: "CIRCLE_OF_SPORES", className: "DRUID_2014" },
  "Druid|Stars|TCE": { subclass: "CIRCLE_OF_STARS", className: "DRUID_2014" },
  "Druid|Wildfire|TCE": { subclass: "CIRCLE_OF_WILDFIRE", className: "DRUID_2014" },
  "Fighter|Arcane Archer|XGE": { subclass: "ARCANE_ARCHER", className: "FIGHTER_2014" },
  "Monk|Shadow|PHB": { subclass: "WAY_OF_SHADOW", className: "MONK_2014" },
  "Paladin|Ancients|PHB": { subclass: "OATH_OF_THE_ANCIENTS", className: "PALADIN_2014" },
  "Paladin|Conquest|XGE": { subclass: "OATH_OF_CONQUEST", className: "PALADIN_2014" },
  "Paladin|Crown|SCAG": { subclass: "OATH_OF_THE_CROWN", className: "PALADIN_2014" },
  "Paladin|Devotion|PHB": { subclass: "OATH_OF_DEVOTION", className: "PALADIN_2014" },
  "Paladin|Glory|TCE": { subclass: "OATH_OF_GLORY", className: "PALADIN_2014" },
  "Paladin|Oathbreaker|DMG": { subclass: "OATHBREAKER", className: "PALADIN_2014" },
  "Paladin|Redemption|XGE": { subclass: "OATH_OF_REDEMPTION", className: "PALADIN_2014" },
  "Paladin|Vengeance|PHB": { subclass: "OATH_OF_VENGEANCE", className: "PALADIN_2014" },
  "Paladin|Watchers|TCE": { subclass: "OATH_OF_THE_WATCHERS", className: "PALADIN_2014" },
  "Ranger|Drakewarden|FTD": { subclass: "DRAKEWARDEN", className: "RANGER_2014" },
  "Ranger|Fey Wanderer|TCE": { subclass: "FEY_WANDERER", className: "RANGER_2014" },
  "Ranger|Gloom Stalker|XGE": { subclass: "GLOOM_STALKER_CONCLAVE", className: "RANGER_2014" },
  "Ranger|Horizon Walker|XGE": { subclass: "HORIZON_WALKER_CONCLAVE", className: "RANGER_2014" },
  "Ranger|Monster Slayer|XGE": { subclass: "MONSTER_SLAYER_CONCLAVE", className: "RANGER_2014" },
  "Ranger|Swarmkeeper|TCE": { subclass: "SWARMKEEPER", className: "RANGER_2014" },
  "Rogue|Arcane Trickster|PHB": { subclass: "ARCANE_TRICKSTER", className: "ROGUE_2014" },
  "Sorcerer|Aberrant Mind|TCE": { subclass: "ABERRANT_MIND", className: "SORCERER_2014" },
  "Sorcerer|Clockwork Soul|TCE": { subclass: "CLOCKWORK_SOUL", className: "SORCERER_2014" },
  "Sorcerer|Divine Soul|XGE": { subclass: "DIVINE_SOUL", className: "SORCERER_2014" },
  "Sorcerer|Lunar|DSotDQ": { subclass: "LUNAR_SORCERY", className: "SORCERER_2014" },
  "Sorcerer|Shadow|XGE": { subclass: "SHADOW_MAGIC", className: "SORCERER_2014" },
  "Warlock|Celestial|XGE": { subclass: "CELESTIAL", className: "WARLOCK_2014" },
  "Warlock|Fathomless|TCE": { subclass: "FATHOMLESS", className: "WARLOCK_2014" },
  "Warlock|Undying|SCAG": { subclass: "UNDYING", className: "WARLOCK_2014" },
  "Wizard|Illusion|PHB": { subclass: "SCHOOL_OF_ILLUSION", className: "WIZARD_2014" },
};

/// Книги, чиї підкласи в нас не живуть: UA-подібні PSA, Eberron 2025 (EFA) і сторонній RHW.
const SOURCES_WITHOUT_OUR_SUBCLASSES = new Set(["PSA", "EFA", "RHW"]);

const MECHANICS: readonly GrantMechanic[] = ["prepared", "known"];

type MirrorSubclass = { className: string; shortName: string; source: string; classSource: string; additionalSpells?: AdditionalSpells[] | null };

type AdditionalSpells = Partial<Record<GrantMechanic, Record<string, unknown>>> & { name?: string };

function buildSubclassGrantedSpells2014(): void {
  const collected = collectSubclassGrantedSpells();

  writeFileSync(
    join(process.cwd(), OUTPUT_PATH),
    JSON.stringify(
      {
        note:
          "Згенеровано scripts/5etools/build-subclass-granted-spells-2014.ts. Руками не редагується: " +
          "джерело — пінована ревізія дзеркала 5etools, поле additionalSpells (prepared/known) підкласів 2014.",
        revision: MIRROR_REVISION,
        ...collected,
      },
      null,
      2,
    ) + "\n",
  );

  const spells = collected.subclasses.reduce((sum, subclass) => sum + subclass.spells.length, 0);
  console.log(`✅ ${collected.subclasses.length} підкласів, ${spells} заклинань, ${collected.uncovered.length} не покрито → ${OUTPUT_PATH}`);
}

export function collectSubclassGrantedSpells(catalogNames: Map<string, string> = readCatalogNames()): SubclassGrantedSpellsFile {
  const subclasses: SubclassGrantedSpells[] = [];
  const uncovered: UncoveredGrant[] = [];

  for (const mirrorSubclass of readGrantingSubclasses2014()) {
    const target = findTargetSubclass(mirrorSubclass);
    if (!target) continue;

    const grants = mirrorSubclass.additionalSpells ?? [];
    if (grants.length > 1) {
      uncovered.push({ subclass: target.subclass, reason: `вибір варіанта: ${describeVariants(grants)}` });
      continue;
    }

    const read = readGrantSpells(grants[0], catalogNames, target.subclass);
    if (read.hasChoice) uncovered.push({ subclass: target.subclass, reason: "вибір заклинання гравцем (choose)" });
    if (read.spells.length) {
      subclasses.push({ ...target, subclassEng: mirrorSubclass.shortName, definedIn: mirrorSubclass.source, spells: read.spells });
    }
  }

  return {
    subclasses: subclasses.sort((a, b) => a.subclass.localeCompare(b.subclass)),
    uncovered: uncovered.sort((a, b) => a.subclass.localeCompare(b.subclass)),
  };
}

export function readSubclassGrantedSpellsFile(): SubclassGrantedSpellsFile & { revision: string } {
  return JSON.parse(readFileSync(join(process.cwd(), OUTPUT_PATH), "utf-8"));
}

function readGrantingSubclasses2014(): MirrorSubclass[] {
  return MIRRORED_CLASSES.flatMap((name) => {
    const file = readCachedValue(`class/class-${name}.json`) as { subclass?: MirrorSubclass[] };
    return (file.subclass ?? []).filter((subclass) => !subclass.classSource.startsWith("X") && hasGrantedSpells(subclass));
  });
}

function hasGrantedSpells(subclass: MirrorSubclass): boolean {
  return (subclass.additionalSpells ?? []).some((grant) => MECHANICS.some((mechanic) => grant[mechanic] !== undefined));
}

function findTargetSubclass(subclass: MirrorSubclass): { subclass: string; className: string } | null {
  const target = SUBCLASS_BY_MIRROR_KEY[`${subclass.className}|${subclass.shortName}|${subclass.source}`];
  if (target) return target;
  if (SOURCES_WITHOUT_OUR_SUBCLASSES.has(subclass.source)) return null;
  throw new Error(`${subclass.className} ${subclass.shortName} (${subclass.source}) дає заклинання, але не зіставлений з нашим підкласом`);
}

function describeVariants(grants: readonly AdditionalSpells[]): string {
  const names = grants.map((grant) => grant.name).filter((name): name is string => Boolean(name));
  return names.length ? names.join(", ") : `${grants.length} варіанти`;
}

function readGrantSpells(grant: AdditionalSpells, catalogNames: Map<string, string>, where: string): { spells: SubclassGrantedSpell[]; hasChoice: boolean } {
  const spells: SubclassGrantedSpell[] = [];
  let hasChoice = false;

  for (const mechanic of MECHANICS) {
    for (const [levelKey, entries] of Object.entries(grant[mechanic] ?? {})) {
      const classLevel = readClassLevel(levelKey, where);
      for (const entry of flattenSpellEntries(entries)) {
        if (typeof entry === "string") spells.push({ engName: findCatalogName(entry, catalogNames, where), classLevel, mechanic });
        else hasChoice = true;
      }
    }
  }

  return { spells: dropRepeatedSpells(spells), hasChoice };
}

/// Рівень може нести масив одразу або обгортку: `{"_": [...]}` — без обмеження використань,
/// `{"daily": {"1": [...]}}` — раз на день (Щупальця Безодні); для списку персонажа це те саме заклинання.
function flattenSpellEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [value];
  const node = value as Record<string, unknown>;
  if ("choose" in node) return [node];
  return Object.values(node).flatMap(flattenSpellEntries);
}

function readClassLevel(label: string, where: string): number {
  const level = Number.parseInt(label, 10);
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new Error(`${where}: незрозумілий рівень класу «${label}»`);
  return level;
}

/// `light#c` — позначка замовляння, `summon aberration|TCE` — книга; каталогу потрібна лише назва.
function findCatalogName(tag: string, catalogNames: Map<string, string>, where: string): string {
  const name = tag.split("#")[0].split("|")[0];
  const engName = catalogNames.get(findLooseNameKey(name));
  if (!engName) throw new Error(`${where}: заклинання «${name}» немає в ${CATALOG_PATH}`);
  return engName;
}

/// Той самий підклас не дає одне заклинання двічі; якщо корпус так пише — лишається нижчий рівень.
function dropRepeatedSpells(spells: readonly SubclassGrantedSpell[]): SubclassGrantedSpell[] {
  const byName = new Map<string, SubclassGrantedSpell>();
  for (const spell of [...spells].sort((a, b) => a.classLevel - b.classLevel)) {
    if (!byName.has(spell.engName)) byName.set(spell.engName, spell);
  }
  return [...byName.values()];
}

function readCatalogNames(): Map<string, string> {
  const rows = JSON.parse(readFileSync(join(process.cwd(), CATALOG_PATH), "utf-8")) as { engName: string }[];
  return new Map(rows.map((row) => [findLooseNameKey(row.engName), row.engName]));
}

if (process.argv[1]?.endsWith("build-subclass-granted-spells-2014.ts")) buildSubclassGrantedSpells2014();
