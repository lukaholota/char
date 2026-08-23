import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getAllSpells } from "@/lib/spellsData";

/// `Arcane Hand` (1174) і `Arcane Sword` (1106) прожили в SPELLS ще добу після того, як
/// KR16.2 злив їх у `Bigby's Hand` і `Mordenkainen's Sword`: список ратифікованих назв ніщо
/// не тримало за каталог. Ці перевірки і є те, що тримає.
type RatifiedSpellName = { spell_id: number; eng_name: string; name: string };

const ratifiedSpellNames = (
  JSON.parse(readFileSync(join(process.cwd(), "src/lib/refs/dictionary.json"), "utf-8")) as {
    SPELLS: RatifiedSpellName[];
  }
).SPELLS;

const catalog2014 = getAllSpells("RULES_2014");

describe("ратифіковані назви заклинань і каталог 2014", () => {
  it("жодна ратифікована назва не вказує на неіснуючий spell_id", () => {
    const catalogIds = new Set(catalog2014.map((spell) => spell.spellId));
    const danglingNames = ratifiedSpellNames
      .filter((entry) => !catalogIds.has(entry.spell_id))
      .map((entry) => `${entry.spell_id} ${entry.eng_name}`);

    expect(danglingNames).toEqual([]);
  });

  it("жодне заклинання каталогу не лишилося без ратифікованої назви", () => {
    const ratifiedIds = new Set(ratifiedSpellNames.map((entry) => entry.spell_id));
    const unnamedSpells = catalog2014
      .filter((spell) => !ratifiedIds.has(spell.spellId))
      .map((spell) => `${spell.spellId} ${spell.engName}`);

    expect(unnamedSpells).toEqual([]);
  });
});
