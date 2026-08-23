# KR9.1 — Доповнення каталогу магічних предметів 2014 (400+ предметів з dnd-data)

**Ціль:** [O9 README](README.md) · **Статус:** ✅ закрито 2026-08-17

## Мета

Розширити базу магічних предметів 2014 року з 248 до 400+ канонічних предметів (DMG 2014, Basic Rules 2014, XGtE, TCoE через `dnd-data` та нормалізовані джерела) з валідацією типів, рідкостей, налаштувань, 2014-механік описів та термінологією за `dictionary.json` і `translation.ts`.

---

## Що зроблено

1. **Нормалізація та злиття даних (472 магічні предмети 2014)**:
   - Збережено всі 248 наявних 2014-предметів з `src/lib/generated/magicItems.json` та їхні стабільні ID.
   - Додано 224 нових канонічних 5e 2014 магічних предмети з корпусу DMG/`dnd-data`.
   - Забезпечено чисту термінологію правил 2014 року в описах (усунуто залишки 2024-специфічних дій, як-от «Магічна дія» → «дія», «Дія Застосування» → «дія»).
   - Усі назви уніфіковано за стандартом `Українська назва [English Name]`.
   - Усі типи приведені до Prisma enum `MagicItemType` (`WEAPON`, `ARMOR`, `WONDROUS_ITEM`, `POTION`, `SCROLL`, `RING`, `WAND`, `ROD`, `STAFF`).
   - Усі рідкості приведені до Prisma enum `ItemRarity` (`COMMON`, `UNCOMMON`, `RARE`, `VERY_RARE`, `LEGENDARY`, `ARTIFACT`).

2. **Оновлення сідів та статичних артефактів**:
   - `src/lib/generated/magicItems.json` оновлено до 472 предметів, відсортованих за українським алфавітом.
   - `prisma/seed/magicItemSeed.ts` повністю оновлено для відтворюваності в БД з типами `Prisma.MagicItemCreateInput`.
   - `src/lib/magicItemsData.ts` надає швидкий доступ через `getAllMagicItems("RULES_2014")` та `getMagicItemById`.

3. **Сумісність з UI та каталогами**:
   - Каталог `/magic-items` на базі уніфікованого `ContentListPage` відображає всі 472 предмети з фільтрацією за типом, рідкістю, налаштуванням та повнотекстовим пошуком.
   - Візуальні іконки та бейджі (`getMagicItemTypeVisual`, `getMagicItemRarityBadge`) у `catalog-visuals.ts` коректно обслуговують усі типи та рідкості.
   - Детальні картки `/magic-items/[magicItemId]` та модальні вікна `@modal/(.)[magicItemId]` підтримують усі нові предмети.

4. **Тестування та валідація**:
   - Створено `tests/content/magic-items-2014.test.ts` (7 тестів):
     - Обсяг каталогу 2014 >= 400 (фактично 472).
     - Унікальність `engName` та `magicItemId`.
     - Відповідність формату `Українська назва [English Name]`.
     - Валідність `MagicItemType` та `ItemRarity`.
     - Відсутність 2024-фраз в описах 2014.
     - Тест керованого падіння (Controlled-red) проведено та підтверджено.

---

## Журнал верифікації

- `bun run test` — ✅ green (усі юніт-, контентні та репозиторні тести пройшли).
- `bunx tsc --noEmit` — ✅ green.
- `bun run lint` — ✅ green (0 errors).
- `bun run check:db-boundary` — ✅ green (no dependency violations).
- `bun run check:ui-decomposition` — ✅ green (всі ліміти дотримані).
