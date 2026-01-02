import { generateCharacterPdfFromData } from "../src/server/pdf/generateCharacterPdf";
import fs from "fs/promises";
import path from "path";

async function main() {
  console.log("Mocking character data...");

  // Mock Data
  const persMock = {
    persId: 1,
    name: "React PDF Tester",
    race: { name: "Human" },
    class: { name: "Wizard", savingThrows: ["INT", "WIS"] },
    background: { name: "Sage" },
    user: { name: "Tester", email: "test@example.com" },
    currentHp: 20,
    strength: 10,
    dexterity: 14,
    constitution: 12,
    intelligence: 16,
    wisdom: 10,
    charisma: 8,
    armors: [],
    feats: [],
    skills: [],
    weapons: [],
    classOptionalFeatures: [],
    multiclasses: [],
    subrace: null,
    persSpells: [
      { spellId: 101, spell: { name: "Fireball", level: 3 } },
      { spellId: 102, spell: { name: "Magic Missile", level: 1 } },
    ],
    magicItems: [
      { magicItemId: 201, magicItem: { name: "Wand of Testing", rarity: "RARE" } }
    ]
  };

  const featuresMock = {
    passive: [
      { name: "Keen Mind", description: "You know where north is.", sourceName: "Feat" },
      { name: "Arcane Recovery", description: "Regain spell slots on short rest.", sourceName: "Class" }
    ],
    actions: [
      { name: "Attack", description: "Hit things.", sourceName: "General" }
    ],
    bonusActions: [],
    reactions: [
      { name: "Shield", description: "+5 AC", sourceName: "Spell" }
    ]
  };

  const spellsByLevelMock = {
    1: [{ spellId: 102, spell: { name: "Magic Missile", level: 1 } }],
    3: [{ spellId: 101, spell: { name: "Fireball", level: 3 } }]
  };

  console.log("Generating PDF...");
  const startTime = Date.now();

  try {
    const pdfBytes = await generateCharacterPdfFromData(
      { pers: persMock as any, features: featuresMock as any, spellsByLevel: spellsByLevelMock as any },
      {
        sections: ["CHARACTER", "FEATURES", "SPELLS", "MAGIC_ITEMS"],
        flattenCharacterSheet: true,
      }
    );

    const endTime = Date.now();
    console.timeEnd("PDF Generation");
    console.log(`PDF generated in ${endTime - startTime}ms`);

    const outputPath = path.resolve(__dirname, "../test-character.pdf");
    await fs.writeFile(outputPath, pdfBytes);
    console.log(`Saved to ${outputPath}`);
  } catch (err) {
    console.error("PDF Generation failed:", err);
  }
}

main();
