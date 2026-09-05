/**
 * Риса може прийти не тільки з кроку рис. У 2024 бойовий стиль — це риса категорії
 * FIGHTING_STYLE, яку видає клас: «You gain a Fighting Style feat of your choice».
 *
 * Звʼязок опції з рисою — наявний і реляційний: опція вибору дає фічу
 * (`ChoiceOptionFeature`), і та сама фіча висить на рисі (`Feat.grantsFeature`). Отже опція,
 * яка дає фічу риси, дає й саму рису. У даних 2014 таких перетинів немає жодного, тож правило
 * там нічого не змінює.
 */

export type FeatGrantingFeatures = {
  featId: number;
  featureIds: readonly number[];
  /** Повторювану рису вибір дає й тоді, коли вона вже є: друга Skilled від Універсальності Людини. */
  isRepeatable?: boolean;
};

export function findFeatsGrantedByChoiceOptions(input: {
  chosenFeatureIds: readonly number[];
  featsGrantingFeatures: readonly FeatGrantingFeatures[];
  alreadyTakenFeatIds?: readonly number[];
}): number[] {
  const chosen = new Set(input.chosenFeatureIds);
  const alreadyTaken = new Set(input.alreadyTakenFeatIds ?? []);

  const granted = input.featsGrantingFeatures
    .filter((feat) => feat.isRepeatable || !alreadyTaken.has(feat.featId))
    .filter((feat) => feat.featureIds.some((featureId) => chosen.has(featureId)))
    .map((feat) => feat.featId);

  return Array.from(new Set(granted));
}
