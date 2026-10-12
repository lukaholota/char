import { expect, it } from "vitest";
import { getAllClasses } from "@/lib/classesData";
import { collectEntityReferences } from "@/lib/optimization/entity-hydration";
import { collectEntityAliases } from "@/lib/optimization/reference-aliases";
import { buildHydrationIndex, normalizeContentName } from "@/lib/optimization/content-hydration";
import type { ContentReference } from "@/lib/optimization/types";

const references = collectEntityReferences("RULES_2014");
const aliases = collectEntityAliases([], references, references);

it("opens dragonmarks without treating every marked Human as the base Human", () => {
  const finding = aliases.filter((entry) => entry.engName === "Mark of Finding");
  expect(finding.map((entry) => entry.href).sort()).toEqual([
    "/races?race=half-orc&variant=half-orc-mark-of-finding", "/races?race=human&variant=human-mark-of-finding",
  ]);
  const index = buildHydrationIndex([...references, ...aliases]);
  expect(index.targets.get("human")?.href).toBe("/races?race=human");
  expect(index.targets.get("tiefling")?.href).toBe("/races?race=tiefling");
  expect(aliases.find((entry) => entry.engName === "Asmodeus Tiefling")?.href).toBe("/races?race=tiefling&variant=tiefling-asmodeus");
  expect(aliases.find((entry) => entry.engName === "Mark of Healing")?.href).toBe("/races?race=halfling&variant=halfling-mark-of-healing");
});

it("preserves all native magic item variants for group names", () => {
  expect(aliases.filter((entry) => entry.engName === "Wand of the War Mage").map((entry) => entry.href).sort()).toEqual([
    "/magic-items/1217", "/magic-items/1218", "/magic-items/178",
  ]);
  const belts = aliases.filter((entry) => entry.engName === "Belt of Giant Strength (Frost, Stone, Fire)");
  expect(belts.map((entry) => entry.href).sort()).toEqual(["/magic-items/573", "/magic-items/574", "/magic-items/575"]);
  expect(aliases.filter((entry) => entry.engName === "Cloak or Ring of Protection")).toHaveLength(2);
  expect(aliases.filter((entry) => entry.engName === "Staff of Adornment/Birdcalls/Flowers")).toHaveLength(3);
  for (const belt of belts) expect(references.find((entry) => entry.href === belt.href)?.description).toBeTruthy();
});

it("recognizes source weapon ordering and explicit armor names", () => {
  const equipment = [
    { kind: "weapon" as const, name: "Легкий арбалет", engName: "Light Crossbow", href: "/weapons/light-crossbow" },
    { kind: "weapon" as const, name: "Javelin", engName: "Javelin", href: "/weapons/javelin" },
    { kind: "armor" as const, name: "Шкіряний обладунок", engName: "Leather", href: "/armor/leather" },
  ];
  const equipmentAliases = collectEntityAliases([], [], equipment);
  const index = buildHydrationIndex([...equipment, ...equipmentAliases]);
  expect(index.targets.get(normalizeContentName("Crossbow, Light"))?.href).toBe("/weapons/light-crossbow");
  expect(index.targets.get(normalizeContentName("Leather Armor"))?.href).toBe("/armor/leather");
  expect(index.targets.get(normalizeContentName("Javelins"))?.href).toBe("/weapons/javelin");
});

it("links named spell effects to the spell containing their full rules", () => {
  const spells = [
    { kind: "spell" as const, name: "Покращення здібності", engName: "Enhance Ability", href: "/spells/enhance-ability" },
    { kind: "spell" as const, name: "Керування водою", engName: "Control Water", href: "/spells/control-water" },
    { kind: "spell" as const, name: "Підглядання", engName: "Clairvoyance", href: "/spells/clairvoyance" },
  ];
  const spellAliases = collectEntityAliases([], [], spells);
  const index = buildHydrationIndex([...spells, ...spellAliases]);
  expect(index.targets.get(normalizeContentName("Bull’s Strength"))?.href).toBe("/spells/enhance-ability");
  expect(index.targets.get(normalizeContentName("Eagle's Splendor"))?.href).toBe("/spells/enhance-ability");
  expect(index.targets.get("flood")?.href).toBe("/spells/control-water");
  expect(index.targets.get("clairaudience")?.href).toBe("/spells/clairvoyance");
});

it("links component names only to native parent features containing their rules", () => {
  const features: ContentReference[] = getAllClasses("RULES_2014").flatMap((entry) => entry.subclasses.flatMap((subclass) => subclass.features
    .filter((feature) => ["Combat Superiority", "Lunar Embodiment", "Cloak of Shadows (Trickery Domain)", "Cloak of Shadows (Way of Shadow)"].includes(feature.engName))
    .map((feature) => ({ ...feature, kind: "feature" as const, href: `/classes?class=${entry.slug}&subclass=${subclass.slug}`, details: [] }))));
  const parents = collectEntityAliases([], features, features);
  expect(parents.find((entry) => entry.engName === "Superiority Dice")?.href).toBe("/classes?class=fighter&subclass=battle-master");
  expect(parents.find((entry) => entry.engName === "Moon Phase")?.href).toBe("/classes?class=sorcerer&subclass=lunar-sorcery");
  const cloak = parents.filter((entry) => entry.engName === "Channel Divinity: Cloak of Shadows");
  expect(cloak).toHaveLength(1);
  expect(cloak[0].href).toBe("/classes?class=cleric&subclass=trickery-domain");
});

it("links Psionic Energy Dice to both original feature variants", () => {
  const powers: ContentReference[] = getAllClasses("RULES_2014").flatMap((entry) => entry.subclasses.flatMap((subclass) => subclass.features
    .filter((feature) => feature.engName.startsWith("Psionic Power"))
    .map((feature) => ({ ...feature, kind: "feature" as const, href: `/classes?class=${entry.slug}&subclass=${subclass.slug}`, details: [] }))));
  const dice = collectEntityAliases([], powers, powers).filter((entry) => entry.engName === "Psionic Energy Dice");
  expect(dice).toHaveLength(2);
  expect(dice.map((entry) => entry.href).sort()).toEqual([
    "/classes?class=fighter&subclass=psi-warrior", "/classes?class=rogue&subclass=soulknife",
  ]);
  for (const power of powers) expect(power.description).toContain("к6");
  const scoped = collectEntityAliases([], powers, [{ ...powers[1], engName: "Psionic Power", sectionId: "section-soulknife", priority: 2 }]);
  const scopedDice = scoped.find((entry) => entry.engName === "Psionic Energy Dice" && entry.sectionId === "section-soulknife");
  expect(scopedDice?.href).toBe(powers[1].href);
  expect(scopedDice?.priority).toBe(2);
});
