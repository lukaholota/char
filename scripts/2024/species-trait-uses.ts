/**
 * KR31.3 — числа використань і тип дії рис видів 2024, виведені з джерела.
 *
 * Джерело — `data/2024/source/raw/species/*.html` через `parse-species.ts`; чому не
 * `species.json`, у якого `descriptionEng` є прямо у файлі, написано там же.
 *
 * Форми речень спільні з класами й підкласами й лежать у `feature-uses-from-text.ts`. Тут — те,
 * чого класи й підкласи не мають: перелік блоків джерела, які рисою виду **не** є.
 */

import {
  compressUsesByLevel,
  findDisplayTypes,
  findRecoveryRest,
  findUsesInText,
  type DisplayTypeName,
  type FeatureUses2024,
  type UsesByLevel,
  type UsesCounts,
} from "./feature-uses-from-text";
import type { SpeciesSource, SpeciesTraitSource } from "./parse-species";

export type SpeciesTraitMechanics2024 = {
  speciesEngName: string;
  traitName: string;
  displayType: DisplayTypeName[];
  uses?: FeatureUses2024;
};

/**
 * Риса виду діє з 1-го рівня персонажа; ті, що вмикаються пізніше, книга обмежує реченням у
 * тілі («Starting at character level 5…»), а не рівнем видачі. Число тут потрібне лише формам
 * зростання за рівнем, яких у видах немає.
 */
const SPECIES_TRAIT_LEVEL = 1;

/**
 * Жирні заголовки джерела, які рисою виду не є, і чому. Перелік вичерпний навмисно: блок
 * джерела, якого немає ні у файлі, ні тут, зупиняє перелив (`parse-species-trait-uses.ts`) —
 * інакше нова риса книги мовчки лишилася б непоміченою.
 */
export const SOURCE_BLOCKS_THAT_ARE_NOT_TRAITS: Record<string, string> = {
  "Goliath|Cloud's Jaunt (Cloud Giant)": "дар Велетенського походження — опція вибору, не риса",
  "Goliath|Fire's Burn (Fire Giant)": "дар Велетенського походження — опція вибору, не риса",
  "Goliath|Frost's Chill (Frost Giant)": "дар Велетенського походження — опція вибору, не риса",
  "Goliath|Hill's Tumble (Hill Giant)": "дар Велетенського походження — опція вибору, не риса",
  "Goliath|Stone's Endurance (Stone Giant)": "дар Велетенського походження — опція вибору, не риса",
  "Goliath|Storm's Thunder (Storm Giant)": "дар Велетенського походження — опція вибору, не риса",
};

export function extractSpeciesTraitMechanics2024(species: SpeciesSource[]): SpeciesTraitMechanics2024[] {
  return species.flatMap((one) =>
    one.traits.map((trait) => {
      const uses = findUses(one.engName, trait);
      return {
        speciesEngName: one.engName,
        traitName: trait.name,
        displayType: findDisplayTypes(trait.descriptionEng, Boolean(uses)),
        ...(uses ? { uses } : {}),
      };
    }),
  );
}

function findUses(speciesEngName: string, trait: SpeciesTraitSource): FeatureUses2024 | undefined {
  const counts =
    findFreeCastsOfLineageSpells(trait.descriptionEng) ??
    findUsesInText(trait.name, SPECIES_TRAIT_LEVEL, trait.descriptionEng);
  if (!counts) return undefined;

  const limitedUsesPer = findRecoveryRest(trait.descriptionEng);
  if (!limitedUsesPer) {
    throw new Error(`${speciesEngName}: ${trait.name} — число використань є, а відпочинку, що їх повертає, немає.`);
  }

  return { limitedUsesPer, ...counts };
}

/**
 * Заклинання родоводу: «When you reach character levels 3 and 5, you learn a higher-level spell…
 * You can cast it once without a spell slot» — Ельфівський родовід і Демонічна спадщина.
 *
 * Рішення власника 2026-09-08: носій показує **скільки безкоштовних застосувань є насправді**, а
 * не одне. Лист — трекер, а не рушій ([Р26](../../docs/DECISIONS.md#р26)): він не стежить, котре
 * саме із заклинань витрачено, зате не бреше про стелю.
 *
 * Рівні беруться з речення книги, а не з памʼяті, і кожен наступний додає одне застосування —
 * третій рівень у формулюванні підхопиться сам.
 */
const LINEAGE_SPELL_LEVELS = /When you reach character levels ([\d, and]+), you learn a higher-level spell/;

function findFreeCastsOfLineageSpells(body: string): UsesCounts | null {
  const match = LINEAGE_SPELL_LEVELS.exec(body);
  if (!match) return null;

  const byLevel: UsesByLevel[] = match[1]
    .split(/,|\band\b/)
    .map((part) => Number(part.trim()))
    .filter(Number.isInteger)
    .sort((left, right) => left - right)
    .map((lvl, index) => ({ lvl, uses: index + 1 }));

  if (!byLevel.length) throw new Error(`Родовід: у реченні про рівні «${match[1]}» немає жодного числа.`);
  return { usesCountSpecial: compressUsesByLevel(byLevel) };
}
