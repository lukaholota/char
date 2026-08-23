# KR9.3 — SSG-сторінки окремих сутностей (Зброя, Обладунки, Вливання Винахідника, Відозви Чорнокнижника)

**Ціль:** [O9 README](README.md) · **Статус:** ✅ закрито 2026-08-17

## Мета

Створити повноцінні індивідуальні SSG-сторінки для всіх сутностей з підтримкою:
- Статичної генерації (`generateStaticParams`) для 2014 та 2024 редакцій.
- Динамічних SEO-метаданих (`generateMetadata`) та OpenGraph розмітки.
- Роутингу на базі канонічних англійських kebab-case slug'ів, числових ID, кодів та українських назв.
- Сегрегації та захисту редакцій (2014 публічні за замовчуванням, 2024 із контролем доступу `isRules2024Allowed`).
- Оновлення карти сайту `sitemap.ts` для включення всіх SSG URL.

---

## Що зроблено

1. **Утиліти та доступ до даних**:
   - `src/lib/slug-utils.ts`: функція `toEntitySlug(text: string): string` для приведення назв сутностей до URL-сумісного формату (наприклад, `longsword`, `hand-crossbow`, `studded-leather`, `enhanced-defense`, `replicate-bag-of-holding`, `agonizing-blast`).
   - `src/lib/weaponsData.ts`: розширено `getWeaponByIdOrSlug` підтримкою `toEntitySlug`.
   - `src/lib/armorData.ts`: розширено `getArmorByIdOrSlug` підтримкою `toEntitySlug`.
   - `src/lib/infusionsData.ts`: розширено `getInfusionByIdOrSlug` підтримкою `toEntitySlug`.
   - `src/lib/invocationsData.ts`: розширено `getInvocationByIdOrSlug` підтримкою `toEntitySlug`.

2. **SSG-сторінки 2014 редакції (публічні)**:
   - `src/app/weapons/[slug]/page.tsx`: SSG для 48 видів зброї (по 2 маршрути на сутність: slug та ID), динамічні метадані з категорією, шкодою та типом.
   - `src/app/armor/[slug]/page.tsx`: SSG для 19 видів обладунків та щитів, динамічні метадані з базовим КБ, вагою та вартістю.
   - `src/app/infusions/[slug]/page.tsx`: SSG для 66 вливань винахідника (TCoE), динамічні метадані з мінімальним рівнем та описом.
   - `src/app/invocations/[slug]/page.tsx`: SSG для 50 таємничих відозв чорнокнижника, динамічні метадані з вимогами та описом.

3. **SSG-сторінки 2024 редакції (захищені перепусткою)**:
   - `src/app/2024/weapons/[slug]/page.tsx`: SSG для 38 видів зброї 2024 з властивостями Майстерності зброї (Weapon Mastery) та захистом `isRules2024Allowed`.
   - `src/app/2024/armor/[slug]/page.tsx`: SSG для 14 видів обладунків 2024 та захистом `isRules2024Allowed`.
   - `src/app/2024/invocations/[slug]/page.tsx`: SSG для 31 відозви 2024 та захистом `isRules2024Allowed`.

4. **Sitemap (`src/app/sitemap.ts`)**:
   - Додано всі канонічні посилання для 2014 зброї (`/weapons/[slug]`).
   - Додано всі канонічні посилання для 2014 обладунків (`/armor/[slug]`).
   - Додано всі канонічні посилання для 2014 вливань (`/infusions/[slug]`).
   - Додано всі канонічні посилання для 2014 відозв (`/invocations/[slug]`).

5. **Тестування та верифікація**:
   - Створено `tests/content/entity-pages-ssg.test.ts` (21 тест, що перевіряє утиліти slug, `generateStaticParams`, `generateMetadata`, варіативність `getByIdOrSlug`, захист редакцій та повноту `sitemap.ts`).

---

## Журнал верифікації

- `bun run test` — ✅ green (43 test files, 364 tests passed).
- `bunx tsc --noEmit` — ✅ green (0 errors).
- `bun run lint` — ✅ green (0 errors).
- `bun run check:db-boundary` — ✅ green (0 violations, 452 modules cruised).
- `bun run check:ui-decomposition` — ✅ green (0 violations).
