import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getAllClasses } from "@/lib/classesData";
import { collectEntityReferences } from "@/lib/optimization/entity-hydration";
import { collectEntityAliases } from "@/lib/optimization/reference-aliases";
import { hydrateArticleRevision } from "@/lib/optimization/content-hydration";
import { parseArticleDocument } from "@/lib/optimization/document";

const references = collectEntityReferences("RULES_2014");
const aliases = collectEntityAliases([], references, references);
const revision = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-elf-2014.json", "utf8"))).translations.at(-1)!;

describe("subclass names in RPGbot prose", () => {
  it.each([
    ["Wild Magic", "Path of Wild Magic", "/classes?class=barbarian&subclass=path-of-wild-magic"],
    ["Beast Master", "Beast Master Conclave", "/classes?class=ranger&subclass=beast-master-conclave"],
    ["Gloom Stalker", "Gloom Stalker Conclave", "/classes?class=ranger&subclass=gloom-stalker-conclave"],
    ["Drunken Master", "Way of the Drunken Master", "/classes?class=monk&subclass=way-of-the-drunken-master"],
    ["Genie patron", "The Genie", "/classes?class=warlock&subclass=the-genie"],
    ["Genie Warlock", "The Genie", "/classes?class=warlock&subclass=the-genie"],
    ["Hexblade Warlock", "Hexblade", "/classes?class=warlock&subclass=hexblade"],
    ["Bladesinger", "School of Bladesinging", "/classes?class=wizard&subclass=school-of-bladesinging"],
    ["Bladesinger Wizard", "School of Bladesinging", "/classes?class=wizard&subclass=school-of-bladesinging"],
    ["Oath of Conquest Paladin", "Oath of Conquest", "/classes?class=paladin&subclass=oath-of-conquest"],
    ["Arcana Cleric", "Arcana Domain", "/classes?class=cleric&subclass=arcana-domain"],
  ])("recognizes %s with the native Ukrainian rules", (original, canonical, href) => {
    const native = references.find((entry) => entry.kind === "subclass" && entry.engName === canonical)!;
    const alias = aliases.find((entry) => entry.engName === original && entry.href === href);
    expect(alias).toBeDefined();
    expect(alias?.name).toBe(native.name);
    const hydrated = hydrateArticleRevision({ ...revision, sections: [{ ...revision.sections[0], blocks: [{
      type: "paragraph", blockId: "subclass-reference", content: [{ type: "text", text: `{{${native.name}|${original}}}` }],
    }] }] }, [alias!]);
    const block = hydrated.sections[0].blocks[0];
    expect(block.type === "paragraph" && block.content).toEqual([{ type: "link", text: native.name, href }]);
    expect(native.description?.length).toBeGreaterThan(150);
  });
});

describe("full class and subclass rules", () => {
  it.each(["Monk", "Warlock"])("includes every native feature of %s", (name) => {
    const native = getAllClasses("RULES_2014").find((entry) => entry.engName === name)!;
    const reference = references.find((entry) => entry.kind === "class" && entry.engName === name)!;
    for (const feature of native.features) {
      expect(reference.description).toContain(`### ${feature.name} · ${feature.level}-й рівень`);
      expect(reference.description).toContain(feature.description);
    }
  });

  it("keeps the original Astral Self description and every ability", () => {
    const monk = getAllClasses("RULES_2014").find((entry) => entry.engName === "Monk")!;
    const native = monk.subclasses.find((entry) => entry.engName === "Way of the Astral Self")!;
    const reference = references.find((entry) => entry.kind === "subclass" && entry.engName === native.engName)!;
    if (native.description) expect(reference.description).toContain(native.description);
    expect(native.features.map((feature) => feature.engName)).toEqual([
      "Arms of the Astral Self", "Visage of the Astral Self", "Body of the Astral Self", "Awakened Astral Self",
    ]);
    for (const feature of native.features) expect(reference.description).toContain(feature.description);
    expect(reference.description).not.toContain("Аналіз RPGbot");
  });
});
