# KR7.2 — Архітектура сегрегації платформ та роутингу (D&D 2014 vs D&D 2024)

**Ціль:** [O7](README.md) · **Статус:** ✅ виконано · **Залежить від:** [KR7.1](kr7.1-species-traits.md)

## Мета

Створити надійну та масштабовану архітектуру розділення просторів маршрутів між D&D 5e 2014 (дефолтна редакція платформи) та D&D 5e 2024 (`/2024/*`), зберегти контекст редакції при навігації, забезпечити спільне використання компонентів каталогів без дублювання коду та зберегти суворий контроль доступу (`isRules2024Allowed`).

## Узгоджений scope

1. **Простори маршрутів та навігація:**
   - 2014 (дефолт): `/`, `/char`, `/char/home`, `/spells`, `/spells/[spellId]`, `/magic-items`, `/magic-items/[magicItemId]`, `/bestiary`, `/pers/[id]`.
   - 2024: `/2024`, `/2024/char`, `/2024/char/home`, `/2024/spells`, `/2024/spells/[spellId]`, `/2024/magic-items`, `/2024/magic-items/[magicItemId]`, `/2024/bestiary`.
   - Інтерактивний перемикач редакцій `EditionSwitcher` у бічній навігації та додатковому меню.
   - Адаптивні посилання бічної навігації, що зберігають поточний простір правил (`/spells` ↔ `/2024/spells`, `/magic-items` ↔ `/2024/magic-items`, `/` ↔ `/2024`).

2. **Контроль доступу (Access Guard):**
   - Усі серверні сторінки та layout у просторі `/2024/*` захищені перевіркою `isRules2024Allowed(session?.user)`.
   - Спроби неавторизованого доступу автоматично перенаправляються на аналог у просторі 2014 без витоку даних чи помилок.

3. **Спільні компоненти та запобігання дублюванню (DRY):**
   - Компоненти каталогів `SpellsClient` та `MagicItemsClient` використовуються спільно без клонування.
   - Виділено спільні презентаційні компоненти `SpellDetailCard` та `SpellModalCard`.
   - Хлібні крихти та модальні маршрути (`@modal/(.)[spellId]`, `@modal/(.)[magicItemId]`) синхронізовані з активною редакцією.

4. **Список персонажів (`/char/home`):**
   - Відображення бейджа `2024` для 2024-персонажів.
   - Кнопка створення враховує поточну редакцію або простір (`/2024/char` у 2024-просторі).

## Готово, коли

- [x] Дефолтні маршрути 2014 року працюють без змін.
- [x] Додано та оптимізовано простір маршрутів 2024 року (`/2024`, `/2024/char`, `/2024/char/home`, `/2024/spells`, `/2024/magic-items`, `/2024/bestiary`).
- [x] Додано `EditionSwitcher` та динамічну навігацію зі збереженням контексту редакції.
- [x] Серверний захист доступу (`isRules2024Allowed`) перевірено та захищає всі 2024-маршрути.
- [x] `tests/routes/platform-segregation.test.ts` та `tests/rules/coverage/route-helpers.test.ts` проходять успішно.
- [x] `bun run test`, `bun run test:rules:coverage`, `bunx tsc --noEmit`, `bun run lint`, `bun run check:db-boundary`, `bun run check:ui-decomposition` — зелені.

## Журнал

### 2026-08-16 — реалізація та закриття KR7.2
- Створено модуль `src/rules/route-helpers.ts` (`getEditionFromPathname`, `getRulesetFromPathname`, `getTargetEditionPath`, `get2014FallbackPath`, `canAccess2024Route`).
- Додано підтримку 2024-даних у `src/lib/spellsData.ts` (391 заклинання) та `src/lib/magicItemsData.ts` (445 предметів) з передачею параметра `ruleset`.
- Створено компонент `EditionSwitcher` (`src/components/ui/EditionSwitcher.tsx`) та інтегровано його в `Navigation.tsx` і `NavExtraMenu.tsx`.
- Створено сторінки 2024 простору: `/2024`, `/2024/char`, `/2024/char/home`, `/2024/spells`, `/2024/spells/[spellId]`, `/2024/magic-items`, `/2024/magic-items/[magicItemId]`, `/2024/bestiary`, а також базовий маршрут `/bestiary`.
- Виділено спільні компоненти `SpellDetailCard` та `SpellModalCard` для уникнення дублювання коду між 2014 та 2024 маршрутами.
- Додано бейджі редакції `2024` у `CharHomeClient.tsx` та динамічне перенаправлення створення персонажа.
- Написано тести у `tests/routes/platform-segregation.test.ts` та `tests/rules/coverage/route-helpers.test.ts`.
- Перевірено повний цикл валідації:
  - `bun run test` (32 test files, 261 tests passed)
  - `bun run test:rules:coverage` (95.41% statements, 97.73% lines, >80% threshold)
  - `bunx tsc --noEmit` (0 errors)
  - `bun run lint` (0 errors)
  - `bun run check:db-boundary` (0 violations)
  - `bun run check:ui-decomposition` (0 violations)
