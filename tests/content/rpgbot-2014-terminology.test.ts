import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";

function readTranslations() {
  return readdirSync("data/rpgbot/uk")
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({ name, document: JSON.parse(readFileSync(`data/rpgbot/uk/${name}`, "utf8")) }))
    .filter(({ document }) => document.article.ruleset === "RULES_2014")
    .map(({ name, document }) => ({ name, text: JSON.stringify(document.translations) }));
}

it("2014 analysis uses ratified skill and hit-dice names", () => {
  const retiredTerms = /(?<![\p{L}])(?:Увага|Увагу|Увагою|Уваги|Увазі|Проникливість(?! велетнів)|Проникливості|Проникливістю|Догляд за тваринами|Кубик(?:ами|ів|ом|и|а|у)? Хітів)(?![\p{L}])/u;
  expect(readTranslations().filter(({ text }) => retiredTerms.test(text)).map(({ name }) => name)).toEqual([]);
});

it("skill terminology does not rename distinct named abilities", () => {
  const articles = readTranslations();
  expect(articles.find(({ name }) => name === "rpgbot-glory-of-the-giants-backgrounds-and-feats-2014.json")?.text).toContain("Проникливість велетнів");
  expect(articles.find(({ name }) => name === "rpgbot-rogue-inquisitive-2014.json")?.text).toContain("Проникливий бій");
  expect(articles.find(({ name }) => name === "rpgbot-verdan-2014.json")?.text).toContain("Телепатична проникливість");
});

it("Locathah armor and monk save proficiency refer to actual native abilities", () => {
  const articles = readTranslations();
  expect(articles.find(({ name }) => name === "rpgbot-locathah-2014.json")?.text).toContain("{{Природна броня Локата|Locathah Natural Armor}}");
  for (const slug of ["paladin", "deep-gnome", "verdan", "vedalken"]) {
    const text = articles.find(({ name }) => name === `rpgbot-${slug}-2014.json`)?.text;
    expect(text).toContain("Diamond Soul");
    expect(text).not.toContain("{{Diamond Body}}");
    expect(text).toContain("Diamond Body");
  }
});


it("authoring sheets retain the same ratified terminology", () => {
  const names = ["ranger-beast-master", "ranger-gloom-stalker", "ranger-swarmkeeper", "ranger-drakewarden", "artificer-battle-smith", "artificer-armorer", "artificer-artillerist", "ranger-horizon-walker", "ranger-hunter", "ranger-fey-wanderer", "hexblood"];
  for (const name of names) {
    const sheet = readFileSync(`data/rpgbot/authoring/${name}-2014.md`, "utf8");
    const paragraphs = Array.from(sheet.matchAll(/\*\*Українською:\*\*\n([\s\S]*?)(?=\n### |\n## |\n\*\*|$)/g), (match) => match[1]).join("\n");
    expect(paragraphs, name).not.toMatch(/(?<![\p{L}])(?:Увага|Увагу|Увагою|Уваги|Увазі|Проникливість|Проникливості|Проникливістю|Догляд за тваринами)(?![\p{L}])/u);
  }
});
