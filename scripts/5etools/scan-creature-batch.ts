import { ParsedCreature, StatblockEntry } from "../aidedd/creature-schema";
import {
  CreatureTranslation,
  TranslatedFields,
  buildCreatureRecord,
} from "../aidedd/build-creature-record";
import { BatchRow, findPinnedStatblock, readBatchRows } from "./creature-batches";
import { readCreatures } from "./schema";

/// Вхід перекладача партії: англійський статблок із пінованого корпусу плюс перелік полів,
/// яких словник не бере. Читати корпус очима замість цього не можна — у проєкті вже був
/// випадок, коли 82 статблоки, написані з памʼяті, дали 32 розбіжності при звірці.
const OVERRIDABLE_FIELDS = [
  "ac",
  "hp",
  "speed",
  "skills",
  "senses",
  "languages",
  "gear",
  "conditionImmunity",
  "damageResistance",
  "damageVulnerability",
  "damageImmunity",
] as const;

type OverridableField = (typeof OVERRIDABLE_FIELDS)[number];

function scanBatch(): void {
  const batch = Number(readFlag("batch") || "1");
  const rows = readBatchRows(batch);
  const corpus = readCreatures().filter((creature) => creature.isFullStatblock);

  for (const row of rows) {
    printCreature(row, findPinnedStatblock(row, corpus));
  }

  console.log(`\n${rows.length} істот у партії ${batch}`);
}

function printCreature(row: BatchRow, parsed: ParsedCreature): void {
  console.log(`\n===== ${row.creatureId} · ${parsed.nameEng} · ${row.pinnedSource} · ${row.slug} =====`);
  console.log(`${parsed.size} ${parsed.type}, ${parsed.alignment || "—"}`);
  console.log(`AC ${parsed.ac} · HP ${parsed.hp} · Speed ${parsed.speed}`);
  console.log(
    `STR ${parsed.abilities.strength.score} DEX ${parsed.abilities.dexterity.score} ` +
      `CON ${parsed.abilities.constitution.score} INT ${parsed.abilities.intelligence.score} ` +
      `WIS ${parsed.abilities.wisdom.score} CHA ${parsed.abilities.charisma.score}`
  );
  printFilled("Saves", parsed.savingThrows);
  printFilled("Skills", parsed.skills);
  printFilled("Vulnerabilities", parsed.damageVulnerability);
  printFilled("Resistances", parsed.damageResistance);
  printFilled("Immunities", parsed.damageImmunity);
  printFilled("Condition Immunities", parsed.conditionImmunity);
  printFilled("Gear", parsed.gear);
  printFilled("Senses", parsed.senses);
  printFilled("Languages", parsed.languages);
  console.log(`CR ${parsed.challenge} (${parsed.xp} XP) · PB ${parsed.proficiencyBonus}`);

  printSection("TRAITS", parsed.traits);
  printSection("ACTIONS", parsed.actions);
  printSection("BONUS ACTIONS", parsed.bonusActions);
  printSection("REACTIONS", parsed.reactions);
  printSection("LEGENDARY ACTIONS", parsed.legendaryActions);
  printFilled("LAIR INFO", parsed.lairInfo);
  printSection("LAIR ACTIONS", parsed.lairActions);
  printSection("REGIONAL EFFECTS", parsed.regionEffects);
  printFilled("MYTHIC INFO", parsed.mythicInfo);
  printSection("MYTHIC ACTIONS", parsed.mythicActions);

  printGaps(parsed);
}

function printFilled(label: string, value: string): void {
  if (value !== "") console.log(`${label}: ${value}`);
}

function printSection(label: string, entries: StatblockEntry[]): void {
  if (entries.length === 0) return;
  console.log(`\n[${label}]`);
  for (const entry of entries) console.log(entry.name === "" ? `• ${entry.text}` : `• ${entry.name}. ${entry.text}`);
}

/// Проганяє справжній конвертер із заглушкою перекладу, підставляючи «потрібен переклад» у те
/// поле, яке він відкинув, і повторюючи. Так один прохід називає всі прогалини, а не першу.
function printGaps(parsed: ParsedCreature): void {
  const fields: TranslatedFields = {};

  for (let attempt = 0; attempt <= OVERRIDABLE_FIELDS.length; attempt += 1) {
    try {
      buildCreatureRecord(parsed, buildStubTranslation(parsed, fields), 1);
      const needed = Object.keys(fields);
      console.log(`\nПОЛЯ-ЗАМІНИ: ${needed.length === 0 ? "не потрібні" : needed.join(", ")}`);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const field = findRejectedField(parsed, message);
      if (!field) {
        console.log(`\n⛔ БЛОКЕР: ${message}`);
        return;
      }
      fields[field] = "«ПОТРІБЕН ПЕРЕКЛАД»";
    }
  }
}

function buildStubTranslation(parsed: ParsedCreature, fields: TranslatedFields): CreatureTranslation {
  const copy = (entries: StatblockEntry[]): StatblockEntry[] =>
    entries.map((entry) => ({ name: entry.name, text: entry.text }));

  return {
    slug: parsed.slug,
    name: "СТАБ",
    description: "",
    traits: copy(parsed.traits),
    actions: copy(parsed.actions),
    bonusActions: copy(parsed.bonusActions),
    reactions: copy(parsed.reactions),
    legendaryActions: copy(parsed.legendaryActions),
    lairInfo: parsed.lairInfo,
    lairActions: copy(parsed.lairActions),
    regionEffects: copy(parsed.regionEffects),
    mythicInfo: parsed.mythicInfo,
    mythicActions: copy(parsed.mythicActions),
    fields,
  };
}

/// Помилка конвертера називає англійський рядок, а не поле. Поле знаходимо тим, у якому з
/// них цей рядок і лежить, — інакше заглушка підставлялася б навмання.
function findRejectedField(parsed: ParsedCreature, message: string): OverridableField | null {
  const quoted = /«([^»]+)»/.exec(message);
  if (!quoted) return null;

  const sources: Record<OverridableField, string> = {
    ac: parsed.ac,
    hp: parsed.hp,
    speed: parsed.speed,
    skills: parsed.skills,
    senses: parsed.senses,
    languages: parsed.languages,
    gear: parsed.gear,
    conditionImmunity: parsed.conditionImmunity,
    damageResistance: parsed.damageResistance,
    damageVulnerability: parsed.damageVulnerability,
    damageImmunity: parsed.damageImmunity,
  };

  return (
    OVERRIDABLE_FIELDS.find((field) => sources[field].toLowerCase().includes(quoted[1].toLowerCase())) ?? null
  );
}

function readFlag(name: string): string {
  const found = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
}

try {
  scanBatch();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
