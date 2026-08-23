/**
 * KR13.2 — нормалізація класових фіч 2024 з локальних сторінок вікі.
 *
 * Вхід — тільки data/2024/source/raw/class/*.html, жодного мережевого запиту.
 * Вихід — поле featuresEng[] у data/2024/normalized/classes.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RAW_CLASS_DIR = "data/2024/source/raw/class";
const CLASSES_JSON = "data/2024/normalized/classes.json";

type ClassFeatureEng2024 = {
  level: number;
  name: string;
  descriptionEng: string;
  displayOrder: number;
};

type ClassJson2024 = {
  engName: string;
  featuresEng?: ClassFeatureEng2024[];
  [key: string]: unknown;
};

function parseClassFeatures(pageHtml: string, engName: string): ClassFeatureEng2024[] {
  const section = findClassFeaturesSection(pageHtml, engName);
  return splitIntoFeatures(section, engName).map((feature, index) => ({
    level: feature.level,
    name: feature.name,
    descriptionEng: renderBodyAsMarkdown(feature.bodyHtml),
    displayOrder: index + 1,
  }));
}

function findClassFeaturesSection(pageHtml: string, engName: string): string {
  const contentStart = pageHtml.indexOf('id="page-content"');
  if (contentStart === -1) throw new Error(`${engName}: не знайдено page-content`);

  const content = pageHtml.slice(contentStart);
  const headingPattern = new RegExp(`<h1[^>]*>\\s*<span>${engName} Class Features</span>\\s*</h1>`);
  const heading = headingPattern.exec(content);
  if (!heading) throw new Error(`${engName}: не знайдено заголовок "${engName} Class Features"`);

  const section = content.slice(heading.index + heading[0].length);
  const furnitureStart = section.search(/<script|<!-- mobile bottom|<div class="page-tags"/);
  return furnitureStart === -1 ? section : section.slice(0, furnitureStart);
}

/**
 * Заголовок вікі лишився з 2014. Таблиця класу на тій самій сторінці й SRD 2024
 * звуть цю фічу "Wizard Subclass" — два джерела проти одного.
 */
const HEADING_NAME_FIXES: Record<string, string> = {
  "Wizard/3/Arcane Tradition": "Wizard Subclass",
};

function splitIntoFeatures(sectionHtml: string, engName: string) {
  const headingPattern = /<h3[^>]*>\s*<span>\s*Level\s+(\d+):\s*(.*?)\s*<\/span>\s*<\/h3>/g;
  const headings = [...sectionHtml.matchAll(headingPattern)];

  return headings.map((heading, index) => {
    const bodyStart = heading.index + heading[0].length;
    const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : sectionHtml.length;
    const level = Number(heading[1]);
    const headingName = normalizeText(stripTags(heading[2]));
    return {
      level,
      name: HEADING_NAME_FIXES[`${engName}/${level}/${headingName}`] ?? headingName,
      bodyHtml: sectionHtml.slice(bodyStart, bodyEnd),
    };
  });
}

function renderBodyAsMarkdown(bodyHtml: string): string {
  const withoutSubclassList = dropSubclassList(bodyHtml);
  const blocks = renderBlocks(withoutSubclassList);
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function dropSubclassList(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>\s*<span>[^<]*Subclasses<\/span>\s*<\/h[1-6]>/g, "")
    .replace(/<div class="list-pages-box">[\s\S]*?<\/div>/g, "");
}

function renderBlocks(html: string): string[] {
  const blockPattern = /<p>([\s\S]*?)<\/p>|<ul>([\s\S]*?)<\/ul>|<table[^>]*>([\s\S]*?)<\/table>|<h([1-6])[^>]*>\s*<span>([\s\S]*?)<\/span>\s*<\/h\4>/g;
  const blocks: string[] = [];

  for (const match of html.matchAll(blockPattern)) {
    const [, paragraph, list, table, , heading] = match;
    if (paragraph !== undefined) blocks.push(renderInline(paragraph));
    else if (list !== undefined) blocks.push(renderList(list));
    else if (table !== undefined) blocks.push(renderTable(table));
    else if (heading !== undefined) blocks.push(`**${renderInline(heading)}**`);
  }

  return blocks.filter((block) => block.length > 0);
}

function renderList(listHtml: string): string {
  return [...listHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((item) => `- ${renderInline(item[1])}`)
    .join("\n");
}

function renderTable(tableHtml: string): string {
  const rows = [...tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) => ({
    isHeader: /<th[^>]*>/.test(row[1]),
    cells: [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((cell) =>
      renderInline(cell[1]).replace(/\n+/g, " ").replace(/\|/g, "\\|"),
    ),
  }));

  if (rows.length === 0) return "";

  const width = Math.max(...rows.map((row) => row.cells.length));
  const padded = rows.map((row) => [...row.cells, ...Array(width - row.cells.length).fill("")]);
  const hasHeader = rows[0].isHeader;
  const header = hasHeader ? padded[0] : Array(width).fill("");
  const body = hasHeader ? padded.slice(1) : padded;

  return [
    `| ${header.join(" | ")} |`,
    `| ${Array(width).fill("---").join(" | ")} |`,
    ...body.map((cells) => `| ${cells.join(" | ")} |`),
  ].join("\n");
}

function renderInline(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/g, "\u0000")
    .replace(/<\/?strong>/g, "**")
    .replace(/<\/?em>/g, "*")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, "$1");

  return normalizeText(resolveLineBreaks(stripTags(text)));
}

/** На вікі <br /> — це перенос рядка джерела: усередині речення він означає пробіл, між реченнями — новий абзац. */
function resolveLineBreaks(text: string): string {
  return text.replace(/\u0000\s*(\p{L})?/gu, (_whole, nextLetter: string | undefined) => {
    const continuesSentence = nextLetter !== undefined && /\p{Ll}/u.test(nextLetter);
    return continuesSentence ? ` ${nextLetter}` : `\n\n${nextLetter ?? ""}`;
  });
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function normalizeText(text: string): string {
  return decodeEntities(text)
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      return String.fromCodePoint(parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10));
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
}

function readRawClassPage(engName: string): string {
  const fileName = `${engName.toLowerCase()}-main.html`;
  return readFileSync(join(process.cwd(), RAW_CLASS_DIR, fileName), "utf-8");
}

function main() {
  const classesPath = join(process.cwd(), CLASSES_JSON);
  const classes: ClassJson2024[] = JSON.parse(readFileSync(classesPath, "utf-8"));

  const withFeatures = classes.map((cls) => ({
    ...cls,
    featuresEng: parseClassFeatures(readRawClassPage(cls.engName), cls.engName),
  }));

  withFeatures.forEach((cls) =>
    console.log(`  ${cls.engName.padEnd(10)} ${String(cls.featuresEng.length).padStart(2)} фіч`),
  );

  writeFileSync(classesPath, `${JSON.stringify(withFeatures, null, 2)}\n`, "utf-8");
  const total = withFeatures.reduce((sum, cls) => sum + cls.featuresEng.length, 0);
  console.log(`\n✅ ${withFeatures.length} класів, ${total} фіч → ${CLASSES_JSON}`);
}

main();
