# KR7.3 — Відображення 2024 контенту в каталогах (заклинання, предмети, риси, бестіарій)

**Статус:** ✅ Завершено
**Дата:** 2026-08-16
**Objective:** [O7 — Сегрегація платформ та 2024-каталоги](README.md)

---

## 1. Контекст і цілі

У межах KR7.3 реалізовано повноцінне відображення, фільтрацію та пошук 2024-контенту у всіх основних каталогах:
1. **Заклинання 2024 (`/2024/spells`):** 391 заклинання PHB 2024 з фільтрацією за класами, школами, рівнями, підтримкою ритуалів/концентрації, бейджами нових/змінених заклинань (`differsFrom2014`, `kind`, `note`).
2. **Магічні предмети 2024 (`/2024/magic-items`):** 445 предметів DMG 2024 з підтримкою `typeLineEng`, умов налаштування (`attunementConditionEng`), бейджами рідкості та типів.
3. **Риси 2024 (`/2024/feats` та `/feats`):** повноцінний каталог рис (75 рис PHB 2024 та 92 риси 2014) з фільтрацією за 4 категоріями (Origin Feat, General Feat, Epic Boon, Fighting Style), вимогами, властивістю багаторазовості (Repeatable), та інтерактивною карткою деталей `FeatDetailCard`.
4. **Бестіарій 2024 (`/2024/bestiary` та `/bestiary`):** повноцінний каталог істот та духів виклику (PHB 2024 summon spirits: Beast, Fey, Undead, Elemental, Celestial, Dragon, Aberration, Construct) та базових істот 2014 року з повним блоком характеристик `CreatureStatblockCard` (КБ, ХП, швидкість, таблиця атрибутів, рятівні кидки, навички, чуття, опірності, особливості та дії).
5. **Навігація та головна сторінка 2024:** додано картку «Риси 2024» на `/2024`, посилання у випадаюче меню `NavExtraMenu` для мобільних та десктопних екранів.

---

## 2. Реалізовані компоненти та модулі

| Файл | Опис |
|---|---|
| `src/lib/featsData.ts` | Статичний завантажувач рис для `RULES_2014` (92 риси) та `RULES_2024` (75 рис) без залежності від БД під час SSG. |
| `src/components/feats/FeatDetailCard.tsx` | Картка детального перегляду риси з розбивкою переваг (benefits), вимог (prerequisites) та категорій. |
| `src/components/feats/FeatsFilterDialog.tsx` | Діалогове вікно фільтрів рис за категоріями та багаторазовістю. |
| `src/components/feats/FeatsClient.tsx` | Інтерактивний каталог рис з віртуалізацією (`Virtuoso`), категорійними табами, синхронізацією URL-параметрів та адаптивним інтерфейсом. |
| `src/app/feats/page.tsx` | Сторінка рис за правилами D&D 2014. |
| `src/app/2024/feats/page.tsx` | Сторінка рис за правилами D&D 2024 із серверною перевіркою доступу `isRules2024Allowed`. |
| `src/lib/bestiaryData.ts` | Статичний завантажувач істот і духів 2014 та 2024 років. |
| `src/components/bestiary/CreatureStatblockCard.tsx` | Повний блок характеристик істоти D&D 5e (statblock) з адаптивним макетом і темою (Amber для 2024 / Teal для 2014). |
| `src/components/bestiary/BestiaryFilterDialog.tsx` | Діалог фільтрації істот за типами. |
| `src/components/bestiary/BestiaryClient.tsx` | Інтерактивний каталог бестіарію з пошуком, фільтрами та детальною панеллю. |
| `src/app/bestiary/page.tsx` | Каталог бестіарію 2014. |
| `src/app/2024/bestiary/page.tsx` | Каталог бестіарію 2024 із серверною авторизацією. |
| `src/hooks/useCatalogUrlSync.ts` | Спільний React-хук для синхронізації фільтрів і пошуку каталогів з URL query-параметрами та popstate. |
| `src/lib/catalog-url-helpers.ts` | Утиліти для роботи з `URLSearchParams` у каталогах. |
| `src/lib/spellsData.ts` | Додано експорт полів `differsFrom2014`, `kind`, `note` для 2024-заклинань. |
| `src/components/spells/SpellDetailCard.tsx` | Відображення бейджів змін 2024 та механічних приміток. |
| `src/lib/magicItemsData.ts` | Додано підтримку полів DMG 2024 (`typeLineEng`, `attunementConditionEng`). |
| `src/lib/components/magicItems/MagicItemDetailPane.tsx` | Відображення типів DMG 2024, умов налаштування та стилю 2024. |

---

## 3. Результати тестування та валідації

- **Unit tests:** `bun run test` → 33 test files passed (272 tests).
- **Integration tests:** `bun run test:integration` → 16 test files passed (35 tests).
- **Rules coverage:** `bun run test:rules:coverage` → 95.41% statements, 97.73% lines.
- **Type safety:** `bunx tsc --noEmit` → 0 errors.
- **Linting:** `bun run lint` → 0 errors.
- **DB Boundary:** `bun run check:db-boundary` → 0 violations.
- **UI Decomposition:** `bun run check:ui-decomposition` → 0 violations (all files < 400 lines or within allowed limits).
