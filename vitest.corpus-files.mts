// Ці файли звіряють наш контент із джерелами, яких у репозиторії немає: дзеркалом 5etools
// (`data/5etools/raw/`) і зісканованими сторінками aidedd (`data/aidedd/raw/`). Обидва в
// .gitignore і стягуються локально (`bun run fetch:5etools`). На раннері його немає взагалі,
// тож у CI вони падають не регресією, а відсутністю корпусу: «Немає …/raw/spells/index.json».
//
// Та сама межа, що й у vitest.db-integration-files.mts, тільки ресурс інший: там база, тут
// корпус. Перелік перевіряється прогоном без корпусу, а не оком — сховати `data/5etools/raw`
// і прогнати `bun run test:no-db`; впасти має рівно цей список.
export const CORPUS_TEST_FILES = [
  "tests/content/bestiary-2014-import.test.ts",
  "tests/content/bestiary-2024-import.test.ts",
  "tests/content/5etools-creatures.test.ts",
  "tests/content/5etools-equipment.test.ts",
  "tests/content/5etools-magic-items.test.ts",
  "tests/content/differs-from-2014.test.ts",
  "tests/content/extended-spell-lists-2014.test.ts",
  "tests/content/new-spells-2014.test.ts",
  "tests/content/section-name-markers.test.ts",
  "tests/content/spell-corrections-2014.test.ts",
  "tests/content/spells-prose-2024.test.ts",
  "tests/content/spells-source-prose-2024.test.ts",
  "tests/content/warlock-expanded-spell-lists-2014.test.ts",
  "tests/content/xdmg-chapters-import.test.ts",
];
