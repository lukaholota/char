# KR9.2 — Нові каталоги сутностей (Зброя, Обладунки, Вливання Винахідника, Відозви Чорнокнижника)

**Ціль:** [O9 README](README.md) · **Статус:** ✅ закрито 2026-08-17

## Мета

Створити повноцінні каталоги для сутностей D&D 5e (2014 та 2024 редакцій) на базі уніфікованого шаблону `ContentListPage`:
- **Зброя (Weapons)**: 2014 (48 предметів) та 2024 (38 предметів із тактичними властивостями Weapon Mastery).
- **Обладунки (Armor)**: 2014 (13 стандартних обладунків та щит) та 2024 (13 стандартних обладунків та щит із правилами надягання).
- **Вливання Винахідника (Artificer Infusions)**: 2014 (66 канонічних вливань з TCoE).
- **Відозви Чорнокнижника (Eldritch Invocations)**: 2014 (50 відозв) та 2024 (31 відозва PHB 2024).

---

## Що зроблено

1. **Генерація та валідація статичних датасетів**:
   - `src/lib/generated/weapons.json` (48 видів зброї 2014, з `weaponSeed.ts`).
   - `data/2024/normalized/weapons.json` (38 видів зброї 2024 з властивостями Weapon Mastery, перекладеними з `dictionary.json`).
   - `src/lib/generated/armor.json` (19 записів 2014, включаючи 13 стандартних комплектів та щит з `armorSeed.ts`).
   - `data/2024/normalized/armor.json` (13 стандартних 2024 комплектів обладунків та щит з правилами надягання).
   - `src/lib/generated/infusions.json` (66 вливань винахідника з `infusionSeed.ts`, `infusionFeaturesSeed.ts` та `magicItemSeed.ts`).
   - `src/lib/generated/invocations.json` (50 таємничих відозв 2014 з `classFeatureSeed.ts` та `choiceOptionSeed.ts`).
   - `data/2024/normalized/invocations.json` (31 відозва 2024 з PHB 2024).

2. **TypeScript Data Access шари**:
   - `src/lib/weaponsData.ts`: `getAllWeapons(ruleset)`, `getWeaponById(id, ruleset)`, `getWeaponByIdOrSlug(idOrSlug, ruleset)`.
   - `src/lib/armorData.ts`: `getAllArmors(ruleset)`, `getArmorById(id, ruleset)`, `getArmorByIdOrSlug(idOrSlug, ruleset)`.
   - `src/lib/infusionsData.ts`: `getAllInfusions()`, `getInfusionById(id)`, `getInfusionByIdOrSlug(idOrSlug)`.
   - `src/lib/invocationsData.ts`: `getAllInvocations(ruleset)`, `getInvocationById(id, ruleset)`, `getInvocationByIdOrSlug(idOrSlug, ruleset)`.

3. **Візуальні компоненти та дизайн-система**:
   - Оновлено `src/components/catalogs/catalog-visuals.ts` функціями:
     - `getWeaponVisual(weaponType, isRanged)` (іконки Swords, Sword, Target, Crosshair).
     - `getArmorVisual(armorType)` (іконки ShieldCheck, Shield, Layers).
     - `getInfusionVisual(targetType)` (іконки Sword, Shield, Sparkles, Wrench).
     - `getInvocationVisual(pact, minLevel)` (іконки Sword, BookOpen, PawPrint, Crown, Eye).
   - Реалізовано клієнтські каталоги та модальні/детальні картки:
     - `src/components/weapons/*`: `WeaponsClient`, `WeaponDetailCard`, `WeaponsFilterDialog`.
     - `src/components/armor/*`: `ArmorClient`, `ArmorDetailCard`, `ArmorFilterDialog`.
     - `src/components/infusions/*`: `InfusionsClient`, `InfusionDetailCard`, `InfusionsFilterDialog`.
     - `src/components/invocations/*`: `InvocationsClient`, `InvocationDetailCard`, `InvocationsFilterDialog`.

4. **Маршрути та навігація**:
   - Додано сторінки:
     - `/weapons` та `/2024/weapons`
     - `/armor` та `/2024/armor`
     - `/infusions`
     - `/invocations` та `/2024/invocations`
   - Оновлено навігаційне меню `src/components/ui/NavExtraMenu.tsx` (з декомпозицією `NavMenuItems` для відповідності архітектурним лімітам).
   - Додано картки на головну 2024 сторінку `src/app/2024/Home2024Client.tsx`.
   - Додано нові шляхи до `src/app/sitemap.ts`.

5. **Тестування та якість**:
   - Створено `tests/content/new-catalogs.test.ts` (14 тестів, що покривають обсяг, структуру, переклади, фільтри та візуали для всіх 4 каталогів).
   - Перевірено відсутність витоків правил та повну ізоляцію 2014/2024.

---

## Журнал верифікації

- `bun run test` — ✅ green (42 test files, 343 tests passed).
- `bunx tsc --noEmit` — ✅ green (0 errors).
- `bun run lint` — ✅ green (0 errors).
- `bun run check:db-boundary` — ✅ green (0 violations, 444 modules cruised).
- `bun run check:ui-decomposition` — ✅ green (0 violations).
