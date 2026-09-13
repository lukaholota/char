import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSubclassSources } from "../../scripts/2024/parse-subclasses";
import { listFeaturesRegainingOneUseOnShortRest } from "@/rules/resource-pools";

/**
 * Форма книги, з якої виводиться реєстр. Читається незалежно від витягу — це звірка, а не його
 * повторний виклик. «Dice» стоїть поряд із «uses», бо Кубики псіонічної енергії книга повертає
 * тим самим правилом, тільки іншим іменником.
 */
const REGAINS_ONE_USE = /You regain one (?:of (?:its|your) )?expended [\w' ]*?(?:uses?|Dice) when you finish a Short Rest/;

/// Реєстр у `src/rules/resource-pools.ts` мусить дорівнювати корпусу: інакше наступна фіча з тим
/// самим правилом мовчки відновлюватиметься до максимуму, як усі до KR31.3.
function collectFeaturesRegainingOneUseInSrd(): string[] {
  const srd = readFileSync(join(process.cwd(), "data/2024/srd/classes.md"), "utf8");
  const found: string[] = [];
  let className = "";
  let featureName = "";

  for (const line of srd.split("\n")) {
    const classHeading = /^## (.+)$/.exec(line);
    if (classHeading) {
      className = classHeading[1].trim();
      featureName = "";
      continue;
    }
    const featureHeading = /^#### Level \d+: (.+)$/.exec(line);
    if (featureHeading) {
      featureName = featureHeading[1].trim();
      continue;
    }
    if (featureName && REGAINS_ONE_USE.test(line)) {
      found.push(`${className}: ${featureName} (2024)`);
      featureName = "";
    }
  }
  return found;
}

function collectFeaturesRegainingOneUseInSubclasses(): string[] {
  return readSubclassSources().flatMap((subclass) =>
    subclass.featuresEng
      .filter((feature) => REGAINS_ONE_USE.test(feature.descriptionEng.replace(/[’ʼ‘]/g, "'")))
      .map((feature) => `${subclass.engName}: ${feature.name} (2024)`),
  );
}

function collectFeaturesRegainingOneUse(): string[] {
  return [...collectFeaturesRegainingOneUseInSrd(), ...collectFeaturesRegainingOneUseInSubclasses()].sort();
}

describe("фічі 2024, що повертають одне використання на короткому відпочинку", () => {
  it("реєстр збігається з корпусом 2024", () => {
    expect(collectFeaturesRegainingOneUse()).toEqual(listFeaturesRegainingOneUseOnShortRest().sort());
  });

  it("корпус містить пʼять класових носіїв", () => {
    expect(collectFeaturesRegainingOneUseInSrd().sort()).toEqual([
      "Barbarian: Rage (2024)",
      "Cleric: Channel Divinity (2024)",
      "Druid: Wild Shape (2024)",
      "Fighter: Second Wind (2024)",
      "Paladin: Channel Divinity (2024)",
    ]);
  });

  it("корпус містить двох підкласових носіїв — Кубики псіонічної енергії", () => {
    expect(collectFeaturesRegainingOneUseInSubclasses().sort()).toEqual([
      "Psi Warrior: Psionic Power (2024)",
      "Soulknife: Psionic Power (2024)",
    ]);
  });
});
