/**
 * Граф конструктора персонажа — з файлу, а не з бази (KR22.5, [Р25](docs/DECISIONS.md#р25)).
 *
 * Артефакти робить `scripts/generate-creator-content.ts` з робочої бази, і вони лежать у git
 * ([Р23](docs/DECISIONS.md#р23)). Що саме вони несуть і чому це не `races.json` — у журналі
 * KR22.5: каталоги показу мають 11 шляхів із 333 у рас і 15 із 450 у класів, бо несуть
 * перекладений показ, а конструктору потрібні сирі механіки.
 */

import type { Ruleset } from "@prisma/client";

import creatorContent2014 from "@/lib/generated/creator-content-2014.json";
import creatorContent2024 from "@/lib/generated/creator-content-2024.json";
import { reviveCreatorContent } from "@/lib/content/creator-content-file";
import type { CreatorContent } from "@/server/db/creator-content-query";

const RAW_BY_RULESET: Record<Ruleset, unknown> = {
  RULES_2014: creatorContent2014,
  RULES_2024: creatorContent2024,
};

/// Оживлення дат — обхід усього графа, тож робиться раз на редакцію за життя процесу і лише для
/// тієї редакції, яку справді відкрили.
const revivedByRuleset = new Map<Ruleset, CreatorContent>();

export function findCharacterCreatorOptions(ruleset: Ruleset): CreatorContent {
  const alreadyRevived = revivedByRuleset.get(ruleset);
  if (alreadyRevived) return alreadyRevived;

  const content = reviveCreatorContent(RAW_BY_RULESET[ruleset]);
  revivedByRuleset.set(ruleset, content);
  return content;
}

/**
 * The creation wizard can only create a level-one character. Keep the full file for level-up,
 * but do not serialize features that the wizard cannot offer into its RSC payload.
 */
export function findCharacterCreationOptions(ruleset: Ruleset): CreatorContent {
  const content = findCharacterCreatorOptions(ruleset);

  return {
    ...content,
    classes: content.classes.map((characterClass) => ({
      ...characterClass,
      features: characterClass.features.filter((entry) => entry.levelGranted <= 1),
      classOptionalFeatures: characterClass.classOptionalFeatures.filter((entry) =>
        entry.grantedOnLevels.includes(1),
      ),
      subclasses: characterClass.subclasses.map((subclass) => ({
        ...subclass,
        features: subclass.features.filter((entry) => entry.levelGranted <= 1),
      })),
    })),
  };
}
