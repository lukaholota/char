import { readFileSync } from "fs";
import { join } from "path";

import { SRD_DIR } from "./srd-source";

export type ParsedRuleCategoryKey =
  | "combat"
  | "spellcasting"
  | "abilities"
  | "conditions"
  | "adventuring"
  | "gamemaster";

export type ParsedRuleSource = "playing-the-game" | "rules-glossary";

export type ParsedRuleSubSection = {
  id: string;
  engTitle: string;
  engContent: string;
};

export type ParsedRuleArticle = {
  id: string;
  slug: string;
  category: ParsedRuleCategoryKey;
  engTitle: string;
  engSummary: string;
  engTags: string[];
  source: ParsedRuleSource;
  order: number;
  subsections: ParsedRuleSubSection[];
};

const GLOSSARY_TAG_CATEGORIES: Record<string, ParsedRuleCategoryKey> = {
  Action: "combat",
  "Area of Effect": "spellcasting",
  Attitude: "adventuring",
  Condition: "conditions",
  Hazard: "adventuring",
};

const PLAYING_GROUP_CATEGORIES: Record<string, ParsedRuleCategoryKey> = {
  "Rhythm of Play": "abilities",
  "The Six Abilities": "abilities",
  "D20 Tests": "abilities",
  Proficiency: "abilities",
  Actions: "combat",
  "Social Interaction": "adventuring",
  Exploration: "adventuring",
  Combat: "combat",
  "Damage and Healing": "combat",
};

const GLOSSARY_ENTRY_CATEGORIES: Record<string, ParsedRuleCategoryKey> = {
  "Ability Check": "abilities",
  "Ability Score and Modifier": "abilities",
  Action: "combat",
  Advantage: "abilities",
  Adventure: "gamemaster",
  Alignment: "gamemaster",
  Ally: "combat",
  "Area of Effect": "spellcasting",
  "Armor Class": "combat",
  "Armor Training": "combat",
  "Attack Roll": "combat",
  Attitude: "adventuring",
  Attunement: "gamemaster",
  Blindsight: "adventuring",
  Bloodied: "combat",
  "Bonus Action": "combat",
  "Breaking Objects": "gamemaster",
  "Bright Light": "adventuring",
  "Burrow Speed": "adventuring",
  Campaign: "gamemaster",
  Cantrip: "spellcasting",
  "Carrying Capacity": "adventuring",
  "Challenge Rating": "gamemaster",
  "Character Sheet": "abilities",
  Climbing: "adventuring",
  "Climb Speed": "adventuring",
  Concentration: "spellcasting",
  Condition: "conditions",
  Cover: "combat",
  Crawling: "adventuring",
  Creature: "gamemaster",
  "Creature Type": "gamemaster",
  "Critical Hit": "combat",
  Curses: "gamemaster",
  "D20 Test": "abilities",
  Damage: "combat",
  "Damage Roll": "combat",
  "Damage Threshold": "gamemaster",
  "Damage Types": "combat",
  Darkness: "adventuring",
  Darkvision: "adventuring",
  Dead: "combat",
  "Death Saving Throw": "combat",
  "Difficult Terrain": "adventuring",
  "Difficulty Class": "abilities",
  "Dim Light": "adventuring",
  Disadvantage: "abilities",
  Encounter: "gamemaster",
  Enemy: "combat",
  "Experience Points": "gamemaster",
  Expertise: "abilities",
  Flying: "adventuring",
  "Fly Speed": "adventuring",
  Grappling: "combat",
  Hazard: "adventuring",
  Healing: "combat",
  "Heavily Obscured": "adventuring",
  "Heroic Inspiration": "abilities",
  "High Jump": "adventuring",
  "Hit Point Dice": "adventuring",
  "Hit Points": "combat",
  Hover: "adventuring",
  Illusions: "spellcasting",
  Immunity: "combat",
  "Improvised Weapons": "combat",
  Initiative: "combat",
  Jumping: "adventuring",
  "Knocking Out a Creature": "combat",
  "Lightly Obscured": "adventuring",
  "Long Jump": "adventuring",
  "Long Rest": "adventuring",
  "Magical Effect": "spellcasting",
  Monster: "gamemaster",
  "Nonplayer Character": "gamemaster",
  Object: "gamemaster",
  "Occupied Space": "combat",
  "Opportunity Attacks": "combat",
  "Passive Perception": "abilities",
  "Per Day": "abilities",
  "Player Character": "abilities",
  Possession: "spellcasting",
  Proficiency: "abilities",
  Reach: "combat",
  Reaction: "combat",
  Resistance: "combat",
  Ritual: "spellcasting",
  "Round Down": "abilities",
  Save: "abilities",
  "Saving Throw": "abilities",
  "Shape-Shifting": "spellcasting",
  "Short Rest": "adventuring",
  "Simultaneous Effects": "abilities",
  Size: "combat",
  Skill: "abilities",
  Speed: "adventuring",
  Spell: "spellcasting",
  "Spell Attack": "spellcasting",
  "Spellcasting Focus": "spellcasting",
  Stable: "combat",
  "Stat Block": "gamemaster",
  Surprise: "combat",
  "Swim Speed": "adventuring",
  Swimming: "adventuring",
  Target: "combat",
  Telepathy: "spellcasting",
  Teleportation: "spellcasting",
  "Temporary Hit Points": "combat",
  Tremorsense: "adventuring",
  Truesight: "adventuring",
  "Unarmed Strike": "combat",
  "Unoccupied Space": "combat",
  Vulnerability: "combat",
  Weapon: "combat",
  "Weapon Attack": "combat",
};

export function parseRules2024(options: { srdDir?: string; reservedSlugs?: string[] } = {}): ParsedRuleArticle[] {
  const srdDir = options.srdDir ?? SRD_DIR;
  const takenSlugs = new Set(options.reservedSlugs ?? []);

  const fromPlaying = parsePlayingTheGame(readSrdFile(srdDir, "playing-the-game.md"), takenSlugs);
  const fromGlossary = parseRulesGlossary(readSrdFile(srdDir, "rules-glossary.md"), takenSlugs);

  return numberArticlesWithinCategory([...fromPlaying, ...fromGlossary]);
}

function readSrdFile(srdDir: string, fileName: string): string {
  return readFileSync(join(srdDir, fileName), "utf-8");
}

type MarkdownBlock = {
  level: number;
  title: string;
  body: string;
};

function splitByHeadings(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let current: { level: number; title: string; lines: string[] } | null = null;

  for (const line of markdown.split("\n")) {
    const heading = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      if (current) blocks.push(closeBlock(current));
      current = { level: heading[1].length, title: heading[2].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }

  if (current) blocks.push(closeBlock(current));
  return blocks;
}

function closeBlock(block: { level: number; title: string; lines: string[] }): MarkdownBlock {
  return { level: block.level, title: block.title, body: normalizeBody(block.lines.join("\n")) };
}

function normalizeBody(body: string): string {
  return convertHtmlTables(body).replace(/\n{3,}/g, "\n\n").trim();
}

function convertHtmlTables(body: string): string {
  return body.replace(/<table>[\s\S]*?<\/table>/g, (table) => convertOneHtmlTable(table));
}

function convertOneHtmlTable(table: string): string {
  const headerCells = readTableCells(table.match(/<thead>[\s\S]*?<\/thead>/)?.[0] ?? "");
  const bodyRows = readTableRows(table.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0] ?? table);

  if (headerCells.length === 0) {
    return bodyRows.map((row) => `- ${row.filter(Boolean).join(" · ")}`).join("\n");
  }

  const header = `| ${headerCells.join(" | ")} |`;
  const divider = `| ${headerCells.map(() => "---").join(" | ")} |`;
  const rows = bodyRows.map((row) => `| ${padRow(row, headerCells.length).join(" | ")} |`);
  return [header, divider, ...rows].join("\n");
}

function readTableRows(html: string): string[][] {
  return [...html.matchAll(/<tr>[\s\S]*?<\/tr>/g)].map((match) => readTableCells(match[0]));
}

function readTableCells(html: string): string[] {
  return [...html.matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/g)].map((match) => cleanCell(match[1]));
}

function cleanCell(value: string): string {
  return value
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function padRow(row: string[], width: number): string[] {
  const padded = [...row];
  while (padded.length < width) padded.push("");
  return padded.slice(0, width);
}

function parsePlayingTheGame(markdown: string, takenSlugs: Set<string>): ParsedRuleArticle[] {
  const blocks = splitByHeadings(markdown);
  const articles: ParsedRuleArticle[] = [];
  let group: MarkdownBlock | null = null;
  let article: ParsedRuleArticle | null = null;

  for (const block of blocks) {
    if (block.level <= 1) continue;

    if (block.level === 2) {
      group = block;
      article = block.body
        ? startArticle({
            engTitle: block.title,
            category: categoryOfPlayingGroup(block.title),
            source: "playing-the-game",
            body: block.body,
            takenSlugs,
          })
        : null;
      if (article) articles.push(article);
      continue;
    }

    if (!group) continue;

    if (block.level === 3) {
      article = startArticle({
        engTitle: block.title,
        category: categoryOfPlayingGroup(group.title),
        source: "playing-the-game",
        body: block.body,
        groupTitle: group.title,
        takenSlugs,
      });
      articles.push(article);
      continue;
    }

    if (article) article.subsections.push(buildSubSection(article.slug, block.title, block.body));
  }

  return articles;
}

function parseRulesGlossary(markdown: string, takenSlugs: Set<string>): ParsedRuleArticle[] {
  const blocks = splitByHeadings(markdown);
  const articles: ParsedRuleArticle[] = [];

  for (const block of blocks) {
    if (block.level <= 2) continue;

    articles.push(
      startArticle({
        engTitle: block.title,
        category: categoryOfGlossaryEntry(block.title),
        source: "rules-glossary",
        body: block.body,
        takenSlugs,
      })
    );
  }

  return articles;
}

function startArticle(input: {
  engTitle: string;
  category: ParsedRuleCategoryKey;
  source: ParsedRuleSource;
  body: string;
  groupTitle?: string;
  takenSlugs: Set<string>;
}): ParsedRuleArticle {
  const engTitle = stripTag(input.engTitle);
  const slug = claimSlug(kebabCase(engTitle), input.source, input.takenSlugs);

  return {
    id: `srd-${slug}`,
    slug,
    category: input.category,
    engTitle,
    engSummary: buildSummary(input.body),
    engTags: buildTags(input.engTitle, input.groupTitle),
    source: input.source,
    order: 0,
    subsections: input.body ? [buildSubSection(slug, engTitle, input.body)] : [],
  };
}

function buildSubSection(articleSlug: string, engTitle: string, body: string): ParsedRuleSubSection {
  return {
    id: `${articleSlug}--${kebabCase(stripTag(engTitle))}`,
    engTitle: stripTag(engTitle),
    engContent: body,
  };
}

function categoryOfPlayingGroup(groupTitle: string): ParsedRuleCategoryKey {
  const category = PLAYING_GROUP_CATEGORIES[groupTitle];
  if (!category) throw new Error(`Секція "${groupTitle}" з playing-the-game.md не має категорії довідника`);
  return category;
}

function categoryOfGlossaryEntry(entryTitle: string): ParsedRuleCategoryKey {
  const explicit = GLOSSARY_ENTRY_CATEGORIES[stripTag(entryTitle)];
  if (explicit) return explicit;

  const byTag = GLOSSARY_TAG_CATEGORIES[readTag(entryTitle) ?? ""];
  if (byTag) return byTag;

  throw new Error(`Термін "${entryTitle}" з rules-glossary.md не має категорії довідника`);
}

function readTag(title: string): string | null {
  return /\[([^\]]+)\]\s*$/.exec(title)?.[1] ?? null;
}

function stripTag(title: string): string {
  return title.replace(/\s*\[[^\]]+\]\s*$/, "").trim();
}

function buildTags(engTitle: string, groupTitle?: string): string[] {
  const tag = readTag(engTitle);
  return [stripTag(engTitle), ...(tag ? [tag] : []), ...(groupTitle ? [groupTitle] : [])];
}

function buildSummary(body: string): string {
  const firstParagraph = body
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .find((paragraph) => paragraph && !paragraph.startsWith("|") && !paragraph.startsWith("-") && !paragraph.startsWith("**"));

  if (!firstParagraph) return "";

  const plain = stripMarkdown(firstParagraph);
  const firstSentence = /^.*?[.!?](?=\s|$)/.exec(plain)?.[0] ?? plain;
  return firstSentence.length > 220 ? `${firstSentence.slice(0, 217).trimEnd()}…` : firstSentence;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function claimSlug(base: string, source: ParsedRuleSource, takenSlugs: Set<string>): string {
  const qualified = takenSlugs.has(base) ? `${base}-${source === "rules-glossary" ? "term" : "rule"}` : base;
  let slug = qualified;
  let attempt = 2;
  while (takenSlugs.has(slug)) {
    slug = `${qualified}-${attempt}`;
    attempt += 1;
  }
  takenSlugs.add(slug);
  return slug;
}

function kebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function numberArticlesWithinCategory(articles: ParsedRuleArticle[]): ParsedRuleArticle[] {
  const counters = new Map<ParsedRuleCategoryKey, number>();
  return articles.map((article) => {
    const next = (counters.get(article.category) ?? 0) + 1;
    counters.set(article.category, next);
    return { ...article, order: next };
  });
}
