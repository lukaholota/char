import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceTranslations } from "@/lib/refs/translation";
import { dropSourceMarkerBrackets, findRpgbotSourceCodes, findUntranslatedSourceTitle } from "./rpgbot-source-codes";
import type { InlineNode, OptimizationRuleset } from "./types";

const ABBREVIATIONS = "https://rpgbot.net/dnd5/abbreviations/";
const ARTICLES_DIR = "data/rpgbot/uk";

const DELIBERATELY_PLAIN = new Set([
  "Книзі Гравця (2014)",
  "Казана Таші з усім",
  "Довідника Занатара про все",
  ": +3 чаротворчий фокус, кілька чудових захисних переваг, і її не потрібно тримати в руці.",
  "{{Сфера Скореуса|Orb of Skoraeus}}",
  "Чарівний камінь [Magic Stone",
  "Первісна дикість [Primal Savagery",
]);

type SourceLink = { text: string; href: string; ruleset: OptimizationRuleset };

function collectSourceLinks(value: unknown, ruleset: OptimizationRuleset, links: SourceLink[]): SourceLink[] {
  if (Array.isArray(value)) value.forEach((entry) => collectSourceLinks(entry, ruleset, links));
  else if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    if (node.type === "link" && typeof node.href === "string" && node.href.includes("/abbreviations")) links.push({ text: String(node.text), href: node.href, ruleset });
    Object.values(node).forEach((entry) => collectSourceLinks(entry, ruleset, links));
  }
  return links;
}

function readCorpusSourceLinks(): SourceLink[] {
  return readdirSync(ARTICLES_DIR).filter((name) => name.endsWith(".json")).flatMap((name) => {
    const document = JSON.parse(readFileSync(join(ARTICLES_DIR, name), "utf8"));
    return collectSourceLinks(document, document.article.ruleset, []);
  });
}

const link = (text: string): Extract<InlineNode, { type: "link" }> => ({ type: "link", text, href: ABBREVIATIONS });

describe("findRpgbotSourceCodes", () => {
  it("кожна позначка джерела в перекладених статтях стає кодом джерела або свідомо лишається текстом", () => {
    const links = readCorpusSourceLinks();
    expect(links.length).toBeGreaterThan(1000);
    const unmapped = [...new Set(links.filter((entry) => !findRpgbotSourceCodes(entry, entry.ruleset) && !DELIBERATELY_PLAIN.has(entry.text)).map((entry) => entry.text))];
    expect(unmapped).toEqual([]);
  });

  it("свідомо текстові позначки справді не стають значками", () => {
    for (const text of DELIBERATELY_PLAIN) expect(findRpgbotSourceCodes(link(text), "RULES_2014")).toBeNull();
  });

  it("кожен код має назву книги для підказки", () => {
    const codes = readCorpusSourceLinks().flatMap((entry) => findRpgbotSourceCodes(entry, entry.ruleset) ?? []);
    const untitled = [...new Set(codes)].filter((code) => !Object.hasOwn(sourceTranslations, code) && !findUntranslatedSourceTitle(code));
    expect(untitled).toEqual([]);
  });

  it("розбирає кілька джерел і варіанти написання", () => {
    expect(findRpgbotSourceCodes(link("EEPC / XGtE"), "RULES_2014")).toEqual(["EEPC", "XGTE"]);
    expect(findRpgbotSourceCodes(link("PHB/MToF"), "RULES_2014")).toEqual(["PHB", "MTOF"]);
    expect(findRpgbotSourceCodes(link("SJ:AiS"), "RULES_2014")).toEqual(["SPELLJAMMER"]);
    expect(findRpgbotSourceCodes(link("Книга Гравця (2014)"), "RULES_2014")).toEqual(["PHB"]);
    expect(findRpgbotSourceCodes(link("Elemental Evil Player’s Companion"), "RULES_2014")).toEqual(["EEPC"]);
  });

  it("основні книги у статтях 2024 ведуть на видання 2024, а у статтях 2014 — на 2014", () => {
    expect(findRpgbotSourceCodes(link("PHB"), "RULES_2024")).toEqual(["PHB_2024"]);
    expect(findRpgbotSourceCodes(link("PHB"), "RULES_2014")).toEqual(["PHB"]);
    expect(findRpgbotSourceCodes(link("XGtE"), "RULES_2024")).toEqual(["XGTE"]);
  });

  it("не чіпає посилання поза сторінкою скорочень", () => {
    expect(findRpgbotSourceCodes({ text: "PHB", href: "https://rpgbot.net/dnd5/characters/" }, "RULES_2014")).toBeNull();
  });
});

describe("dropSourceMarkerBrackets", () => {
  it("прибирає дужки навколо позначки джерела", () => {
    const nodes: InlineNode[] = [{ type: "link", text: "Дуель", href: "/feats/duel" }, { type: "superscript", text: "(" }, link("PHB"), { type: "superscript", text: ")" }, { type: "text", text: ": текст" }];
    expect(dropSourceMarkerBrackets(nodes, "RULES_2014")).toEqual([nodes[0], link("PHB"), { type: "text", text: ": текст" }]);
  });

  it("лишає дужки навколо звичайного тексту й непарні дужки", () => {
    const plain: InlineNode[] = [{ type: "text", text: "з (" }, link("Казана Таші з усім"), { type: "text", text: ")" }];
    const unpaired: InlineNode[] = [{ type: "text", text: "(" }, link("PHB"), { type: "text", text: " і далі" }];
    expect(dropSourceMarkerBrackets(plain, "RULES_2014")).toEqual(plain);
    expect(dropSourceMarkerBrackets(unpaired, "RULES_2014")).toEqual(unpaired);
  });
});
