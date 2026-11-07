import { describe, expect, it } from "vitest";
import type { Ruleset } from "@/lib/prisma-enums";
import { getAllSpells } from "@/lib/spellsData";
import { findSpellArea, type SpellArea } from "@/rules/spell-area";

const RULESETS: Ruleset[] = ["RULES_2014", "RULES_2024"];

function findAreaByName(ruleset: Ruleset, engName: string): SpellArea | null {
  const spell = getAllSpells(ruleset).find((candidate) => candidate.engName === engName);
  if (!spell) throw new Error(`${engName} is missing in ${ruleset}`);
  return findSpellArea(spell);
}

const circle = (sizeFeet: number): SpellArea => ({ shape: "circle", sizeFeet });
const cone = (sizeFeet: number): SpellArea => ({ shape: "cone", sizeFeet });
const line = (sizeFeet: number): SpellArea => ({ shape: "line", sizeFeet });
const square = (sizeFeet: number): SpellArea => ({ shape: "square", sizeFeet });

const KNOWN_AREAS: [string, SpellArea | null, SpellArea | null][] = [
  ["Shatter", circle(10), circle(10)],
  ["Fireball", circle(20), circle(20)],
  ["Burning Hands", cone(15), cone(15)],
  ["Cone of Cold", cone(60), cone(60)],
  ["Lightning Bolt", line(100), line(100)],
  ["Thunderwave", square(15), square(15)],
  ["Spirit Guardians", circle(15), circle(15)],
  ["Sleet Storm", circle(40), circle(20)],
  ["Web", square(20), square(20)],
  ["Hypnotic Pattern", square(30), square(30)],
  ["Fear", cone(30), cone(30)],
  ["Gust of Wind", line(60), line(60)],
  ["Cloudkill", circle(20), circle(20)],
  ["Faerie Fire", square(20), square(20)],
  ["Magic Missile", null, null],
  ["Wall of Fire", null, null],
  ["Control Water", null, null],
  ["Hallucinatory Terrain", null, null],
];

describe("findSpellArea", () => {
  it.each(KNOWN_AREAS)("%s", (engName, area2014, area2024) => {
    expect(findAreaByName("RULES_2014", engName)).toEqual(area2014);
    expect(findAreaByName("RULES_2024", engName)).toEqual(area2024);
  });

  it("reads the range before the description", () => {
    expect(findSpellArea({ engName: "Test", range: "На себе (радіус 10 футів)", description: "Сфера радіусом 40 футів" })).toEqual(circle(10));
  });

  it("ignores sizes in miles and sizes beyond the map limit", () => {
    expect(findSpellArea({ engName: "Test", range: "На себе (радіус 5 миль)", description: "" })).toBeNull();
    expect(findSpellArea({ engName: "Test", range: "На себе (радіус 900 футів)", description: "" })).toBeNull();
  });

  it("does not take an object size limit for an area", () => {
    expect(findSpellArea({ engName: "Test", range: "30 футів", description: "<p>Предмет, що поміщається у 5-футовий куб.</p>" })).toBeNull();
  });

  it("does not take light radius for an area", () => {
    expect(findSpellArea({ engName: "Test", range: "Дотик", description: "Предмет випромінює яскраве світло в радіусі 20 футів" })).toBeNull();
  });
});

const AREA_HINT = /конус|лінія|лінію|лінії|\d+-футов\p{L}*\s+(?:куб|лін|радіус)|куб\p{L}*\s+зі\s+стороною|(?:сфер|цилінд|випромінюван)\p{L}*[^.]{0,45}?радіус|радіус\p{L}*\s+\d+\s+ф/iu;

const REVIEWED_WITHOUT_AREA = new Set([
  "Animate Objects", "Antipathy/Sympathy", "Bones of the Earth", "Booming Blade", "Branding Smite", "Conjure Elemental", "Continual Flame",
  "Control Flames", "Control Water", "Control Weather", "Creation", "Crown of Stars", "Dancing Lights", "Disintegrate", "Draconic Transformation",
  "Druidcraft", "Elementalism", "Fabricate", "Find Traps", "Fire Shield", "Fire Storm", "Flame Blade", "Flaming Sphere", "Fount of Moonlight",
  "Green-Flame Blade", "Guardian of Nature", "Hallucinatory Terrain", "Heroes' Feast", "Holy Weapon", "Illusory Dragon", "Immolation",
  "Investiture of Stone", "Light", "Major Image", "Message", "Minor Illusion", "Mold Earth", "Mordenkainen's Private Sanctum", "Phantasmal Force",
  "Primal Savagery", "Produce Flame", "Programmed Illusion", "Shape Water", "Shining Smite", "Silent Image", "Snare", "Starry Wisp",
  "Storm of Vengeance", "Teleport", "Teleportation Circle", "Wall of Force", "Wall of Ice", "Wall of Light", "Wall of Sand", "Wall of Thorns",
]);

describe.each(RULESETS)("spell catalog sweep %s", (ruleset) => {
  const spells = getAllSpells(ruleset);
  const mentionsArea = spells.filter((spell) => AREA_HINT.test(`${spell.range} | ${spell.description.replace(/<[^>]+>/g, " ")}`));

  it("gives every spell that mentions an area a shape, or lists it as reviewed", () => {
    const unexplained = mentionsArea.filter((spell) => !findSpellArea(spell) && !REVIEWED_WITHOUT_AREA.has(spell.engName)).map((spell) => spell.engName);
    expect(unexplained).toEqual([]);
  });

  it("keeps every parsed area inside the map limits", () => {
    const sizes = spells.map(findSpellArea).filter((area): area is SpellArea => area !== null);
    expect(sizes.length).toBeGreaterThan(50);
    for (const area of sizes) expect(area.sizeFeet).toBeGreaterThanOrEqual(5);
    for (const area of sizes) expect(area.sizeFeet).toBeLessThanOrEqual(500);
  });

  it("reports counts", () => {
    const parsed = spells.filter((spell) => findSpellArea(spell)).length;
    const excluded = mentionsArea.filter((spell) => !findSpellArea(spell)).length;
    console.info(`${ruleset}: parsed ${parsed}, excluded ${excluded}, total ${spells.length}`);
    expect(parsed + excluded).toBeLessThanOrEqual(spells.length);
  });
});
