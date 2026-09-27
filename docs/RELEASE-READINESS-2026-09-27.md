# Готовність staged-пакета до деплою — 2026-09-27

**Висновок:** перед деплоєм потрібно додати актуальні версії пʼяти generated-каталогів.
Сіди, новий DDL, ремонт персонажів і нові deployment secrets для цього пакета не потрібні.
Перевірено staged index відносно `HEAD 8ddda3d`; код та індекс під час аудиту не змінювалися.
Деплой не запускався. Звіт — новий unstaged документ.

| Зміни | Доставка |
|---|---|
| PostHog, аватарки й події функцій | Звичайний деплой. Дашборди вже налаштовані; ключі вже є в CI |
| KR48.6/48.7: вибір заклинань 2014 і пропущений вибір на левелапі | Звичайний деплой. Використовуються наявні таблиці й кандидати; масовий ремонт персонажів для цих кроків не потрібен |
| Підказки конструктора/левелапу, «Під час атаки», пошук за engName, інструменти, картки предметів | Звичайний деплой; тексти, взяті зі статичних каталогів, потребують оновлення JSON нижче |
| Модалки, історія URL, фільтри, popstate, повідомлення про старі server actions | Звичайний деплой. Модель history перевірена у jsdom; браузерні заміри Chromium/WebKit попередньої сесії описані в журналі performance |
| PDF 2024, нові написи та NotoSans-SemiBold.ttf | Шрифт уже staged, Docker копіює public. Ручна генерація шрифтів/шаблона не потрібна; PDF інтеграція пройшла |
| Тексти рис 2014 та маневри 2024 | Продова БД уже збігається зі staged-джерелами; повторний сід не потрібен. Generated JSON відстають |
| SQL orphan-maneuver-options-2014 | У проді 0 рядків цієї групи. Повторне виконання не потрібне; SQL — журнал вже виконаної зачистки |
| Dev output dir, dev:owner, документація | Production використовує .next за відсутності NEXT_DEV_DIST_DIR. Нових runtime env/schema змін немає |

## Пʼять потрібних файлів

1. `src/lib/generated/classes.json` — зокрема опис Fancy Footwork.
2. `src/lib/generated/races.json` — тексти драконячих міток.
3. `src/lib/generated/invocations.json` — Improved Pact Weapon.
4. `src/lib/generated/creator-content-2014.json` — тексти рис, короткі описи й актуальний граф.
5. `src/lib/generated/creator-content-2024.json` — 20 описів маневрів і шість оновлених типів дії.

Їх перегенеровано **з продової БД** тільки в ізольованій копії staged index:
`/tmp/char-release-stage-9ypyayx9`. Джерелом був `spells`, PostgreSQL connections примусово
read-only. Перегенерація обмежена classes, races, invocations і creator-content.
Перевірено: всі верхні та вкладені ID/їх кількості збережені; кількості рядків не зменшилися;
оновлені поля збігаються з джерелами; обидва creator-content повністю збігаються з живим графом.

Готовий patch: `/tmp/char-release-stage-9ypyayx9/catalog-regeneration.patch`.
`git apply --check` до основного дерева пройшов. Patch **не застосовано** до робочого дерева
і generated-файли **не staged** цим аудитом. Перед commit/deploy потрібно додати їх до пакета.
Тимчасова копія й patch можуть бути видалені ОС; вони не замінюють закомічені артефакти.

Для повторної генерації: `generate:classes`, `generate:races`, `generate:invocations` і
`generate:creator-content`. Перші генератори віддають перевагу TEST_DATABASE_URL, тому перед
продовою генерацією потрібні **DATABASE_URL з .env для spells та порожній TEST_DATABASE_URL**;
creator-content має явний `--target prod`. Не генерувати committed IDs із тестового клона.

## Фактичні перевірки

- Жива БД: previews `seed:class-feature-text:prod` і `seed:swept-term-text:prod` без --apply —
  0 розбіжностей. Окрема read-only перевірка — 35 рис і 20 назв опцій без drift, orphan група — 0.
- TypeScript — exit 0. UI decomposition — exit 0. DB boundary — exit 0, два відомі warnings
  в class-actions/feat-spell-actions, 0 errors.
- ESLint точного staged-дерева — exit 0, 152 warnings, 0 errors. Початковий lint основного
  дерева впав, бо захопив .next-owner; після виключення .next-* — 0 errors. CI checkout
  не містить цих локальних build-каталогів. Це не падіння lint production sources.
- `test:no-db` — 438 файлів, **3291 тест** пройшли; локальний HTTP bind дозволено.
- Rules coverage — 101 файл, **885 тестів**; statements 86.82%, branches 80.14%, functions
  86.77%, lines 87.87%; configured thresholds пройдено.
- Інтеграція на локальному PG17, worker copies (4): 7 файлів, **71 тест** пройшов —
  player-chosen spells, attack riders, subclass choices persistence, descriptions, PDF,
  creator parity. File-duration guard пройдено.
- Кандидат з пʼятьма перегенерованими каталогами: frozen-lockfile install, Prisma generate
  із мертвою DB URL, **next build exit 0**, усі **4071** static pages згенеровані.
  Build у /tmp, без prod DB та без Sentry upload; PostHog/Sentry public values — тестові
  placeholders, бо локально їх немає. Це перевірка компіляції, а не prod telemetry.
- GitHub API: потрібні NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_POSTHOG_KEY/HOST,
  NEXT_PUBLIC_SENTRY_DSN існують серед secrets за назвами. Значення не читалися.
  Останній workflow Checks → Image → Deploy для 8ddda3d — success, 2026-09-26 21:22 UTC.

**Межі:** новий staged-пакет ще не пройшов production deployment. Свіжого browser-перегляду
після цього build не було; Android-приймання popstate фікса власником лишається окремою
перевіркою після викатки. Докази старої browser-сесії —
[журнал](performance/2026-09-26-spell-modal-close/README.md).

# Code review: deployment-facing staged changes

## Summary

Для reviewed persistence, edition selection, browser-history і telemetry змін немає
підтвердженої помилки, яка вимагає нового DDL/сіду. Повний пакет потребує доставки каталогів.
Counts: 1 critical, 0 important, 1 nit.

## Critical findings

- `src/lib/generated/creator-content-2024.json` — incomplete delivery: «Evasive Footwork»
  має старий PASSIVE, тоді як живий сід/source вже дає BONUSACTION; загалом 20 описів і шість
  displayType відстають. 2014 каталоги також відстають. Fix: включити пʼять перевірених
  generated-файлів із patch у commit перед деплоєм.

## Nits

- `src/lib/router-popstate-filter.ts:3` — comment formatting: довгий блок «Next на кожен
  popstate…» дублює пояснення в performance журналі. Fix: залишити короткий коментар про
  нетривіальну вимогу порядку listener і посилання на журнал. На готовність деплою не впливає;
  під час read-only review код не редагувався.

## Coverage

- Section A (naming & functions): deployment-facing coordinators reviewed; no blocking finding.
- Section B (comments & formatting): nit above.
- Section C (SOLID): edition-specific rule lookup and DB boundaries reviewed; no new blocker.
- Section D (DRY/KISS/YAGNI): shared row builders/filters reused; no new blocker.
- Section E (AI failure modes): missing generated delivery above; library calls, caught telemetry
  failures and explicit success/rollback paths checked against installed code and test results.
