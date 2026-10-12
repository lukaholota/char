import { expect, it } from "vitest";
import { hydrateArticleRevision } from "@/lib/optimization/content-hydration";
import { fixtureCorpus } from "@/lib/optimization/fixtures.test-helper";
import { collectTermSources } from "@/lib/term-sources";
import { buildTermCard } from "@/lib/term-card";
import { findRuleTermHref } from "@/lib/term-link";

it("separates Light spell and weapon property by their explicit Ukrainian names", () => {
  const revision = fixtureCorpus().translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "light", content: [{ type: "text", text: "{{Легка|Light}} і {{Освітлення|Light}}" }] }];
  const propertyHref = findRuleTermHref("Light (weapon property)", "RULES_2014")!;
  const hydrated = hydrateArticleRevision(revision, [
    { name: "Легка", engName: "Light", href: propertyHref, markerOnly: true },
    { name: "Освітлення", engName: "Light", href: "/spells/light" },
  ]);
  expect(hydrated.sections[0].blocks[0]).toMatchObject({ content: [
    { type: "link", text: "Легка", href: propertyHref }, { type: "text", text: " і " },
    { type: "link", text: "Освітлення", href: "/spells/light" },
  ] });
});

it("does not turn a Dexterity score or a quoted ability name into the Finesse property", () => {
  const revision = fixtureCorpus().translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "dexterity", content: [
    { type: "strong", text: "Спритність" }, { type: "text", text: ": 16, «Спритність», {{Спритність|Finesse}}" },
  ] }];
  const href = findRuleTermHref("Finesse", "RULES_2014")!;
  const hydrated = hydrateArticleRevision(revision, [{ name: "Спритність", engName: "Finesse", href, markerOnly: true }]);
  expect(hydrated.sections[0].blocks[0]).toMatchObject({ content: [
    { type: "strong", text: "Спритність" }, { type: "text", text: ": 16, «Спритність», " },
    { type: "link", text: "Спритність", href },
  ] });
});

const sources = collectTermSources();
it("keeps the Resistance spell separate from explicitly named damage resistance", () => {
  const revision = fixtureCorpus().translations[0];
  revision.sections[0].blocks = [{ type: "paragraph", blockId: "resistance", content: [{ type: "text", text: "{{Опір|Resistance}} і {{Опір до шкоди|Damage Resistance}}" }] }];
  const href = findRuleTermHref("Resistance", "RULES_2014")!;
  const hydrated = hydrateArticleRevision(revision, [
    { name: "Опір", engName: "Resistance", href: "/spells/resistance", kind: "spell" },
    { name: "Опір і вразливість до шкоди", engName: "Resistance", href, markerOnly: true },
    { name: "Опір і вразливість до шкоди", engName: "Damage Resistance", href, markerOnly: true },
  ]);
  expect(hydrated.sections[0].blocks[0]).toMatchObject({ content: [
    { type: "link", text: "Опір", href: "/spells/resistance" }, { type: "text", text: " і " },
    { type: "link", text: "Опір до шкоди", href },
  ] });
});

it.each([
  ["Contact", "незахищеною шкірою", "цілу дозу"],
  ["Ingested", "цілу дозу", "сльозні"],
  ["Inhaled", "Затримати подих", "Ранову отруту"],
  ["Injury", "не потрапить у рану", "перелік отрут"],
  ["Carrion Crawler Mucus", "Паралізована", "Отрута дроу"],
  ["Ammunition", "вільна рука", "Роблячи атаку"],
  ["Finesse", "Для обох кидків", "Малі істоти"],
  ["Basic Poison", "1к4", "Торбинка"],
  ["Purple Worm Poison", "12к6", "Зміїна отрута"],
  ["heavily obscured", "значної заслоненості", ""],
])("opens the complete native 2014 rule for %s without the next item", (original, included, excluded) => {
  const card = buildTermCard({ original, ruleset: "RULES_2014" }, sources);
  expect(card.article?.subsection?.content).toContain(included);
  if (excluded) expect(card.article?.subsection?.content).not.toContain(excluded);
  expect(card.article?.ruleset).toBe("RULES_2014");
});
