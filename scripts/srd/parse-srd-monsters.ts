import { readFileSync } from "fs";
import {
  AbilityScores,
  ParsedCreature,
  StatblockEntry,
  buildEmptyAbilityScores,
} from "../aidedd/creature-schema";
import {
  collapseSpaces,
  parseChallengeRating,
  splitImmunityLine,
  splitTypeLine,
} from "../aidedd/statblock-fields";
import { SRD_STATBLOCK_FILES, findSrdFilePath } from "./srd-source";

const SECTION_TITLES = {
  traits: "traits",
  actions: "actions",
  bonusActions: "bonus actions",
  reactions: "reactions",
  legendaryActions: "legendary actions",
} as const;

const ABILITY_LABELS: Record<string, keyof AbilityScores> = {
  STR: "strength",
  DEX: "dexterity",
  CON: "constitution",
  INT: "intelligence",
  WIS: "wisdom",
  CHA: "charisma",
};

type Heading = { level: number; title: string; bodyStart: number; start: number };

export function readAllSrdCreatures(): ParsedCreature[] {
  return SRD_STATBLOCK_FILES.flatMap((file) =>
    parseSrdStatblocks(readFileSync(findSrdFilePath(file), "utf-8"))
  );
}

export function parseSrdStatblocks(markdown: string): ParsedCreature[] {
  const headings = findHeadings(markdown);

  return headings
    .map((heading, index) => ({ heading, block: cutBlock(markdown, headings, index) }))
    .filter(({ heading, block }) => hasStatblockBody(markdown, headings, heading, block))
    .map(({ heading, block }) => buildCreature(heading.title, block));
}

function findHeadings(markdown: string): Heading[] {
  return [...markdown.matchAll(/^(#{2,4}) +(.+?)\s*$/gm)].map((match) => ({
    level: match[1].length,
    title: match[2].trim(),
    start: match.index,
    bodyStart: match.index + match[0].length,
  }));
}

function cutBlock(markdown: string, headings: Heading[], index: number): string {
  const current = headings[index];
  const next = headings.slice(index + 1).find((heading) => heading.level <= current.level);
  return markdown.slice(current.bodyStart, next ? next.start : markdown.length);
}

function hasStatblockBody(
  markdown: string,
  headings: Heading[],
  heading: Heading,
  block: string
): boolean {
  if (!block.includes("**AC**")) return false;
  const nextHeading = headings.find((candidate) => candidate.start > heading.start);
  const ownBody = markdown.slice(
    heading.bodyStart,
    nextHeading ? nextHeading.start : markdown.length
  );
  return ownBody.includes("**AC**");
}

function buildCreature(name: string, block: string): ParsedCreature {
  const sectionHeadings = findHeadings(block);
  const headerEnd = sectionHeadings.length > 0 ? sectionHeadings[0].start : block.length;
  const header = block.slice(0, headerEnd);

  const fields = readMarkdownFields(header);
  const typeLine = splitTypeLine(findTypeLine(header));
  const challenge = parseChallengeRating(fields.CR ?? "", "RULES_2024");
  const immunities = splitImmunityLine(fields.Immunities ?? "");
  const abilities = readAbilityTable(header);
  const sections = collectSections(block, sectionHeadings);

  return {
    slug: buildSlug(name),
    nameEng: name,
    ruleset: "RULES_2024",
    size: typeLine.size,
    type: typeLine.type,
    alignment: typeLine.alignment,
    ac: fields.AC ?? "",
    initiative: fields.Initiative ?? "",
    hp: fields.HP ?? "",
    speed: fields.Speed ?? "",
    abilities,
    savingThrows: buildSavingThrows(abilities),
    skills: fields.Skills ?? "",
    damageVulnerability: fields.Vulnerabilities ?? "",
    damageResistance: fields.Resistances ?? "",
    damageImmunity: immunities.damage,
    conditionImmunity: immunities.conditions,
    gear: fields.Gear ?? "",
    senses: fields.Senses ?? "",
    languages: fields.Languages ?? "",
    challenge: challenge.challenge,
    xp: challenge.xp,
    xpInLair: challenge.xpInLair,
    proficiencyBonus: challenge.proficiencyBonus,
    traits: sections.traits,
    actions: sections.actions,
    bonusActions: sections.bonusActions,
    reactions: sections.reactions,
    legendaryActions: sections.legendaryActions,
    legendaryActionUses: sections.legendaryPreamble,
    habitat: "",
    treasure: "",
    description: "",
    source: "SRD 5.2.1",
    imageUrl: "",
  };
}

function findTypeLine(header: string): string {
  const match = /^_([^_\n]+)_\s*$/m.exec(header);
  return match ? match[1] : "";
}

function readMarkdownFields(header: string): Record<string, string> {
  const withoutTable = header.replace(/<table>[\s\S]*?<\/table>/gi, "");
  const fields: Record<string, string> = {};

  for (const match of withoutTable.matchAll(/\*\*([A-Za-z][A-Za-z ]*)\*\*([^*\n]*)/g)) {
    const label = match[1].trim();
    if (label in fields) continue;
    fields[label] = stripMarkdownToText(match[2]);
  }

  return fields;
}

function readAbilityTable(header: string): AbilityScores {
  const table = /<table>[\s\S]*?<\/table>/i.exec(header);
  const abilities = buildEmptyAbilityScores();
  if (!table) return abilities;

  const rawCells = [...table[0].matchAll(/<td>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
  const cells = rawCells.map((cell) => collapseSpaces(cell.replace(/<[^>]*>/g, "")));

  for (let index = 0; index < rawCells.length; index += 1) {
    const label = /<strong>\s*([A-Z]{3})\s*<\/strong>/i.exec(rawCells[index]);
    const key = label ? ABILITY_LABELS[label[1].toUpperCase()] : undefined;
    if (!key) continue;

    const [score, modifier, save] = readAbilityTriplet(cells, index + 1);
    abilities[key] = { score, modifier, save };
  }

  return abilities;
}

/// Three SRD tables are malformed: Ancient Red Dragon and Remorhaz merge score and modifier
/// into one cell, Will-o'-Wisp drops a cell entirely. So the triplet is read from a number
/// stream, stopping at the next ability label so one row cannot swallow the next one's numbers.
/// A missing SAVE means no proficiency, which is exactly the modifier.
function readAbilityTriplet(cells: string[], start: number): [number, number, number] {
  const numbers: number[] = [];

  for (let index = start; index < cells.length && numbers.length < 3; index += 1) {
    if (/^(?:STR|DEX|CON|INT|WIS|CHA)\b/i.test(cells[index])) break;
    for (const token of cells[index].matchAll(/[+−-]?\d+/g)) {
      if (numbers.length < 3) numbers.push(Number(token[0].replace(/−/g, "-")));
    }
  }

  const [score, modifier, save] = numbers;
  return [score ?? NaN, modifier ?? NaN, save ?? modifier ?? NaN];
}

function buildSavingThrows(abilities: AbilityScores): string {
  const labels: Array<[keyof AbilityScores, string]> = [
    ["strength", "Str"],
    ["dexterity", "Dex"],
    ["constitution", "Con"],
    ["intelligence", "Int"],
    ["wisdom", "Wis"],
    ["charisma", "Cha"],
  ];

  return labels
    .filter(([key]) => {
      const ability = abilities[key];
      return (
        Number.isFinite(ability.save) &&
        Number.isFinite(ability.modifier) &&
        ability.save !== ability.modifier
      );
    })
    .map(([key, label]) => `${label} ${formatSigned(abilities[key].save)}`)
    .join(", ");
}

function collectSections(block: string, headings: Heading[]) {
  const sections = {
    traits: [] as StatblockEntry[],
    actions: [] as StatblockEntry[],
    bonusActions: [] as StatblockEntry[],
    reactions: [] as StatblockEntry[],
    legendaryActions: [] as StatblockEntry[],
    legendaryPreamble: "",
  };

  for (let index = 0; index < headings.length; index += 1) {
    const key = findSectionKey(headings[index].title.toLowerCase());
    if (!key) continue;

    const end = index + 1 < headings.length ? headings[index + 1].start : block.length;
    const entries = findMarkdownEntries(block.slice(headings[index].bodyStart, end));

    sections[key] = entries.filter((entry) => entry.name !== "");
    if (key === "legendaryActions") {
      sections.legendaryPreamble = entries.find((entry) => entry.name === "")?.text ?? "";
    }
  }

  return sections;
}

function findSectionKey(title: string): keyof typeof SECTION_TITLES | null {
  const entry = Object.entries(SECTION_TITLES).find(([, label]) => label === title);
  return entry ? (entry[0] as keyof typeof SECTION_TITLES) : null;
}

function findMarkdownEntries(body: string): StatblockEntry[] {
  return body
    .replace(/<hr\s*\/?>/gi, "")
    .split(/\n\s*\n/)
    .map((paragraph) => buildEntry(paragraph))
    .filter((entry): entry is StatblockEntry => entry !== null);
}

function buildEntry(paragraph: string): StatblockEntry | null {
  const named = /^\s*\*\*_([\s\S]+?)_\*\*\.?\s*([\s\S]*)$/.exec(paragraph);
  if (named) {
    return {
      name: stripMarkdownToText(named[1]).replace(/\.$/, ""),
      text: stripMarkdownToText(named[2]).replace(/^\.\s*/, ""),
    };
  }

  const text = stripMarkdownToText(paragraph);
  return text === "" ? null : { name: "", text };
}

export function stripMarkdownToText(value: string): string {
  const withoutMarkup = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<hr\s*\/?>/gi, " ")
    .replace(/&emsp;|&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/_/g, "")
    .replace(/−/g, "-");
  return collapseSpaces(withoutMarkup);
}

function buildSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
