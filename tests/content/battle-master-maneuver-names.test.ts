import { describe, expect, it } from "vitest";
import dictionary from "@/lib/refs/dictionary.json";
import subclassChoices from "../../data/2024/normalized/subclass-choices.json";
import subclasses2024 from "../../data/2024/normalized/subclasses.json";
import { readSubclassFeatureSeedInputs } from "../../prisma/seed/subclassFeatureSeed";

const MANEUVER_NAMES: Record<string, string> = dictionary.DND_DICTIONARY.battleMasterManeuvers;

const toDictionaryKey = (engName: string): string =>
  engName
    .replace(/['’]/g, "")
    .split(/\s+/)
    .map((word, index) => (index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join("");

const maneuvers2024 = subclassChoices.groups.find((group) => group.groupName === "Маневри майстра бою")!.options;

/// Один маневр мав три назви: картка вибору 2024, заголовок в описі підкласу 2024 і фіча 2014.
/// Гравець шукав «Контрудар», а обирав «Відплату».
describe("назви маневрів Майстра бою збігаються зі словником", () => {
  it("опції вибору 2024", () => {
    for (const option of maneuvers2024) expect(option.name, option.engName).toBe(MANEUVER_NAMES[toDictionaryKey(option.engName)]);
  });

  it("заголовки маневрів в описі підкласу 2024", () => {
    const description = subclasses2024.flatMap((subclass) => subclass.features).find((feature) => feature.description.includes("**Засідка.**"))!.description;
    const maneuverList = description.slice(description.indexOf("**Засідка.**"));
    const headings = [...maneuverList.matchAll(/\*\*([^*]+?)\.\*\*/g)].map((match) => match[1]);
    expect(headings.filter((heading) => !Object.values(MANEUVER_NAMES).includes(heading))).toEqual([]);
    expect(headings).toHaveLength(maneuvers2024.length);
  });

  it("фічі маневрів 2014", () => {
    const features2014 = new Map(readSubclassFeatureSeedInputs().map((feature) => [feature.engName, feature.name]));
    for (const option of maneuvers2024) {
      const engName2014 = option.engName.replace("’", "'");
      expect(features2014.get(engName2014), engName2014).toBe(MANEUVER_NAMES[toDictionaryKey(option.engName)]);
    }
  });
});
