# Аналітика продукту в PostHog

Поведінкові дашборди, cohorts, аудит обмежень і висновки станом на 2026-10-01:
[Activation, retention і lifecycle](POSTHOG-BEHAVIORAL-ANALYTICS.md).

Вимір і налаштування: **2026-09-27**. Проєкт EU **245714**, часовий пояс **Europe/Kyiv**.
Створено 5 закріплених дашбордів із 46 графіками; типовий період — останні 24 години.
Період змінюється зверху дашборда. KPI компактні, funnels займають повну ширину.

Дашборди вже збережені та перевірені через API. Код analytics v2 підготовлений у робочому
дереві; у межах цього завдання його **не комічено, не пушено й не задеплоєно**.
Нові події почнуть надходити після деплою. Порожній графік нової події до цього не доводить,
що функцією ніхто не користується.

| Дашборд | Що показує |
|---|---|
| [Аудиторія та каталоги](https://eu.posthog.com/project/245714/dashboard/977947) | Популярність розділів, pie 2014/2024 та no-ai, OS, пристрої, країни, міста, pie розмірів екрана та груп ширини, джерела переходів |
| [Персонажі](https://eu.posthog.com/project/245714/dashboard/977948) | Усі нові записи, саме нові персонажі, копії та історія, нові проти левелапів, редакції, funnel конструктора, завантаження кастомних аватарок, динаміка та кількість користувачів |
| [Хоумбрю](https://eu.posthog.com/project/245714/dashboard/977949) | Вкладки заклинань/істот і перемикання, окремі funnels створення, етапи виходу, помилки публікації, збереження |
| [Пошук і функції листа](https://eu.posthog.com/project/245714/dashboard/977950) | Пошук, категорії вибраних результатів, порожні результати, Дика форма, Лють/Пісня клинка й інші активні риси, виснаження, бафи, концентрація, редагування описів |
| [Онбординг](https://eu.posthog.com/project/245714/dashboard/977951) | Відкриття/закриття «Що нового», охоплення слайдів, послідовний funnel та досягнення останнього слайда |
| [Char · RPGbot](https://eu.posthog.com/project/245714/dashboard/999834) | Охоплення й залучення, читання статей, аналіз підкласів, готові персонажі, рекомендації заклинань. Типово 30 днів; критерії успіху — [launch-success-metrics](o49-rpgbot-analysis/launch-success-metrics.md). Створено 2026-10-06; події з’являться після деплою |

## Визначення метрик

- Популярність, редакції, no-ai та пристрої — частки **переглядів сторінок**, а не людей.
  `/no-ai` та `/2024` видаляються перед групуванням; усі `/char/*` і старі `/pers/*`
  належать `char`. Зміни тільки query-параметрів не створюють новий pageview.
- `character_created` — успішно збережений новий персонаж. Старий клієнтський capture
  замінено серверним: один успіх дає одну подію.
- `character_copied` — успішна ручна копія, копія з папки або за спільним посиланням.
  Папка з кількома персонажами дає подію для кожного скопійованого персонажа.
- `character_snapshot_created` — збережена копія для історії. Левелап створює таку копію;
  `character_leveled_up` окремо означає успішне завершення самого підвищення рівня.
  «Усі створені записи» = нові + копії + копії для історії. Левелап повторно не додається.
- `custom_avatar_uploaded` — успішно збережений власний портрет персонажа, включно із
  заміною. Видалення та копіювання персонажа з уже наявним портретом сюди не входять.
- Homebrew funnel: `homebrew_create_clicked` → `homebrew_form_opened` →
  `homebrew_form_started` → `homebrew_submit_attempted` → `homebrew_saved`.
  Перше натискання враховує і незалогінених. Прямий перехід на форму оминає перший крок.
  Funnels окремі для `SPELL` та `CREATURE`, лише `mode=create`; редагування не домішується.
  Подія виходу містить етап: opened, editing, submitted або rejected.
- Пошук фіксується після 700 мс без зміни запиту/результатів; поки серверний пошук
  персонажів і хоумбрю не відповів, видача не вважається остаточною. `result_count` — число
  показаних результатів, а категорії популярності — категорії реально вибраних результатів.
  Текст запиту, назви персонажів та користувацькі описи не передаються.
- Дика форма фіксує успішне додавання форми та перевтілення. Риси — увімкнення/вимкнення
  з `engName`; графік популярності враховує тільки увімкнення. Виснаження — вибраний рівень.
  Офлайн-зміни листа, прийняті в чергу, мають `queued=true`: це використання функції,
  а не підтвердження завершеної синхронізації.
- Звичайні стани на кшталт отруєння не мають кнопки накладання в поточному листі.
  Вимірюються наявні бафи та виснаження; читання правила стану не означає його накладання.
- Онбординг — наявний діалог «Що нового», поточний реліз `whats-new:2026-09`.
  Свайпи та точки навігації враховуються. Строгий funnel вимагає переглянути всі слайди
  по порядку; графік охоплення та funnel до останнього слайда також бачать перестрибування.
  Закриття діалогу не означає завершення перегляду.

## Виключення, історія та точність

Власник `lukagolota1@gmail.com` (ID 5) та QA `qa-browser@char.holota.family` (ID 967)
позначені в PostHog як внутрішні. Увімкнено типовий фільтр тестових акаунтів проєкту й
фільтр у збережених insights. Нові дашборди також явно виключають обидва distinct ID,
відповідні person ID та прапорці внутрішніх користувачів. Це прибирає історичні анонімні
ідентифікатори, які PostHog уже привʼязав до цих акаунтів. Непривʼязані старі анонімні
відвідування неможливо надійно віднести до власника/QA.

Новий SDK чекає завершення перевірки сесії; для цих акаунтів не ініціалізується й не
надсилає події. Сервер використовує той самий список, включно з конфігурованою
`QA_CREDENTIALS_EMAIL`. Email не передається в PostHog. API-перевірка історичних подій і
профілів не виявила email; для виключення використовуються відомі ID та внутрішні прапорці.

Історично доступні pageviews, `character_created`, відкриття/закриття «Що нового».
Копії, левелапи, аватарки, homebrew, пошук, функції листа та глибина слайдів раніше не
трекалися відповідними подіями: точних історичних графіків для них немає.
Старі `/char/<id>` без `edition` показуються як «Невідомо (старі листи)».
Нові перегляди спільного маршруту листа чекають фактичної редакції персонажа.

Persistence лишається `memory`: анонімний користувач після перезавантаження чи нової
вкладки має новий distinct ID. «Відвідувачі» тому не є точною кількістю людей; funnels
анонімних користувачів можуть обриватися при перезавантаженні. GeoIP країни та міста
доступні, але приблизні й залежать від VPN. Серверні події вимикають GeoIP, щоб не
приписувати користувачам місцезнаходження VPS.

## Доставка без очікування в основному флоу

Клієнтський `capturePostHogEvent` повертає `void` та тільки додає невелику подію до черги.
SDK завантажується й черга обробляється у `requestIdleCallback` (з наявним fallback).
SDK шле події через `fetch` з `keepalive` (`api_transport: "fetch"`), а не `sendBeacon`:
ендпоінт `/i/v0/e/` відповідає 400 на beacon-тіло, а `keepalive` так само переживає закриття вкладки.
Явні captures ідуть із `send_instantly: true`.
gzip, autocapture, session recording, heatmaps, dead clicks і web vitals вимкнені.

Серверні captures повертають `void`; авторизація й мережевий fetch виконуються у
Next.js `after()` після відповіді, з таймаутом 1,5 с. Події завершення плануються після
успішного збереження в БД. Помилка аналітики не перетворює збережену дію на помилку
користувача. Основний флоу не очікує аналітику.

Beacon та фонова доставка є best effort: ad blockers, закриття до завантаження SDK,
відсутність мережі або завершення серверного процесу можуть втратити подію. Це не
фінансовий журнал і не гарантована доставка. Мінімальні витрати CPU на постановку в
чергу й серіалізацію залишаються; твердження про буквально нульовий вплив не робиться.
У `development` і `test` клієнт та сервер вимкнені через `NODE_ENV`, незалежно від ключів.

## Адміністрування та перевірки

`POSTHOG_TOKEN` — особистий API token тільки для адміністративного скрипта; не потрапляє
до браузера. Застосунок використовує наявні `NEXT_PUBLIC_POSTHOG_KEY` і
`NEXT_PUBLIC_POSTHOG_HOST`, які Next.js вбудовує при build і для серверного коду.

```sh
# Читає дані й виконує запити через PostHog API, не надсилає capture-подій.
bun scripts/setup-posthog-dashboards.ts validate
# Оновлює позначені char-analytics-v2 дашборди/insights, внутрішні профілі та defaults.
# Записує локальний docs/posthog-dashboards.json; не видаляє чужі дашборди.
bun scripts/setup-posthog-dashboards.ts apply
# Перечитує збережені дашборди й порівнює період та всі задані поля запитів.
bun scripts/setup-posthog-dashboards.ts verify
```

Визначення графіків: [posthog-dashboard-queries.ts](../scripts/posthog-dashboard-queries.ts).
Фактичні ID: [posthog-dashboards.json](posthog-dashboards.json).

Перевірено:

- 46 реальних PostHog запитів виконуються; збережені запити й останні 24 години звірені API.
- TypeScript, вибрані ESLint-перевірки, UI decomposition та DB boundary (два старі
  попередження у class-actions/feat-spell-actions; нових порушень немає).
- 63 тести monitoring: маршрути, dev/test, owner/QA, lazy SDK, beacon на справжньому SDK,
  ізоляція його збою та серверний `after()` з fetch, який не завершується одразу.
- Повний `test:no-db`: 3285 тестів пройшли, 4 локальні HTTP smoke-тести впали через
  sandbox `EPERM` на bind 127.0.0.1; окремий повтор із дозволеним bind — 4/4 пройшли.
- Інтеграція на локальному Postgres 17, ізольовані worker БД: 5 файлів, 21 тест пройшов
  (створення, редакції, копії, портрети, серверні обмеження левелапу). Після додавання
  captures для спільних копій повторено pers-copy-completeness: 6/6 пройшли.
- Тестові capture-події в бойовий PostHog не відправлялися; перевірка beacon використовує
  фальшивий host і spy. API-зміни профілів стосуються лише внутрішніх прапорців власника/QA.

## PWA — локально реалізовано 2026-10-10

[KR50.3](o50-pwa-install/kr50.3-install-entry.md) додає клієнтські події:
`app_install_offered` (`path`, `placement`), `app_install_prompt_result` (`accepted`/`dismissed` у `outcome`),
`app_installed` (Chromium), `app_ios_instructions_opened`. Accepted — відповідь на prompt;
підтвердження встановлення — окремий `appinstalled`. Інструкція iOS не підтверджує встановлення.

Клієнтські події мають `display_mode: browser | standalone`: значення фіксується в черзі,
реєструється як superproperty й додається SDK-подіям через `before_send`. Серверні події
без контексту браузера не отримують вигаданого режиму.

Локальні визначення плиток у `posthog-dashboard-queries.ts` підготовлені; `pendingInsights`
у [реєстрі](posthog-dashboards.json) позначає, що API-застосування ще не виконано.
Плитка режимів рахує унікальні сесії з pageview, а не завантаження чи встановлення.
Production-доставку цих подій і плиток ще не перевірено; тестові captures у бойовий PostHog не надсилались.

## Воронка входу й створення — схема 1, локально 2026-10-16

Не задеплоєно. Аудит, що це обґрунтовує: `persistence: "memory"` + вхід Google повним
редиректом давали новий анонімний `distinct_id` і новий `$session_id` після повернення;
анонімний `character_creation_started` назавжди лишався в окремій person, а
`accounts.google.com` ставав «джерелом» (206 із ~440 identified persons). Розбивка
«не залогінені 143 старти / 1 створення» — переважно похибка вимірювання.

Код: типізований шар [funnel-analytics.ts](../src/lib/monitoring/funnel-analytics.ts)
(усі назви подій і enum-и тут, компоненти викликають функції) і чиста модель
[funnel-analytics-model.ts](../src/lib/monitoring/funnel-analytics-model.ts).
Події цього шару мають `analytics_schema_version: 1`; старе `analytics_version: 2` лишається.

### Ідентичність і сесія через OAuth

- Перед редиректом на Google (`prepareGoogleAuthRedirect`) до `callbackUrl` додається один
  параметр `ph_ctx` (base64url JSON): анонімний `distinct_id`, `$session_id`,
  `creation_attempt_id`, entry-атрибуція, метод, одноразовий nonce, час. Без email, токенів і тексту персонажа.
  Той самий nonce кладеться в `sessionStorage` (`ph-oauth-nonce`) цієї вкладки.
- На поверненні `ph_ctx` прибирається з адреси `history.replaceState` до першого pageview.
  Його приймають лише коли nonce збігся зі збереженим у вкладці і `ph_ctx` молодший 30 хв;
  nonce стирається після першого читання. Інакше параметр видаляється без дії (захист від
  підкинутих посилань). Referrer не перевіряється: при тихому вході Google (без сторінки
  вибору акаунта) ланцюжок 302 лишає referrer нашого домену або порожній.
- SDK ініціалізується з `bootstrap: { distinctID, sessionID }` — тими самими, що до входу;
  потім наявний `identify(<числовий user.id>)` зливає анонімну частину з користувачем.
  Email ніколи не стає ідентифікатором. Вихід: як і раніше, `reset()` або перезавантаження.
- Якщо SDK до входу ще не завантажився (перші ~5 с), передаються лише атрибуція й спроба;
  тоді склеювання йде через `creation_attempt_id`.
- Сервер: `character_created` має `distinct_id = String(user.id)` (той самий, що в identify),
  `is_signed_in: true`, а для ручного конструктора і пресета — `$session_id` і (ручний)
  `creation_attempt_id`, якщо клієнт їх передав і це короткі id. Одна подія на персонажа:
  повтор пресета з тим самим `readyPresetRequestId` події не шле (інтеграційний тест).
- Інше сховище пристрою для аналітики не додано: усе живе в памʼяті сторінки, в `ph_ctx`
  і в одноразовому nonce. Якщо `sessionStorage` недоступний, `ph_ctx` не додається.

### Атрибуція

Superproperties, обчислені один раз на першому завантаженні вкладки (або взяті з `ph_ctx`):

| Властивість | Значення |
|---|---|
| `entry_source` | `utm_source`, інакше `entry_source` з адреси (handoff), інакше домен referrer, `direct`, `internal` (свій домен), `unknown` (повернення з Google без контексту) |
| `entry_medium` | `utm_medium` / `entry_medium` / `referral` / `none` / `oauth_return` / `inapp_handoff` / `unknown` |
| `entry_campaign` | `utm_campaign` / `entry_campaign` або `null` |
| `landing_path` | шлях першої сторінки без query |
| `browser_context` | `regular_browser` \| `embedded_browser` \| `unknown` (порожній UA) |
| `in_app_browser_host` | `threads` (`Barcelona`), `instagram`, `facebook` (`FBAN/FBAV/FB_IAB/FB4A`), `telegram` (`window.TelegramWebviewProxy` або `Telegram` в UA), `other` (Android `; wv)` чи iOS WebKit без `Safari/`), `unknown`; `null` у звичайному браузері |
| `device_type` | `mobile` \| `tablet` \| `desktop` \| `unknown` |

`before_send` видаляє `$referrer`, `$referring_domain`, `$session_entry_*` і `$initial_*`
referrer-поля, якщо це `accounts.google.*`: Google більше не стає first-touch чи session entry.
Детекція вбудованого браузера — підказка, а не доказ, що Google відмовить у вході.
`auth_state` окремо не вводився: його роль виконує наявний `is_signed_in` (на старих подіях
до 12.10 поля немає — тоді «увійшов» = `distinct_id` — число).

### Події

| Подія | Коли | Властивості |
|---|---|---|
| `character_creation_started` (назва стара) | монтування ручного конструктора — це **перегляд**, а не дія | `edition`, `creation_path: manual`, `creation_attempt_id`, `is_auth_return` |
| `character_creation_first_choice` | перший перехід на наступний крок у цьому завантаженні (автоперехід з гайда RPGbot на крок раси/ASI не рахується); раз на спробу (після OAuth може повторитися — рахувати `uniq(creation_attempt_id)`) | `edition`, `creation_path`, `creation_attempt_id` |
| `character_create_failed` | сервер повернув помилку (`server`) або виклик упав (`network`); текст помилки не передається | `edition`, `creation_path`, `creation_attempt_id`, `reason` |
| `character_created` (сервер, стара) | збережено новий персонаж | як раніше + `is_signed_in`, `$session_id`, `creation_attempt_id` |
| `auth_requested` | відкрито діалог входу для незалогіненого | `trigger`: `creator_submit` \| `preset_submit` \| `nav` \| `discussion` \| `homebrew` \| `other` |
| `auth_started` | натиснуто «Продовжити з Google» (перед `signIn`) або One Tap повернув відповідь | `method`: `google_redirect` \| `one_tap`, `trigger` або `null` |
| `auth_completed` | One Tap успішний; або завантаження з дійсним `ph_ctx` і є сесія | `method` |
| `auth_failed` | `signIn` повернув помилку (`provider_error`), виняток (`network`), One Tap без credential (`no_credential`), повернення з `ph_ctx` без сесії (`returned_signed_out`) | `method`, `reason` |
| `inapp_warning_shown` | попередження про вбудований браузер видно | `placement`: `auth_dialog` \| `creator` \| `preset` \| `other` |
| `inapp_warning_dismissed` | «Продовжити тут» або закриття | `placement`, `action`: `continue_here` \| `close` |
| `inapp_external_browser_selected` | натиснуто дію «відкрити у звичайному браузері» | `placement`, `method`: `android_intent` \| `ios_safari_scheme` \| `ios_chrome_scheme` \| `system_share` \| `instructions_only` \| `other` |
| `inapp_link_copied` | результат копіювання посилання | `placement`, `ok` |

Усі події `inapp_*` також несуть `variant`: `control` \| `contextual` \| `contextual-handoff` (варіант
UI вбудованого браузера з `?inapp_variant=`) або `null`. Події `inapp_*` викликає UI вбудованого браузера через `captureInAppWarningShown`,
`captureInAppWarningDismissed`, `captureExternalBrowserSelected`, `captureLinkCopied`; скопійоване
посилання будується `buildInAppHandoffUrl` і несе `entry_source=<host>&entry_medium=inapp_handoff`.
Скасування на сторінці Google не видно: Auth.js без `pages` веде помилки й скасування на свої
англомовні сторінки без PostHog. Подій «покинув» через `beforeunload` немає навмисно.

### Як рахувати

- Qualified entrant = `character_creation_first_choice` (не перегляд). Primary:
  `uniq(creation_attempt_id)` з `character_created` / з `first_choice` за однакове вікно (7 днів
  від першого вибору), окремо mobile/desktop і `browser_context`.
- Auth friction: `auth_requested` → `auth_started` → `auth_completed`; `auth_failed` за `reason`.
- Пресети й збірки не мають `character_creation_started`; їх рахувати за `rpgbot_*` і
  `character_created.creation_type`.
- Порівняння до/після: ці поля зʼявляються лише після деплою; історичні дані не перераховуються.
