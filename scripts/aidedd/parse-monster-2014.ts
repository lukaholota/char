import {
  AbilityScores,
  ParsedCreature,
  StatblockEntry,
  buildEmptyAbilityScores,
} from "./creature-schema";
import {
  findFieldValue,
  findHeadingText,
  findPictureUrl,
  findParagraphEntries,
  stripHtmlToText,
} from "./html-statblock";
import { collapseSpaces, parseChallengeRating, splitTypeLine } from "./statblock-fields";

const SECTION_TITLES = {
  actions: "Actions",
  bonusActions: "Bonus actions",
  reactions: "Reactions",
  legendaryActions: "Legendary actions",
} as const;

export function parseMonster2014(html: string, slug: string): ParsedCreature {
  const statblock = cutStatblock(html);
  const challenge = parseChallengeRating(findFieldValue(statblock, "Challenge"), "RULES_2014");
  const typeLine = splitTypeLine(findDivText(statblock, "type"));
  const sections = collectSections(statblock);

  return {
    slug,
    nameEng: findHeadingText(html),
    ruleset: "RULES_2014",
    size: typeLine.size,
    type: typeLine.type,
    alignment: typeLine.alignment,
    ac: findFieldValue(statblock, "Armor Class"),
    initiative: "",
    hp: findFieldValue(statblock, "Hit Points"),
    speed: findFieldValue(statblock, "Speed"),
    abilities: readAbilityBlocks(statblock),
    savingThrows: findFieldValue(statblock, "Saving Throws"),
    skills: findFieldValue(statblock, "Skills"),
    damageVulnerability: findFieldValue(statblock, "Damage Vulnerabilities"),
    damageResistance: findFieldValue(statblock, "Damage Resistances"),
    damageImmunity: findFieldValue(statblock, "Damage Immunities"),
    conditionImmunity: findFieldValue(statblock, "Condition Immunities"),
    gear: "",
    senses: findFieldValue(statblock, "Senses"),
    languages: findFieldValue(statblock, "Languages"),
    challenge: challenge.challenge,
    xp: challenge.xp,
    xpInLair: "",
    proficiencyBonus: challenge.proficiencyBonus,
    traits: sections.traits,
    actions: sections.actions,
    bonusActions: sections.bonusActions,
    reactions: sections.reactions,
    legendaryActions: sections.legendaryActions,
    legendaryActionUses: sections.legendaryPreamble,
    lairInfo: "",
    lairActions: [],
    regionEffects: [],
    mythicInfo: "",
    mythicActions: [],
    habitat: "",
    treasure: "",
    description: findDivText(html, "description"),
    source: findDivText(html, "source"),
    imageUrl: findPictureUrl(html, "https://www.aidedd.org/dnd/"),
  };
}

/// The page opens with an unrelated `orange` div above the heading, so the closing marker has to
/// be looked for after the heading — otherwise nothing is cut and sidebars below the statblock
/// (`div.variant`) leak into the sections.
function cutStatblock(html: string): string {
  const start = html.indexOf("<h1>");
  if (start < 0) return html;
  const end = html.indexOf("<div class='orange'>", start);
  return end > start ? html.slice(start, end) : html.slice(start);
}

function findDivText(html: string, className: string): string {
  const pattern = new RegExp(`<div class='${className}'>([\\s\\S]*?)</div>`, "i");
  const match = pattern.exec(html);
  return match ? stripHtmlToText(match[1]) : "";
}

/// 2014 keeps each ability in its own `carac` div as "21 (+5)"; saves live on a separate line.
function readAbilityBlocks(html: string): AbilityScores {
  const cells = [...html.matchAll(/<div class='carac'>([\s\S]*?)<\/div>/gi)].map((match) =>
    stripHtmlToText(match[1])
  );

  const abilities = buildEmptyAbilityScores();
  const order = [
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
  ] as const;

  for (let index = 0; index < order.length; index += 1) {
    const cell = cells[index];
    if (cell === undefined) continue;
    const match = /(-?\d+)\s*\(\s*([+−-]?\d+)\s*\)/.exec(collapseSpaces(cell));
    if (!match) continue;
    const modifier = Number(match[2].replace(/−/g, "-"));
    abilities[order[index]] = { score: Number(match[1]), modifier, save: modifier };
  }

  return abilities;
}

function collectSections(html: string) {
  const markers = [...html.matchAll(/<div class='rub'>([\s\S]*?)<\/div>/gi)].map((match) => ({
    title: stripHtmlToText(match[1]).toLowerCase(),
    start: match.index + match[0].length,
    headStart: match.index,
  }));

  const sections = {
    traits: [] as StatblockEntry[],
    actions: [] as StatblockEntry[],
    bonusActions: [] as StatblockEntry[],
    reactions: [] as StatblockEntry[],
    legendaryActions: [] as StatblockEntry[],
    legendaryPreamble: "",
  };

  const traitsEnd = markers.length > 0 ? markers[0].headStart : html.length;
  sections.traits = findParagraphEntries(html.slice(0, traitsEnd)).filter(
    (entry) => entry.name !== ""
  );

  // Одна сторінка корпусу (yuan-ti-malison) друкує три секції Actions підряд — по одній на тип
  // істоти. Секції дописуються, а не перезаписуються, інакше в записі лишається тільки остання.
  for (let index = 0; index < markers.length; index += 1) {
    const end = index + 1 < markers.length ? markers[index + 1].headStart : html.length;
    const entries = findParagraphEntries(html.slice(markers[index].start, end));
    const key = findSectionKey(markers[index].title);
    if (!key) continue;

    sections[key] = [...sections[key], ...entries.filter((entry) => entry.name !== "")];
    if (key === "legendaryActions") {
      sections.legendaryPreamble = entries.find((entry) => entry.name === "")?.text ?? "";
      sections.legendaryActions = sections.legendaryActions.filter(isRealLegendaryAction);
    }
  }

  return sections;
}

// Джерело подекуди виділяє жирним хвіст преамбули, і парсер читає його як зайву легендарну дію.
function isRealLegendaryAction(entry: StatblockEntry): boolean {
  return !/regains spent legendary actions/i.test(entry.text);
}

function findSectionKey(title: string): keyof typeof SECTION_TITLES | null {
  const entry = Object.entries(SECTION_TITLES).find(([, label]) => label.toLowerCase() === title);
  return entry ? (entry[0] as keyof typeof SECTION_TITLES) : null;
}
