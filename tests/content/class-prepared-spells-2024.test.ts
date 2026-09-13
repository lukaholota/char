/**
 * KR31.5 — класові «завжди підготовлені» заклинання 2024 у файлі-джерелі мусять дорівнювати SRD.
 *
 * Перелік звіряється **другим, незалежним** читанням книги — прямо тут, реченням за реченням, —
 * щоб помилка витягу не збіглася сама з собою. Правка переліку руками в `classes.json` робить
 * гейт червоним, і так само робить нове формулювання в книзі, якого витяг не розуміє.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLASSES_JSON } from "../../scripts/2024/parse-class-feature-uses";

type FeatureEng = { level: number; name: string; alwaysPreparedSpells?: string[] };
type ClassJson = { engName: string; featuresEng?: FeatureEng[] };

const classes: ClassJson[] = JSON.parse(readFileSync(join(process.cwd(), CLASSES_JSON), "utf-8"));
const srdMarkdown = readFileSync(join(process.cwd(), "data/2024/srd/classes.md"), "utf-8");

/// Книга називає заклинання курсивом рівно там, де воно назване; «the chosen / listed / these /
/// those spells prepared» курсиву не мають, бо заклинання обирає гравець або дає таблиця підкласу.
function readNamedAlwaysPreparedFromSrd(): string[] {
  return [...srdMarkdown.matchAll(/always have the ((?:_[^_\n]+_(?:,? and | or |, )?)+)\s*spells? prepared/g)]
    .flatMap((match) => [...match[1].matchAll(/_([^_\n]+)_/g)].map((italic) => italic[1].trim()))
    .sort();
}

function listFromFile(): Array<{ characterClass: string; feature: string; level: number; spells: string[] }> {
  return classes.flatMap((characterClass) =>
    (characterClass.featuresEng ?? [])
      .filter((feature) => feature.alwaysPreparedSpells?.length)
      .map((feature) => ({
        characterClass: characterClass.engName,
        feature: feature.name,
        level: feature.level,
        spells: feature.alwaysPreparedSpells!,
      })),
  );
}

describe("KR31.5 — класові «завжди підготовлені» заклинання 2024 дорівнюють книзі", () => {
  it("перелік у файлі — це рівно ті шість фіч, які називає SRD", () => {
    expect(listFromFile()).toEqual([
      { characterClass: "Bard", feature: "Words of Creation", level: 20, spells: ["Power Word Heal", "Power Word Kill"] },
      { characterClass: "Druid", feature: "Druidic", level: 1, spells: ["Speak with Animals"] },
      { characterClass: "Paladin", feature: "Paladin's Smite", level: 2, spells: ["Divine Smite"] },
      { characterClass: "Paladin", feature: "Faithful Steed", level: 5, spells: ["Find Steed"] },
      { characterClass: "Ranger", feature: "Favored Enemy", level: 1, spells: ["Hunter's Mark"] },
      { characterClass: "Warlock", feature: "Contact Patron", level: 9, spells: ["Contact Other Plane"] },
    ]);
  });

  it("жодного названого заклинання книги не загублено й не додано", () => {
    const inFile = listFromFile().flatMap((row) => row.spells).sort();

    expect(inFile).toEqual(readNamedAlwaysPreparedFromSrd());
  });

  it("вибір гравця переліком не стає: Майстерність заклинань і Фірмові заклинання лишаються порожні", () => {
    const named = listFromFile().map((row) => row.feature);

    expect(named).not.toContain("Signature Spells");
    expect(named).not.toContain("Spell Mastery");
  });
});
