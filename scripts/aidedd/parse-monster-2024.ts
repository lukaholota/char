import {
  AbilityScores,
  ParsedCreature,
  StatblockEntry,
  buildEmptyAbilityScores,
} from "./creature-schema";
import {
  decodeHtmlEntities,
  findFieldValue,
  findParagraphEntries,
  stripHtmlToText,
} from "./html-statblock";
import {
  collapseSpaces,
  normalizeSign,
  parseChallengeRating,
  splitImmunityLine,
  splitTypeLine,
} from "./statblock-fields";

const SECTION_TITLES = {
  traits: "Traits",
  actions: "Actions",
  bonusActions: "Bonus actions",
  reactions: "Reactions",
  legendaryActions: "Legendary actions",
} as const;

export function parseMonster2024(html: string, slug: string): ParsedCreature {
  const statblock = cutStatblock(html);
  const challenge = parseChallengeRating(findFieldValue(statblock, "CR"), "RULES_2024");
  const immunities = splitImmunityLine(findFieldValue(statblock, "Immunities"));
  const typeLine = splitTypeLine(findDivText(statblock, "type"));
  const abilities = readAbilityTable(statblock);
  const sections = collectSections(statblock);

  return {
    slug,
    nameEng: findHeading(html),
    ruleset: "RULES_2024",
    size: typeLine.size,
    type: typeLine.type,
    alignment: typeLine.alignment,
    ac: findFieldValue(statblock, "AC"),
    initiative: normalizeSign(findFieldValue(statblock, "Initiative")),
    hp: findFieldValue(statblock, "HP"),
    speed: findFieldValue(statblock, "Speed"),
    abilities,
    savingThrows: buildSavingThrows(abilities),
    skills: findFieldValue(statblock, "Skills"),
    damageVulnerability: findFieldValue(statblock, "Vulnerabilities"),
    damageResistance: findFieldValue(statblock, "Resistances"),
    damageImmunity: immunities.damage,
    conditionImmunity: immunities.conditions,
    gear: findFieldValue(statblock, "Gear"),
    senses: findFieldValue(statblock, "Senses"),
    languages: findFieldValue(statblock, "Languages"),
    challenge: challenge.challenge,
    xp: challenge.xp,
    xpInLair: challenge.xpInLair,
    proficiencyBonus: challenge.proficiencyBonus,
    traits: sections.traits,
    actions: sections.actions,
    bonusActions: sections.bonusActions,
    reactions: sections.reactions,
    legendaryActions: sections.legendaryActions,
    legendaryActionUses: findLegendaryActionUses(statblock),
    habitat: findDivText(html, "habitat").replace(/^Habitat\s*:\s*/i, ""),
    treasure: findTreasure(html),
    description: findDivText(html, "description"),
    source: findDivText(html, "source"),
    imageUrl: findImageUrl(html, slug),
  };
}

function cutStatblock(html: string): string {
  const start = html.indexOf("<div class='jaune'>");
  const end = html.indexOf("<div class='description'>");
  if (start < 0) return html;
  return end > start ? html.slice(start, end) : html.slice(start);
}

function findHeading(html: string): string {
  const match = /<h1>([\s\S]*?)<\/h1>/i.exec(html);
  return match ? stripHtmlToText(match[1]) : "";
}

function findDivText(html: string, className: string): string {
  const pattern = new RegExp(`<div class='${className}'>([\\s\\S]*?)</div>`, "i");
  const match = pattern.exec(html);
  return match ? stripHtmlToText(match[1]) : "";
}

function findTreasure(html: string): string {
  for (const match of html.matchAll(/<div class='habitat'>([\s\S]*?)<\/div>/gi)) {
    const text = stripHtmlToText(match[1]);
    if (/^Treasure\s*:/i.test(text)) return text.replace(/^Treasure\s*:\s*/i, "");
  }
  return "";
}

function findImageUrl(html: string, slug: string): string {
  const match = /<div class='picture'>[\s\S]*?<img[^>]*src='([^']+)'/i.exec(html);
  if (!match) return "";
  const src = decodeHtmlEntities(match[1]);
  if (src.startsWith("http")) return src;
  return `https://www.aidedd.org/monster/${src.replace(/^\.?\//, "")}`;
}

/// The 2024 table is a flat run of divs: car1/car2/car3 for the first row, car4/car5/car6
/// for the second. Reading it positionally is the only stable way in.
function readAbilityTable(html: string): AbilityScores {
  const cells = [...html.matchAll(/<div class='car[1-6]'>([\s\S]*?)<\/div>/gi)].map((match) =>
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
    const group = cells.slice(index * 4, index * 4 + 4);
    if (group.length < 4) continue;
    abilities[order[index]] = {
      score: readNumber(group[1]),
      modifier: readNumber(group[2]),
      save: readNumber(group[3]),
    };
  }

  return abilities;
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

function collectSections(html: string): Record<keyof typeof SECTION_TITLES, StatblockEntry[]> {
  const markers = [...html.matchAll(/<h2 class='rub'>([\s\S]*?)<\/h2>/gi)].map((match) => ({
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
  };

  for (let index = 0; index < markers.length; index += 1) {
    const end = index + 1 < markers.length ? markers[index + 1].headStart : html.length;
    const body = html.slice(markers[index].start, end);
    const key = findSectionKey(markers[index].title);
    if (key) sections[key] = findParagraphEntries(body).filter((entry) => entry.name !== "");
  }

  return sections;
}

function findSectionKey(title: string): keyof typeof SECTION_TITLES | null {
  const entry = Object.entries(SECTION_TITLES).find(
    ([, label]) => label.toLowerCase() === title
  );
  return entry ? (entry[0] as keyof typeof SECTION_TITLES) : null;
}

function findLegendaryActionUses(html: string): string {
  const match = /<div class='legend'>([\s\S]*?)<\/div>/i.exec(html);
  return match ? stripHtmlToText(match[1]) : "";
}

function readNumber(value: string): number {
  const normalized = normalizeSign(collapseSpaces(value)).replace(/\+/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && normalized !== "" ? parsed : NaN;
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
