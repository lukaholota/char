import { describe, expect, it } from "vitest";
import { findRaceSpellChoice2014 } from "@/rules/race-spell-choices-2014";

describe("O48 — раса 2014, що дає обрати замовляння", () => {
  it("Високий ельф — одне замовляння зі списку чарівника; лісовий ельф — нічого", () => {
    expect(findRaceSpellChoice2014({ race: "ELF_2014", subrace: "ELF_HIGH_2014", chosenRaceOptionNames: [] })).toEqual({
      sourceKey: "ELF_HIGH_2014",
      label: "Замовляння вищого ельфа",
      rule: { picks: [{ count: 1, spellLevel: 0, schools: null, spellList: "Чарівник" }] },
    });
    expect(findRaceSpellChoice2014({ race: "ELF_2014", subrace: "ELF_WOOD_2014", chosenRaceOptionNames: [] })).toBeNull();
  });

  it("Кобольд обирає замовляння чародія лише зі спадком Драконяче чаклунство", () => {
    const sorcery = findRaceSpellChoice2014({ race: "KOBOLD_MPMM", subrace: null, chosenRaceOptionNames: ["Драконяче чаклунство"] });
    expect(sorcery?.rule.picks[0].spellList).toBe("Чародій");
    expect(findRaceSpellChoice2014({ race: "KOBOLD_MPMM", subrace: null, chosenRaceOptionNames: ["Непокора"] })).toBeNull();
  });

  it("Астральний ельф — одне з трьох замовлянь Астрального вогню", () => {
    const [pick] = findRaceSpellChoice2014({ race: "ASTRAL_ELF_SPELLJAMMER", subrace: null, chosenRaceOptionNames: [] })!.rule.picks;
    expect(pick.extraList?.spellEngNames).toEqual(["Dancing Lights", "Light", "Sacred Flame"]);
  });
});
