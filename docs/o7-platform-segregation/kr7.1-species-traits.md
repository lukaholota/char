# KR7.1 — Переклад та засівання описів рис 2024 видів (Species Traits)

**Ціль:** [O7](README.md) · **Статус:** 🔄 в роботі · **Залежить від:** [KR6.3](../o6-rules-2024-import/kr6.3-implementation.md)

## Мета

Перекласти українською мовою описи всіх рис (traits) для 10 видів 2024 (Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling) за термінологією `dictionary.json`, оновити `prisma/seed/raceSeed2024.ts` для створення `Feature` з `ruleset = RULES_2024` та прив'язки через `RaceTrait` до відповідних 2024-видів.

## Узгоджений scope

1. **Переклад описів рис:**
   - Додати українське поле `description` до кожної риси у `data/2024/normalized/species.json`.
   - Забезпечити повну відповідність термінів (типи дій, ряткидки, типи шкоди, стани, характеристики, відпочинки).

2. **Оновлення сідеру `raceSeed2024.ts`:**
   - Для кожної риси виду створювати або оновлювати запис у таблиці `Feature` (`ruleset = RULES_2024`, `displayType = [PASSIVE]`, унікальний `engName = "${sp.engName}: ${trait.engName} (2024)"`).
   - Для кожного 2024-виду створювати зв'язки в таблиці `RaceTrait` (`ruleset = RULES_2024`).

3. **Верифікація:**
   - Написати валідаційний тест на наявність та коректність перекладу всіх рис 10 видів.
   - Перевірити роботу `RaceInfoModal` (відображає назви та описи рис замість заглушки "Для цієї раси ще немає опису рис.").

## Готово, коли

- [x] Усі риси 10 видів у `data/2024/normalized/species.json` мають валідний український опис `description`.
- [x] `prisma/seed/raceSeed2024.ts` засіває `Feature` та `RaceTrait` з `ruleset = RULES_2024`.
- [x] `tests/content/species-traits-2024.test.ts` проходить успішно.
- [x] `bun run test`, `bun run test:rules:coverage`, `bunx tsc --noEmit` та `bun run lint` зелені.

## Журнал

### 2026-08-16 — виконання та завершення KR7.1
- Створено Objective O7 та `kr7.1-species-traits.md`.
- Перекладено всі описи рис для 10 видів PHB 2024 у `data/2024/normalized/species.json` за термінологією `dictionary.json`.
- Оновлено `prisma/seed/raceSeed2024.ts` для створення/оновлення `Feature` (`ruleset = RULES_2024`) та зв'язування їх через `RaceTrait` з 2024-видами.
- Створено валідаційний тест `tests/content/species-traits-2024.test.ts` (30 тестів у 30 файлах проходять).
- Перевірено повний набір: `bun run test` (245 тестів passed), `bun run test:rules:coverage` (95.46% stmts, 97.95% lines), `bunx tsc --noEmit` (0 помилок), `bun run lint` (0 помилок).

