import { describe, expect, it } from "vitest";
import { rankNameMatchesFirst, type CreatureIndexEntry } from "@/lib/bestiary-index";

function buildEntry(name: string, nameEng: string): CreatureIndexEntry {
  return { key: nameEng.toLowerCase(), name, nameEng } as CreatureIndexEntry;
}

describe("пошук бестіарію ставить збіг у назві перед збігом у тексті статблока", () => {
  const scout = buildEntry("Розвідник", "Scout");
  const luka = buildEntry("лука", "luka");
  const mound = buildEntry("Блукаючий курган", "Shambling Mound");

  it("спершу назва, що починається з запиту, далі назва, що його містить, далі решта в тому ж порядку", () => {
    expect(rankNameMatchesFirst([scout, mound, luka], "Лука").map((entry) => entry.name)).toEqual(["лука", "Блукаючий курган", "Розвідник"]);
  });

  it("слово в англійській назві теж рахується початком", () => {
    expect(rankNameMatchesFirst([scout, mound], "mound").map((entry) => entry.name)).toEqual(["Блукаючий курган", "Розвідник"]);
  });

  it("без запиту порядок не змінюється", () => {
    expect(rankNameMatchesFirst([scout, luka, mound], "  ")).toEqual([scout, luka, mound]);
  });
});
