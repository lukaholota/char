/**
 * Каталог конструктора їде з файлу ([Р25](docs/DECISIONS.md#р25)), а вибори гравця лягають у
 * базу по `choice_option_id`. Це працює, лише поки id у файлі — це id тієї самої бази: інакше
 * `levelUpCharacter` віддає «Обрана опція недоступна на цьому рівні» на цілком правильному
 * виборі, і причину видно тільки запитом.
 */

import type { CreatorContent } from "@/server/db/creator-content-query";

export type CatalogChoiceReference = {
  carrier: string;
  choiceOptionId: number;
  optionNameEng: string;
};

export function collectCatalogChoiceReferences(content: CreatorContent): CatalogChoiceReference[] {
  const references: CatalogChoiceReference[] = [];

  for (const characterClass of content.classes) {
    for (const option of characterClass.classChoiceOptions) {
      references.push(toReference(`клас ${characterClass.name}`, option));
    }
    for (const subclass of characterClass.subclasses) {
      for (const option of subclass.subclassChoiceOptions) {
        references.push(toReference(`підклас ${subclass.name}`, option));
      }
    }
  }

  for (const feat of content.feats) {
    for (const option of feat.featChoiceOptions) {
      references.push(toReference(`риса ${feat.name}`, option));
    }
  }

  return references;
}

export function findChoiceReferenceMismatches(
  references: readonly CatalogChoiceReference[],
  optionNameEngById: ReadonlyMap<number, string>,
): string[] {
  return references.flatMap((reference) => {
    const inDatabase = optionNameEngById.get(reference.choiceOptionId);
    if (inDatabase === undefined) {
      return [`${reference.carrier}: id ${reference.choiceOptionId} («${reference.optionNameEng}») у базі немає`];
    }
    if (inDatabase !== reference.optionNameEng) {
      return [`${reference.carrier}: id ${reference.choiceOptionId} — у каталозі «${reference.optionNameEng}», у базі «${inDatabase}»`];
    }
    return [];
  });
}

function toReference(
  carrier: string,
  option: { choiceOptionId: number; choiceOption: { optionNameEng: string } },
): CatalogChoiceReference {
  return { carrier, choiceOptionId: option.choiceOptionId, optionNameEng: option.choiceOption.optionNameEng };
}
