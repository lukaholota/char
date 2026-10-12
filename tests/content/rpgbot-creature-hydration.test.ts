import { expect, it } from "vitest";
import { collectCreatureAbilityReferences, collectCreatureReferences } from "@/lib/optimization/creature-hydration";
import { contentReferenceSchema } from "@/lib/optimization/schema";
import { hydrateArticleRevision } from "@/lib/optimization/content-hydration";
import { readFileSync } from "node:fs";
import { parseArticleDocument } from "@/lib/optimization/document";

it("provides the full native 2014 spider statblock, including web and bite", () => {
  const reference = collectCreatureReferences("RULES_2014").find((entry) => entry.engName === "Giant Spider")!;
  expect(contentReferenceSchema.parse(reference)).toEqual(reference);
  expect(reference.href).toBe("/bestiary?creature=giant-spider");
  expect(reference.details).toContainEqual({ label: "Очки здоровʼя", value: "26 (4к10 + 4)" });
  expect(reference.description).toContain("Spider Climb");
  expect(reference.description).toContain("Укус{{Bite}}");
  expect(reference.description).toContain("Павутина{{Web}}");
});

it("hydrates summon creatures into local references while preserving source prose", () => {
  const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-elf-2014.json", "utf8")));
  const reference = collectCreatureReferences("RULES_2014").find((entry) => entry.engName === "Undead Spirit")!;
  const revision = document.translations.at(-1)!;
  const hydrated = hydrateArticleRevision({ ...revision, sections: [{ ...revision.sections[0], blocks: [{
    type: "paragraph", blockId: "summon-reference", content: [{ type: "text", text: "Дух немертвого{{Undead Spirit}}: оберіть форму." }],
  }] }] }, [reference]);
  const block = hydrated.sections[0].blocks[0];
  expect(block.type === "paragraph" && block.content).toEqual([
    { type: "link", text: "Дух немертвого", href: reference.href }, { type: "text", text: ": оберіть форму." },
  ]);
  expect(reference.description).toContain("Rotting Claw");
  expect(reference.description).toContain("Deathly Touch");
  expect(reference.details.find((entry) => entry.label === "Очки здоровʼя")?.value).toContain("за кожен рівень заклинання");
});

it("keeps 2024 creatures under the 2024 catalog", () => {
  const references = collectCreatureReferences("RULES_2024");
  expect(references.length).toBeGreaterThan(0);
  expect(references.every((entry) => entry.href.startsWith("/2024/bestiary?creature="))).toBe(true);
});

it("extracts a complete named spider ability without neighbouring abilities", () => {
  const references = collectCreatureAbilityReferences("RULES_2014");
  const web = references.find((entry) => entry.href === "/bestiary?creature=giant-spider&feature=web")!;
  expect(contentReferenceSchema.parse(web)).toEqual(web);
  expect(web.name).toBe("Павутина (перезарядка 5–6)");
  expect(web.description).toContain("Сили СК 12");
  expect(web.description).toContain("імунітет до дроблячих, отруйних і психічних");
  expect(web.description).not.toContain("Укус{{Bite}}");
  const climb = references.find((entry) => entry.href === "/bestiary?creature=giant-spider&feature=spider-climb")!;
  expect(climb.description).toContain("догори ногами по стелі");
  expect(climb.description).not.toContain("Чуття павутини");
});

it("keeps each creature variant of an ability and its original use limits", () => {
  const references = collectCreatureAbilityReferences("RULES_2014");
  const owl = references.find((entry) => entry.href === "/bestiary?creature=owl&feature=flyby")!;
  expect(owl.engName).toBe("Flyby");
  expect(owl.description).toContain("не провокує");
  expect(owl.description).not.toContain("Гострий слух");
  const dragon = references.find((entry) => entry.href === "/bestiary?creature=adult-red-dragon&feature=legendary-resistance")!;
  expect(dragon.name).toContain("3 рази на день");
  expect(dragon.description).toContain("натомість досягти успіху");
  expect(references.filter((entry) => entry.engName === "Flyby").length).toBeGreaterThan(1);
});

it("keeps creature ability targets below an identically named class feature", () => {
  const revision = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-elf-2014.json", "utf8"))).translations.at(-1)!;
  const creatures = collectCreatureAbilityReferences("RULES_2014").filter((entry) => entry.engName === "Evasion");
  expect(creatures.length).toBeGreaterThan(0);
  const classFeature = { kind: "feature" as const, name: "Ухилення", engName: "Evasion", href: "/classes?class=rogue&feature=evasion-7" };
  const hydrated = hydrateArticleRevision({ ...revision, sections: [{ ...revision.sections[0], blocks: [{
    type: "paragraph", blockId: "class-priority", content: [{ type: "text", text: "Ухилення{{Evasion}}" }],
  }] }] }, [...creatures.map((reference) => ({ ...reference, priority: -1 })), classFeature]);
  const block = hydrated.sections[0].blocks[0];
  expect(block.type === "paragraph" && block.content).toEqual([{ type: "link", text: classFeature.name, href: classFeature.href }]);
});

it("keeps 2024 creature ability references in their own edition", () => {
  const references = collectCreatureAbilityReferences("RULES_2024");
  expect(references.length).toBeGreaterThan(0);
  expect(references.every((entry) => entry.href.startsWith("/2024/bestiary?creature="))).toBe(true);
});
