// KR27.8 — скільки атак дає дія «Атака».
//
// SRD 2024 (data/2024/srd/character-creation.md, Multiclassing → Extra Attack): «If you gain the
// Extra Attack feature from more than one class, the features don't stack. You can't make more
// than two attacks with this feature unless you have a feature that says you can (such as the
// Fighter's Two Extra Attacks feature)». Там же — про виклик чорнокнижника «Thirsting Blade»:
// він теж не додає атаки понад наявну Додаткову атаку. Тому величина береться як МАКСИМУМ по
// виданих фічах, а не як сума; жодна гілка нижче не додає одну фічу до іншої.
//
// Джерело — рівень КЛАСУ, а не персонажа: перелік приходить із виданих рядків `pers_feature`,
// які `executeLevelUp` пише за `levelGranted === classLevelAfter`. Читати натомість
// `collectActiveFeatures` не можна: воно пропускає класові фічі за `pers.level`, тобто Воїн 4 /
// Паладин 4 отримав би Додаткову атаку з рівня персонажа 8 — рівно той дефект, який ловить М1.

import type { RulesetId } from "./strategies/types";

const ATTACKS_BY_FEATURE_TITLE_2024: Readonly<Record<string, number>> = {
  "Extra Attack": 2,
  "Two Extra Attacks": 3,
  "Three Extra Attacks": 4,
};

/**
 * `null` для 2014 — там числа немає, а не одиниця: дані 2014 несуть одну фічу «Extra Attack» на
 * всі класи, а підвищення воїна до трьох і чотирьох атак живе прозою в її описі. Порахувати
 * 2014 за цією таблицею означало б показати воїну 11-го рівня дві атаки замість трьох.
 */
export function findAttacksPerAction(ruleset: RulesetId, grantedFeatureNames: readonly string[]): number | null {
  if (ruleset !== "RULES_2024") return null;

  return grantedFeatureNames.reduce(
    (attacks, engName) => Math.max(attacks, ATTACKS_BY_FEATURE_TITLE_2024[readFeatureTitle(engName)] ?? 0),
    1,
  );
}

/** «Fighter: Two Extra Attacks (2024)» → «Two Extra Attacks». */
function readFeatureTitle(engName: string): string {
  const withoutRuleset = engName.replace(/\s*\(2024\)\s*$/, "");
  return withoutRuleset.slice(withoutRuleset.lastIndexOf(": ") + 1).trim();
}
