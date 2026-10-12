# KR49.1 — URL manifest tooling

Усі команди виконуються з кореня repo. Production-код, DB, сіди, словник і build не використовуються.

## Артефакти

- `inventory-2026-09-28.json`: незмінний датований початковий зріз; 479 + 18 URL.
- `inventory.json` і старий `collect-inventory.py`: збережені як початкове дослідження; новий collector їх не перезаписує.
- `observations.json`: відтворюваний metadata snapshot. Містить HTTP status, redirects, canonical declaration, title, короткий edition evidence, посилання content region, topics і HTTP validators. Немає повних HTML, текстів статей або rating blocks.
- `review-audit-2026-09-29.json` і `review-results-2026-09-29.md/json`: metadata audit та рішення для кожного з початкових 69 review.
- `scope-overrides.json`: ручні scope рішення з доказом, якщо потрібні. Не дозволяє включити недоступне джерело чи вигадати edition evidence.
- `data/rpgbot/manifest.json`: перевірений реєстр sources. `checks` обліковує кожен URL, `aliases` не створює другий source.
- `data/rpgbot/manifest.coverage.json` / `manifest.coverage.md`: counts, unresolved review, topics і cross-edition links.

## Команди

Fixtures без мережі; пише лише Python bytecode cache:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/research/rpgbot -p 'test_*.py'
```

Продовжити мережевий обхід із checkpoint. Читає RPGbot, пише snapshot, preview, diff і coverage поруч із preview; чинний manifest не змінює:

```sh
python3 docs/research/rpgbot/build-manifest.py --live
```

Новий повний мережевий вимір у **новий** snapshot і preview, зі збереженням попереднього зрізу:

```sh
python3 docs/research/rpgbot/build-manifest.py --live \
  --snapshot /tmp/rpgbot-new-observations.json \
  --output /tmp/rpgbot-new-manifest.json
```

`--refresh` перечитує всі сторінки у вказаному snapshot; `--recheck-unconfirmed` перечитує тільки HTTP 200 без підтвердженої редакції. Не використовувати їх для обходу robots або антибота. Звичайний `--live` відновлює checkpoint і перевіряє актуальні robots та sitemap; snapshot також зберігає всі історично знайдені candidates; нова scope policy не видаляє їх з обліку. Cached checks зберігають свої фактичні дати, а не видаються за повторні HTTP-перевірки.

Replay без мережі, чинний manifest лише читає для збереження IDs і diff:

```sh
python3 docs/research/rpgbot/build-manifest.py \
  --output /tmp/rpgbot-replay.json
```

За однакового snapshot, scope policy, overrides і previous manifest результат детермінований; diff має порожні added/removed/changed. `--previous` задає інший baseline. Для публікації нового локального реєстру після перегляду preview:

```sh
python3 docs/research/rpgbot/build-manifest.py \
  --output data/rpgbot/manifest.json
```

Це явний запис локального manifest. Немає commit/push або background job.

## Scope і перевірки

Свіжі page/post sitemap додають кандидатів усередині `/dnd5/` і `/2024-dnd/`; початкові кандидати зберігаються навіть після зникнення з sitemap. Обхід читає посилання тільки з `.entry-content`, без scripts/styles/navigation/aside/footer. Загальні меню й sitemap інших систем не обходяться.

Корені обходу: `/dnd5/`, `/2024-dnd/`. Для посилань із їхнього content region додатково дозволені кореневі статейні paths RPGbot; конкретний вкладений external path задається `ROOT_ALLOWLIST`. Це потрібно для aliases, builds і тематичних матеріалів, які RPGbot публікує без DnD-префікса. Новини, подкасти, playtests, change logs, загальні how-to-play tutorials поза `CHARACTER_TUTORIALS`, суто рольова гра, DM-only (з явними винятками `DM_CHARACTER_ALLOWLIST`) і сторінки інших систем мають явні scope exclusions і не розширюють граф. Невідомий матеріал поза основними коренями лишається review до змістовної перевірки.

Переглядові сторінки також читаються для замикання графа й уточнення scope; це не робить їх included. Canonical/final цілі перевіряються окремо; canonical chains дедуплікуються до terminal source. Неузгоджений чи неперевірений canonical лишається review. Query tracking і fragments не створюють articles; raw redirects лишаються в checks. Canonical aliases не змінюють sourceId при replay; при переміщенні старий ID зберігається через previous aliases. Об’єднання sources зберігає ID terminal source, якщо він уже існував.

Source entry має `rulesets` для підтвердженого source scope. Для single edition `ruleset` дорівнює 2014 або 2024; для явно shared source — null, `rulesets: [2014, 2024]`, `editionPolicy: preserve-section-edition-context`. Shared sources рахуються один раз і не переносять оцінки між редакціями.

Edition evidence: явне article notice, notice про Character Optimization Meta або явна 2014/2024/5.5 у назві. Суперечливі notice і явно датована назва дають review. Загальний “DnD 5e” чи URL-префікс самі по собі не підтверджують редакцію. Лише вручну перевірені явні edition section headings або cross-edition source references можуть підтвердити shared source. Самі links/breadcrumbs/date цього не роблять; частково mixed guides лишаються review до секційної звірки.

Robots читається при кожному live запуску; його недоступність зупиняє crawl. Перевіряється кожна redirect target; off-domain targets не запитуються. Правила зіставляються за найспецифічнішим шляхом, Allow виграє за однакової довжини; підтримані `*` і `$`. Мінімальна пауза між початками запитів — max(1 s, `--delay`, robots Crawl-delay). Максимум два запити одночасно, один спільний rate limit. HTTP 429 зберігає checkpoint і зупиняє прогін; challenge/login/403 не обходяться. Retry-after не використовується для автоматичного retry.

Fixtures перевіряють normalization, edition notices, scoped HTML links, sitemap filtering, graph cycles та unsitemapped pages, robots на кожному redirect hop, loops/off-domain redirects, canonical chains, deduplication, stable IDs, empty replay diff, edition conflicts, замикання графа included links і заборону unverified included.

Words/sections/tables/ratingBlocks лишаються unknown до наданого повнотекстового корпусу. Виявлені topics не є текстовими метриками чи готовими build recipes. `thirdPartySignals` — сигнали для майбутньої ручної перевірки видавців, не повний publisher registry. Entity bindings належать KR49.2.


## Повторна перевірка review

Read-only мережевий audit зі спільним rate limit і robots; оновлює metadata snapshot,
але не manifest. HTML лишається в пам’яті; temporaryContexts виводяться лише для
ручного огляду, у JSON не зберігаються. Dated audit зберігає список усіх початкових
69 URL, тому resume не втрачає вже вирішені випадки:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/research/rpgbot/audit-reviews.py
```

`--recheck URL` перечитує конкретний URL із цього dated audit. `--audit-file /tmp/new-review-audit.json`
створює новий audit із поточних review записів. Після перевірки оновити scope-overrides,
побудувати preview/diff та лише після перевірки записати manifest. `editionMentions` —
лише diagnostic hints; вони можуть включати дату публікації чи breadcrumb.

Notice можна знайти в article/main поза `.entry-content`; content links при цьому
залишаються обмеженими `.entry-content`. За відсутності `rel=canonical` можна підтвердити
publisher URL тільки через явний `og:url`, що точно збігається з фактичною HTTP final
адресою. Це зберігається як `canonicalBasis: publisher-og-url-confirmed-by-http-final`;
наявна зовнішня чи суперечлива rel canonical declaration не замінюється og fallback.
