import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { findSpellKnowledge2014, SPELL_KNOWLEDGE_2014, THIRD_CASTER_KNOWLEDGE_2014 } from "@/rules/spell-knowledge-2014";

type Progression = { cantripProgression: number[] | null; spellsKnownProgression: number[] | null; casterProgression: string | null };

const progressions = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/5etools/class-spell-progressions-2014.json"), "utf-8"),
) as Record<string, Progression>;

const NO_CANTRIPS = Array.from({ length: 20 }, () => 0);

function findHighestSlotLevel(slots: readonly number[]): number {
  return slots.reduce((highest, count, index) => (count > 0 ? index + 1 : highest), 0);
}

function findExpectedMaxSpellLevel(casterProgression: string | null, level: number): number {
  if (casterProgression === "full") return findHighestSlotLevel(SPELL_SLOT_PROGRESSION.FULL[level as keyof typeof SPELL_SLOT_PROGRESSION.FULL]);
  if (casterProgression === "1/2") return findHighestSlotLevel(SPELL_SLOT_PROGRESSION.HALF[level as keyof typeof SPELL_SLOT_PROGRESSION.HALF]);
  if (casterProgression === "1/3") return findHighestSlotLevel(SPELL_SLOT_PROGRESSION.THIRD[level as keyof typeof SPELL_SLOT_PROGRESSION.THIRD]);
  if (casterProgression === "pact") return SPELL_SLOT_PROGRESSION.PACT[level as keyof typeof SPELL_SLOT_PROGRESSION.PACT].level;
  if (casterProgression === "artificer") return Math.min(5, Math.ceil(level / 4));
  throw new Error(`невідома прогресія ${casterProgression}`);
}

describe("таблиці класів 2014 — звірка з 5etools (PHB, TCoE)", () => {
  it("кожен клас таблиці є у фікстурі й навпаки", () => {
    const tableClasses = Object.keys(SPELL_KNOWLEDGE_2014).sort();
    const fixtureClasses = Object.keys(progressions).filter((key) => key !== "FIGHTER_2014" && key !== "ROGUE_2014").sort();
    expect(tableClasses).toEqual(fixtureClasses);
  });

  it.each(Object.keys(SPELL_KNOWLEDGE_2014))("%s: замовляння, відомі заклинання й найвищий рівень", (className) => {
    const table = SPELL_KNOWLEDGE_2014[className];
    const source = progressions[className];
    const levels = Array.from({ length: 20 }, (_, index) => index + 1);

    expect([...table.cantrips]).toEqual(source.cantripProgression ?? NO_CANTRIPS);
    expect(table.known ? [...table.known] : null).toEqual(source.spellsKnownProgression);
    expect([...table.maxSpellLevel]).toEqual(levels.map((level) => findExpectedMaxSpellLevel(source.casterProgression, level)));
  });

  it("третинну таблицю дає лише свій підклас свого класу", () => {
    expect(findSpellKnowledge2014("FIGHTER_2014", 3, "ELDRITCH_KNIGHT")).toEqual({ cantrips: 2, known: 3, maxSpellLevel: 1 });
    expect(findSpellKnowledge2014("ROGUE_2014", 10, "ARCANE_TRICKSTER")).toEqual({ cantrips: 3, known: 7, maxSpellLevel: 2 });
    expect(findSpellKnowledge2014("FIGHTER_2014", 3, "CHAMPION")).toBeNull();
    expect(findSpellKnowledge2014("FIGHTER_2014", 3, "ARCANE_TRICKSTER")).toBeNull();
    expect(findSpellKnowledge2014("FIGHTER_2014", 3)).toBeNull();
    expect(findSpellKnowledge2014("BARD_2014", 3, "ELDRITCH_KNIGHT")?.known).toBe(6);
  });

  it("Потойбічний лицар і Містичний спритник мають ту саму третинну таблицю", () => {
    const levels = Array.from({ length: 20 }, (_, index) => index + 1);
    for (const key of ["FIGHTER_2014", "ROGUE_2014"]) {
      expect([...THIRD_CASTER_KNOWLEDGE_2014.cantrips]).toEqual(progressions[key].cantripProgression);
      expect([...THIRD_CASTER_KNOWLEDGE_2014.known!]).toEqual(progressions[key].spellsKnownProgression);
      expect([...THIRD_CASTER_KNOWLEDGE_2014.maxSpellLevel]).toEqual(levels.map((level) => findExpectedMaxSpellLevel("1/3", level)));
    }
  });
});
