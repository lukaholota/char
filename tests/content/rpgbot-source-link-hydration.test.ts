import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleRevision } from "@/lib/optimization/content-hydration";

const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-elf-2014.json", "utf8")));
const target = { kind: "feat" as const, name: "Посвячений у бій", engName: "Fighting Initiate", href: "/feats/fighting-initiate" };

function hydrateLink(text: string, href: string, ruleset: "RULES_2014" | "RULES_2024" = "RULES_2014") {
  const revision = document.translations.at(-1)!;
  const hydrated = hydrateArticleRevision({ ...revision, sections: [{ ...revision.sections[0], blocks: [{
    type: "paragraph", blockId: "source-link", content: [{ type: "link", text, href }],
  }] }] }, [{ ...target, href: `${ruleset === "RULES_2024" ? "/2024" : ""}${target.href}` }]);
  const block = hydrated.sections[0].blocks[0];
  if (block.type !== "paragraph") throw new Error("Expected paragraph");
  const link = block.content[0];
  if (link.type !== "link") throw new Error("Expected link");
  return link;
}

it("explicitly marked RPGbot entity links open the local Ukrainian reference", () => {
  expect(hydrateLink("Посвячений у бій{{Fighting Initiate}}", "https://rpgbot.net/dnd5/characters/feats/fighting-initiate/")).toEqual({
    type: "link", text: target.name, href: target.href,
  });
});

it.each([
  "https://www.dndbeyond.com/sources/dnd/phb-2024/feats#FightingInitiate",
  "https://www.dndbeyond.com/sources/dnd/phb-2024#FightingInitiate",
  "https://www.dndbeyond.com/sources/dnd/phb-2024?chapter=feats#FightingInitiate",
  "https://www.dndbeyond.com/sources/dnd/dmg-2024/dms-toolbox#FightingInitiate",
  "https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary#FightingInitiate",
  "https://www.dndbeyond.com/sources/dnd/free-rules/equipment#FightingInitiate",
  "https://rpgbot.net/2024-dnd/feats/fighting-initiate/",
  "https://rpgbot.net/2024/characters/feats/fighting-initiate/",
])("preserves an explicitly 2024 source instead of replacing it with 2014 rules: %s", (href) => {
  const text = "Посвячений у бій{{Fighting Initiate}}";
  expect(hydrateLink(text, href)).toEqual({ type: "link", text, href });
  expect(hydrateLink(text, href, "RULES_2024").href).toBe(`/2024${target.href}`);
});

it.each([
  "https://www.dndbeyond.com/sources/dnd/phb-2014/feats#FightingInitiate",
  "https://www.dndbeyond.com/sources/dnd/phb-2014#FightingInitiate",
  "https://rpgbot.net/dnd5/characters/feats/fighting-initiate/",
])("keeps an explicit 2014 source in its edition: %s", (href) => {
  const text = "Посвячений у бій{{Fighting Initiate}}";
  expect(hydrateLink(text, href).href).toBe(target.href);
  expect(hydrateLink(text, href, "RULES_2024")).toEqual({ type: "link", text, href });
});

it("does not infer an edition from a feature slug, query, or fragment", () => {
  const href = "https://www.dndbeyond.com/sources/dnd/tcoe/feat-2024?edition=2024#2024";
  expect(hydrateLink("Посвячений у бій{{Fighting Initiate}}", href).href).toBe(target.href);
});

it.each([
  ["Посвячений у бій", "https://rpgbot.net/dnd5/characters/feats/fighting-initiate/"],
  ["Посвячений у бій{{Fighting Initiate}}", "https://example.com/analysis"],
  ["Дві риси{{Fighting Initiate}} і {{Other Feat}}", "https://rpgbot.net/analysis/"],
  ["Невідома риса{{Unknown Feat}}", "https://rpgbot.net/dnd5/characters/feats/unknown/"],
])("preserves source links without an explicit matching RPGbot entity: %s", (text, href) => {
  expect(hydrateLink(text, href)).toEqual({ type: "link", text, href });
});

it("continues to hydrate supported D&D Beyond entity links", () => {
  expect(hydrateLink("Посвячений у бій", "https://www.dndbeyond.com/feats/123-fighting-initiate").href).toBe(target.href);
});

it("hydrates a marked D&D Beyond link when the Ukrainian name has more words", () => {
  expect(hydrateLink("Посвячений у бій{{Fighting Initiate}}", "https://www.dndbeyond.com/feats/fighting-initiate")).toEqual({
    type: "link", text: target.name, href: target.href,
  });
});

it("hydrates an explicitly named entity in a legacy D&D Beyond source", () => {
  expect(hydrateLink("Посвячений у бій{{Fighting Initiate}}", "https://www.dndbeyond.com/sources/tcoe/feats#FightingInitiate")).toEqual({
    type: "link", text: target.name, href: target.href,
  });
});

it.each([
  "Посвячений у бій",
  "Невідома риса{{Unknown Feat}}",
  "Дві риси{{Fighting Initiate}} і {{Other Feat}}",
])("preserves a legacy source without one known explicit entity: %s", (text) => {
  const href = "https://www.dndbeyond.com/sources/tcoe/feats";
  expect(hydrateLink(text, href)).toEqual({ type: "link", text, href });
});
