import { readFileSync } from "fs";
import { join } from "path";

import {
  buildSummary,
  claimSlug,
  kebabCase,
  MarkdownBlock,
  numberArticlesWithinCategory,
  ParsedRuleCategoryKey,
  ParsedRuleSubSection,
  splitByHeadings,
} from "./rules-markdown";
import { linkCatalogTables, RULES_2024_CATALOG_PREFIX } from "./catalog-table-links";
import { SRD_DIR } from "./srd-source";

export type { ParsedRuleCategoryKey, ParsedRuleSubSection };

export type ParsedRuleSource =
  | "playing-the-game"
  | "rules-glossary"
  | "gameplay-toolbox"
  | "character-creation"
  | "character-origins"
  | "equipment";

export type ParsedRuleChapterSource = Exclude<ParsedRuleSource, "rules-glossary">;

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

const GROUP_CATEGORIES: Record<ParsedRuleChapterSource, Record<string, ParsedRuleCategoryKey>> = {
  "playing-the-game": {
    "Rhythm of Play": "abilities",
    "The Six Abilities": "abilities",
    "D20 Tests": "abilities",
    Proficiency: "abilities",
    Actions: "combat",
    "Social Interaction": "adventuring",
    Exploration: "adventuring",
    Combat: "combat",
    "Damage and Healing": "combat",
  },
  "gameplay-toolbox": {
    "Travel Pace": "adventuring",
    "Creating a Background": "gamemaster",
    "Curses and Magical Contagions": "gamemaster",
    "Environmental Effects": "adventuring",
    "Fear and Mental Stress": "gamemaster",
    Poison: "gamemaster",
    Traps: "gamemaster",
    "Combat Encounters": "gamemaster",
    Troubleshooting: "gamemaster",
  },
  "character-creation": {
    "Choose a Character Sheet": "abilities",
    "Create Your Character": "abilities",
    "Level Advancement": "abilities",
    "Starting at Higher Levels": "abilities",
    Multiclassing: "abilities",
    Trinkets: "adventuring",
  },
  "character-origins": {
    "Character Backgrounds": "abilities",
    "Character Species": "abilities",
  },
  equipment: {
    Coins: "equipment",
    Weapons: "equipment",
    Armor: "equipment",
    Tools: "equipment",
    "Adventuring Gear": "equipment",
    "Mounts and Vehicles": "equipment",
    "Lifestyle Expenses": "equipment",
    "Food, Drink, and Lodging": "equipment",
    Hirelings: "equipment",
    Spellcasting: "equipment",
    "Crafting Nonmagical Items": "equipment",
    "Brewing Potions of Healing": "equipment",
    "Scribing Spell Scrolls": "equipment",
    "Magic Items": "gamemaster",
  },
};

/// У главі спорядження заголовок третього рівня — частина правила, а не окреме правило:
/// «Властивості» без «Зброї» над ними нічого не значать, а сім способів життя дали б сім
/// статей на двадцять слів. Тому тут стаття — це секція другого рівня, як у SRD 5.1.
const GROUP_ARTICLE_SOURCES: ParsedRuleChapterSource[] = ["equipment"];

/// Описи окремих передісторій і видів — це каталог, а не правила: вони вже імпортовані з
/// 5etools у /2024/backgrounds і /2024/races. Друга копія в довіднику розійшлася б з каталогом.
const CATALOG_ARTICLES: Partial<Record<ParsedRuleChapterSource, string[]>> = {
  "character-origins": ["Background Descriptions", "Species Descriptions"],
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

/// Порядок джерел закріплений: слаг статті — це якір, а claimSlug роздає їх у порядку розбору.
/// Нове джерело дописується в кінець, інакше зрушаться слаги вже опублікованих статей.
const CHAPTER_SOURCES: ParsedRuleChapterSource[] = [
  "playing-the-game",
  "gameplay-toolbox",
  "character-creation",
  "character-origins",
  "equipment",
];

export function parseRules2024(options: { srdDir?: string; reservedSlugs?: string[] } = {}): ParsedRuleArticle[] {
  const srdDir = options.srdDir ?? SRD_DIR;
  const takenSlugs = new Set(options.reservedSlugs ?? []);

  const fromPlaying = parseChapterFile(readSrdFile(srdDir, "playing-the-game.md"), "playing-the-game", takenSlugs);
  const fromGlossary = parseRulesGlossary(readSrdFile(srdDir, "rules-glossary.md"), takenSlugs);
  const fromChapters = CHAPTER_SOURCES.filter((source) => source !== "playing-the-game").flatMap((source) =>
    parseChapterFile(readSrdFile(srdDir, `${source}.md`), source, takenSlugs)
  );

  return numberArticlesWithinCategory([...fromPlaying, ...fromGlossary, ...fromChapters]);
}

function readSrdFile(srdDir: string, fileName: string): string {
  return readFileSync(join(srdDir, fileName), "utf-8");
}

function parseChapterFile(
  markdown: string,
  source: ParsedRuleChapterSource,
  takenSlugs: Set<string>
): ParsedRuleArticle[] {
  const blocks = splitByHeadings(markdown);
  const catalogArticles = new Set(CATALOG_ARTICLES[source] ?? []);
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
            category: categoryOfGroup(source, block.title),
            source,
            body: block.body,
            takenSlugs,
          })
        : null;
      if (article) articles.push(article);
      continue;
    }

    if (!group) continue;

    if (block.level === 3 && !GROUP_ARTICLE_SOURCES.includes(source)) {
      article = catalogArticles.has(block.title)
        ? null
        : startArticle({
            engTitle: block.title,
            category: categoryOfGroup(source, group.title),
            source,
            body: block.body,
            groupTitle: group.title,
            takenSlugs,
          });
      if (article) articles.push(article);
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
  const slug = claimSlug(kebabCase(engTitle), input.source === "rules-glossary" ? "term" : "rule", input.takenSlugs);

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
    engContent: linkCatalogTables(body, RULES_2024_CATALOG_PREFIX),
  };
}

function categoryOfGroup(source: ParsedRuleChapterSource, groupTitle: string): ParsedRuleCategoryKey {
  const category = GROUP_CATEGORIES[source][groupTitle];
  if (!category) throw new Error(`Секція "${groupTitle}" з ${source}.md не має категорії довідника`);
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
