import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: [
      "tests/database.test.ts",
      "tests/content/ruleset-server-filter.test.ts",
      "tests/content/creator-content-parity.test.ts",
      "tests/content/ruleset-2024-isolation.test.ts",
      "tests/content/ruleset-2024-creator.test.ts",
      "tests/content/choice-option-integrity.test.ts",
      "tests/content/species-choices-2024.test.ts",
      "tests/logic/multiclass-resolver.test.ts",
      "tests/rules/class-progression.test.ts",
      // Обидва приїхали сюди 2026-09-01: вони лежали в наборі CI і ходили в базу, через що
      // «CI без бази» (Р8 → Р32) було правдою лише на папері. `species-choices-2024` питає
      // prisma напряму; `acceptance-ten` — через `findUserDataTables` у tests/user-data.ts,
      // хоч 28 із 29 його перевірок і без того skipped.
      "tests/rules-2024/acceptance-ten.test.ts",
      // KR27.1: пʼятнадцять мультикласових персонажів — ~123 виклики `levelUpCharacter`,
      // кожен зі снапшотом і транзакцією. Бʼє по базі так само, як десятка, тому стоїть у
      // тій самій парі місць: у `DB_INTEGRATION_TEST_FILES` юніт-конфігу й тут.
      "tests/rules-2024/multiclass-fifteen.test.ts",
      "tests/actions/**/*.test.ts",
      "tests/db/**/*.test.ts",
      // KR22.5: golden створення й похідного стану не входили в жоден конфіг —
      // `bun run test tests/golden/creation.test.ts` відповідав «No test files found». Сітка
      // безпеки, яка ніде не запускається, не сітка. Левелап-golden лишається у vitest.config.mts,
      // він там уже проганявся.
      //
      // `tests/golden/content-sweep/**` сюди свідомо НЕ додано: ці шість прогонів написані в
      // KR2.1b до імпорту 2024 і сканують `prisma.<модель>.findMany()` **без фільтра редакції**,
      // тому зараз читають обидві. Виміряно 2026-08-29 на spells_test: у `feats.json` 81 ключ —
      // рівно 92 риси 2014 мінус расові обмеження, — а тест сканує 156. Расам і рисам вистачило б
      // `where: { ruleset: "RULES_2014" }`, але походженням ні: у їхньому golden 90 записів, тоді
      // як 2014 їх 75, а всього 91. Це розходження контенту, а не фільтра, і воно належить O2.
      "tests/golden/creation.test.ts",
      "tests/golden/derived-state/**/*.test.ts",
    ],
    setupFiles: ["tests/setup.ts"],
    // Замок на spells_test береться тут, а не в `setupFiles`: `globalSetup` спрацьовує один
    // раз на прогін, тож межу бачить і прямий `bunx vitest --config …`, якого
    // scripts/with-test-db-lock.sh не бачив. Замок той самий — спільний каталог у TMPDIR.
    globalSetup: ["tests/global-setup-db-lock.ts"],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
