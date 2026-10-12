import { describe, expect, it } from "vitest";
import { matchesRaceQuery } from "@/components/races/race-catalog-filters";
import { getAllRaces } from "@/lib/racesData";

const THRI_KREEN_SPELLINGS = [
  "три крін",
  "три-крін",
  "трі крін",
  "трі-крін",
  "трикрін",
  "трікрін",
  "трикрин",
  "три-крин",
];

describe("matchesRaceQuery", () => {
  const thriKreen = getAllRaces("RULES_2014").find((race) => race.slug === "thri-kreen");

  it.each(THRI_KREEN_SPELLINGS)("finds Три-крін by «%s»", (query) => {
    expect(thriKreen).toBeDefined();
    expect(matchesRaceQuery(thriKreen!, query)).toBe(true);
  });

  it("does not match an unrelated query", () => {
    expect(matchesRaceQuery(thriKreen!, "ельф")).toBe(false);
  });
});
