import { describe, expect, it } from "vitest";

import classesJson from "@/lib/generated/classes.json";
import racesJson from "@/lib/generated/races.json";

type Described = { key: string; description?: unknown };

function findBadDescriptions(entries: Described[]): string[] {
  return entries
    .filter((entry) => !("description" in entry) || !isNullOrText(entry.description))
    .map((entry) => entry.key);
}

function isNullOrText(description: unknown): boolean {
  return description === null || (typeof description === "string" && description.trim() !== "");
}

describe("KR33.3 — носій прози в каталогах", () => {
  it("кожен клас несе description: null або непорожній текст", () => {
    expect(classesJson).toHaveLength(28);
    expect(findBadDescriptions(classesJson as Described[])).toEqual([]);
  });

  it("кожна раса й підраса несуть description: null або непорожній текст", () => {
    const races = racesJson as (Described & { subraces: Described[] })[];

    expect(races).toHaveLength(76);
    expect(findBadDescriptions(races)).toEqual([]);
    expect(findBadDescriptions(races.flatMap((race) => race.subraces))).toEqual([]);
  });
});
