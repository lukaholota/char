import { describe, expect, it } from "vitest";

import { findLegacySubclass2024 } from "@/rules/legacy-subclasses-2024";
import { findLegacySubclassSpells } from "@/rules/legacy-subclass-spells-2024";

const DEATH_DOMAIN_2024 = [
  "False Life",
  "Ray of Sickness",
  "Blindness/Deafness",
  "Ray of Enfeeblement",
  "Animate dead",
  "Vampiric Touch",
  "Blight",
  "Death Ward",
  "Antilife Shell",
  "Cloudkill",
];

function findEntry(class2024: string, subclass: string) {
  const entry = findLegacySubclass2024(class2024, subclass);
  if (!entry) throw new Error(`${subclass} немає в реєстрі`);
  return entry;
}

describe("O43 / KR43.8 — заклинання легасі-підкласу рядками 2024", () => {
  it("бере перелік O48 з рівнями класу 2014 і назвами з каталогу 2024, навіть коли написання розходиться", () => {
    const spells = findLegacySubclassSpells(findEntry("CLERIC_2024", "DEATH_DOMAIN"), DEATH_DOMAIN_2024);

    expect(spells.slice(0, 2)).toEqual([
      { engName: "False Life", classLevel2014: 1 },
      { engName: "Ray of Sickness", classLevel2014: 1 },
    ]);
    expect(spells).toContainEqual({ engName: "Animate dead", classLevel2014: 5 });
    expect(spells).toHaveLength(10);
  });

  it("підклас без переліку в O48 не дає заклинань", () => {
    expect(findLegacySubclassSpells(findEntry("BARBARIAN_2024", "PATH_OF_THE_BEAST"), DEATH_DOMAIN_2024)).toEqual([]);
  });

  it("падає, коли заклинання переліку немає серед заклинань 2024", () => {
    expect(() => findLegacySubclassSpells(findEntry("CLERIC_2024", "DEATH_DOMAIN"), ["False Life"])).toThrow("Ray of Sickness");
  });
});
