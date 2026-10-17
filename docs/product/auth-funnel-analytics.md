# Аналітика воронки «вхід → створення персонажа»

Дата: 2026-10-16. Контекст і докази — [auth-funnel-audit.md](auth-funnel-audit.md).

> **У PostHog нічого не створено.** Усі insight-и нижче — конфігурації для ручного створення.
> Синтаксис кожного HogQL-запиту перевірено read-only запитом до API 2026-10-16. Запити на нових подіях
> повертають порожній результат, доки інструментацію не задеплоєно.

Назви нових подій і властивостей нижче — **пропозиція аудиту**. Якщо реалізація назвала їх інакше,
мапінг лежить у QA-звіті аудиту, і назви в запитах треба замінити за ним.

## 1. Події та властивості

### Наявні (не перейменовувати — на них стоять дашборди)

| Подія | Значення |
|---|---|
| `character_creation_started` | Конструктор змонтовано = **перегляд**, а не початок. На дашборді «Відкриття конструктора» |
| `character_created` (`source = 'server'`) | Персонаж збережено. Один `pers_id` — одна подія. Ground truth для завершення |
| `rpgbot_preset_path_chosen`, `rpgbot_preset_submitted`, `rpgbot_preset_created`, `rpgbot_preset_create_failed` | Шлях пресета |

### Нові (план)

| Подія | Коли | Властивості |
|---|---|---|
| `character_creation_first_choice` | Перший успішний «Далі» у спробі; раз на `creation_attempt_id`. Для пресета — вибір шляху | `creation_attempt_id`, `creation_path`, `edition`, `step` |
| `character_create_failed` | Явна помилка збереження | `creation_path`, `reason`: `validation \| server \| network \| unauthorized` |
| `auth_dialog_opened` | Відкрито діалог входу | `trigger`: `creator_submit \| creator_header \| nav \| preset \| discussion \| homebrew`, `browser_context`, `in_app_browser_host`, `creation_attempt_id?` |
| `auth_started` | Перед редиректом на Google (з примусовим скиданням черги) | `method`: `google_redirect`, `creation_attempt_id?` |
| `auth_completed` | Перехід `userId: null → id` після завантаження або One Tap | `method`: `google_redirect \| one_tap \| unknown` |
| `auth_failed` | Лише підтверджена помилка | `method`, `reason`: `provider_error \| network \| access_denied \| <код Auth.js>` |
| `inapp_warning_shown` | Показано підказку про вбудований браузер | `placement`: `auth_dialog \| creator_hint`, `in_app_browser_host`, `browser_context` |
| `inapp_warning_action` | Дія в підказці | `placement`, `action`: `copy_link \| copy_failed \| try_external \| try_google \| continue_here \| dismiss` |

Подію «покинув створення» **не додаємо**: відмова рахується як відсутність `character_created`.

### Спільні властивості

| Властивість | Значення | Де |
|---|---|---|
| `creation_attempt_id` | UUID у чернетці конструктора. Переживає перезавантаження й OAuth у тому ж браузері. Скидається після створення або «почати заново». Інший браузер = нова спроба | Події конструктора, `auth_*`, серверний `character_created` |
| `creation_path` | `manual \| ready_preset \| build_assembly` | Як `creation_type` на сервері |
| `browser_context` | `regular_browser \| embedded_browser \| unknown` | Клієнт. Детекція не доводить, що вхід не спрацює |
| `in_app_browser_host` | `telegram \| threads \| instagram \| facebook \| other \| unknown` | Клієнт |
| `entry_source`, `entry_medium`, `entry_campaign`, `landing_path` | З UTM або першого не-технічного реферера; `accounts.google.*` — технічний | Реєструються на першому завантаженні; `entry_medium = inapp_handoff` для скопійованого посилання |
| `is_signed_in` | Сервер завжди `true` | Усі події |
| `analytics_version` | Підняти до `3` у деплої з новими подіями | Межа «до/після» |

Без email, імені персонажа, токенів і повних URL з параметрами.

## 2. Основна метрика

**Конверсія кваліфікованого учасника конструктора у створеного персонажа.**

- **Одиниця** — спроба (`creation_attempt_id`), не людина й не сесія. Причина: з `persistence: "memory"`
  людина й сесія в PostHog рвуться на кожному завантаженні сторінки.
- **Кваліфікований учасник** — спроба з `character_creation_first_choice` у вікні. Перегляд
  (`character_creation_started`) не рахується.
- **Успіх** — серверний `character_created` з тим самим `creation_attempt_id` протягом **24 год** після
  першого вибору.
- **Вікно когорти** — перші вибори до `now() - 1 day`: кожна спроба мала повну добу на завершення.
- **Виключення** — user 5 і 967, `is_internal`, не production, боти (`$virt_is_bot`).
- **Межа** — спроби з іншого браузера після перенесення рахуються новими. Перенесення міряє Funnel 3.

До деплою (і для порівняння з історією) лишається **legacy-метрика** дашборда: людина з
`character_creation_started` → `character_created` за 24 год. Обидва числа показувати поруч.

Базові значення до змін (27.09–15.10, з аудиту):

| | Legacy | Оцінка після зшивання за пристроєм |
|---|---:|---:|
| Усі, 30 днів | 20,7% (186/900) | 27,3% (186/682) |
| Mobile, 30 днів | 16,7% (99/593) | 21,9% (99/453) |
| Desktop, 30 днів | 27,9% (84/301) | 37,3% (84/225) |
| Усі, 7 днів | 25,7% (96/374) | 32,7% (96/294) |
| Threads in-app, 30 днів | 0/91 | 0/91 |

Ground truth незалежно від PostHog: нових авторів на день у базі — 2–15 (132 за 27.09–15.10).

## 3. Вторинні метрики

| Метрика | Визначення |
|---|---|
| Завершення входу | Спроби з `auth_completed` / спроби з `auth_started`, за `creation_attempt_id` (Funnel 2) |
| Частка помилок OAuth | `auth_failed` / `auth_started`, розбивка за `reason`. Скасування на Google видно лише після `pages.error` |
| Час до першого вибору | Медіана й p75 `first_choice − started` у спробі |
| Час до створення | Медіана `created − first_choice` у спробі |
| Конверсія пресета | Спроби `creation_path = ready_preset` з першим вибором → `character_created` |
| Використання перенесення | `inapp_warning_action{copy_link}` / `inapp_warning_shown`; спроби з `entry_medium = inapp_handoff` |
| Повернення до персонажа | Автори тижня W, що відкрили `/char/<id>` в інший день протягом 7 днів (за `distinct_id` користувача — надійно) |

## 4. Запобіжники

Основну метрику не можна піднімати ціною цих показників:

| Показник | Поріг |
|---|---|
| Помилки збереження | `character_create_failed` + `rpgbot_preset_create_failed` на 100 кваліфікованих — не вище бази |
| Винятки | Sentry issues на `/char/create`, `$exception` на 1 000 переглядів — без нових груп |
| Дублі | `pers_id` з >1 `character_created` = 0; у базі пар «той самий user + імʼя + клас + раса за ≤60 с» = 0 |
| Швидкість | First-load JS маршруту `/char/create` у `bunx next build` — не більше +5 КБ gzip |
| Mobile | Mobile-конверсія не падає нижче бази поза довірчим інтервалом |
| Безпека входу | Колбеки Auth.js, callbackUrl і QA-вхід не змінено без окремого рев'ю |
| Втрата даних | Скарги на зниклу чернетку; `creator-draft-storage`-тести зелені |
| Обсяг подій | Усього подій на день — не більше +10% до бази; без нових подій на кожен рендер |

## 5. Воронки

Спільні правила:
- Однакове вікно конверсії **24 год** для всіх воронок; когорта закінчується за добу до `now()`.
- Сегмент <30 одиниць — **анекдотично**, висновків немає. Порівнювати сегменти лише коли в кожному
  ≥100 одиниць або 95% інтервали Вілсона не перетинаються.
- Exclusion у FunnelsQuery — рядок `buildAnalyticsExclusion` зі
  [scripts/posthog-dashboard-queries.ts](../../scripts/posthog-dashboard-queries.ts) (user 5/967 і їхні person-и).

### Funnel 0 — legacy (до деплою й для історії)

Insight → SQL. Розбивка за пристроєм, останні 14 повних діб.

```sql
WITH
  starters AS (
    SELECT person_id, min(timestamp) AS started_at,
      argMin(properties.$device_type, timestamp) AS device_type
    FROM events
    WHERE event = 'character_creation_started'
      AND timestamp >= now() - INTERVAL 15 DAY AND timestamp < now() - INTERVAL 1 DAY
      AND distinct_id NOT IN ('5', '967')
      AND coalesce(toString(properties.is_internal), '') NOT IN ('true', '1')
      AND coalesce(properties.environment, 'production') = 'production'
      AND coalesce(toString(properties.$virt_is_bot), 'false') NOT IN ('true', '1')
    GROUP BY person_id
  ),
  creators AS (
    SELECT person_id, min(timestamp) AS created_at
    FROM events
    WHERE event = 'character_created' AND properties.source = 'server'
      AND timestamp >= now() - INTERVAL 15 DAY
      AND distinct_id NOT IN ('5', '967')
    GROUP BY person_id
  )
SELECT
  starters.device_type AS device_type,
  count() AS starters,
  countIf(creators.created_at >= starters.started_at
    AND creators.created_at < starters.started_at + INTERVAL 24 HOUR) AS created_24h
FROM starters
LEFT JOIN creators ON creators.person_id = starters.person_id
GROUP BY device_type
ORDER BY starters DESC
```

### Funnel 1 — активація: перегляд → перший вибір → створено

Insight → SQL. Основна метрика — `primary_rate_pct`. Для інших розбивок замінити `device_type`
на `edition`, `creation_path` або `browser_context` в `SELECT` і `GROUP BY`.

```sql
WITH
  attempts AS (
    SELECT
      toString(properties.creation_attempt_id) AS attempt_id,
      minIf(timestamp, event = 'character_creation_started') AS viewed_at,
      minIf(timestamp, event = 'character_creation_first_choice') AS qualified_at,
      argMinIf(properties.creation_path, timestamp, event = 'character_creation_first_choice') AS creation_path,
      argMin(properties.edition, timestamp) AS edition,
      argMin(properties.$device_type, timestamp) AS device_type,
      argMin(properties.browser_context, timestamp) AS browser_context
    FROM events
    WHERE event IN ('character_creation_started', 'character_creation_first_choice')
      AND properties.creation_attempt_id IS NOT NULL
      AND timestamp >= now() - INTERVAL 15 DAY AND timestamp < now() - INTERVAL 1 DAY
      AND distinct_id NOT IN ('5', '967')
      AND coalesce(toString(properties.is_internal), '') NOT IN ('true', '1')
      AND coalesce(properties.environment, 'production') = 'production'
      AND coalesce(toString(properties.$virt_is_bot), 'false') NOT IN ('true', '1')
    GROUP BY attempt_id
  ),
  created AS (
    SELECT toString(properties.creation_attempt_id) AS attempt_id, min(timestamp) AS created_at
    FROM events
    WHERE event = 'character_created' AND properties.source = 'server'
      AND properties.creation_attempt_id IS NOT NULL
      AND timestamp >= now() - INTERVAL 15 DAY
      AND distinct_id NOT IN ('5', '967')
    GROUP BY attempt_id
  )
SELECT
  attempts.device_type AS device_type,
  countIf(attempts.viewed_at > toDateTime('2000-01-01')) AS viewed,
  countIf(attempts.qualified_at > toDateTime('2000-01-01')) AS qualified_entrants,
  countIf(attempts.qualified_at > toDateTime('2000-01-01')
    AND created.created_at >= attempts.qualified_at
    AND created.created_at < attempts.qualified_at + INTERVAL 24 HOUR) AS created_24h,
  round(100 * countIf(attempts.qualified_at > toDateTime('2000-01-01')
    AND created.created_at >= attempts.qualified_at
    AND created.created_at < attempts.qualified_at + INTERVAL 24 HOUR)
    / nullIf(countIf(attempts.qualified_at > toDateTime('2000-01-01')), 0), 1) AS primary_rate_pct
FROM attempts
LEFT JOIN created ON created.attempt_id = attempts.attempt_id
GROUP BY device_type
ORDER BY qualified_entrants DESC
```

### Funnel 2 — тертя входу

Person-воронка PostHog тут **не працює**: `auth_dialog_opened` і `auth_completed` при redirect-вході
лежать на різних анонімах. Тому — SQL за `creation_attempt_id` (лише входи з конструктора).
Скасування на Google окремо не видно, доки немає `pages.error`: така спроба лишається «started без
completed/failed».

```sql
WITH
  auth AS (
    SELECT
      toString(properties.creation_attempt_id) AS attempt_id,
      minIf(timestamp, event = 'auth_dialog_opened') AS opened_at,
      minIf(timestamp, event = 'auth_started') AS started_at,
      minIf(timestamp, event = 'auth_completed') AS completed_at,
      minIf(timestamp, event = 'auth_failed') AS failed_at,
      argMinIf(properties.reason, timestamp, event = 'auth_failed') AS failed_reason,
      argMinIf(properties.method, timestamp, event = 'auth_started') AS method,
      argMinIf(properties.browser_context, timestamp, event = 'auth_dialog_opened') AS browser_context
    FROM events
    WHERE event IN ('auth_dialog_opened', 'auth_started', 'auth_completed', 'auth_failed')
      AND properties.creation_attempt_id IS NOT NULL
      AND timestamp >= now() - INTERVAL 15 DAY AND timestamp < now() - INTERVAL 1 DAY
      AND coalesce(toString(properties.is_internal), '') NOT IN ('true', '1')
      AND coalesce(properties.environment, 'production') = 'production'
    GROUP BY attempt_id
    HAVING opened_at > toDateTime('2000-01-01')
  ),
  created AS (
    SELECT toString(properties.creation_attempt_id) AS attempt_id, min(timestamp) AS created_at
    FROM events
    WHERE event = 'character_created' AND properties.source = 'server'
      AND properties.creation_attempt_id IS NOT NULL
      AND timestamp >= now() - INTERVAL 15 DAY
      AND distinct_id NOT IN ('5', '967')
    GROUP BY attempt_id
  )
SELECT
  auth.browser_context AS browser_context,
  count() AS dialog_opened,
  countIf(auth.started_at > toDateTime('2000-01-01')) AS auth_started,
  countIf(auth.completed_at > toDateTime('2000-01-01')) AS auth_completed,
  countIf(auth.failed_at > toDateTime('2000-01-01')) AS auth_failed,
  countIf(auth.completed_at > toDateTime('2000-01-01')
    AND created.created_at >= auth.completed_at
    AND created.created_at < auth.opened_at + INTERVAL 24 HOUR) AS created_after_auth
FROM auth
LEFT JOIN created ON created.attempt_id = auth.attempt_id
GROUP BY browser_context
ORDER BY dialog_opened DESC
```

Помилки окремо, за причиною:

```sql
SELECT
  properties.method AS method,
  properties.reason AS reason,
  count() AS events,
  count(DISTINCT $session_id) AS page_loads
FROM events
WHERE event = 'auth_failed'
  AND timestamp >= now() - INTERVAL 15 DAY
  AND coalesce(toString(properties.is_internal), '') NOT IN ('true', '1')
  AND coalesce(properties.environment, 'production') = 'production'
GROUP BY method, reason
ORDER BY events DESC
```

### Funnel 3 — вбудований браузер

Показ і дія відбуваються в одному завантаженні сторінки, тож групуємо за `$session_id`:

```sql
WITH
  exposed AS (
    SELECT
      $session_id AS page_load,
      argMin(properties.in_app_browser_host, timestamp) AS host,
      argMin(properties.placement, timestamp) AS placement,
      countIf(event = 'inapp_warning_action' AND properties.action = 'copy_link') > 0 AS copied,
      countIf(event = 'inapp_warning_action' AND properties.action IN ('open_external', 'try_external')) > 0 AS tried_external,
      countIf(event = 'inapp_warning_action' AND properties.action IN ('continue_here', 'dismiss')) > 0 AS stayed
    FROM events
    WHERE event IN ('inapp_warning_shown', 'inapp_warning_action')
      AND timestamp >= now() - INTERVAL 15 DAY AND timestamp < now() - INTERVAL 1 DAY
      AND coalesce(toString(properties.is_internal), '') NOT IN ('true', '1')
      AND coalesce(properties.environment, 'production') = 'production'
    GROUP BY page_load
  )
SELECT host, placement, count() AS warning_page_loads,
  countIf(copied) AS copied_link, countIf(tried_external) AS tried_external, countIf(stayed) AS stayed_here
FROM exposed
GROUP BY host, placement
ORDER BY warning_page_loads DESC
```

Продовження в іншому браузері (спроби, що почалися з позначеного посилання) і їх завершення:

```sql
WITH
  resumed AS (
    SELECT toString(properties.creation_attempt_id) AS attempt_id, min(timestamp) AS resumed_at
    FROM events
    WHERE event IN ('character_creation_started', 'character_creation_first_choice')
      AND properties.entry_medium = 'inapp_handoff'
      AND properties.creation_attempt_id IS NOT NULL
      AND timestamp >= now() - INTERVAL 15 DAY AND timestamp < now() - INTERVAL 1 DAY
      AND coalesce(properties.environment, 'production') = 'production'
    GROUP BY attempt_id
  ),
  created AS (
    SELECT toString(properties.creation_attempt_id) AS attempt_id, min(timestamp) AS created_at
    FROM events
    WHERE event = 'character_created' AND properties.source = 'server'
      AND properties.creation_attempt_id IS NOT NULL
      AND timestamp >= now() - INTERVAL 15 DAY
      AND distinct_id NOT IN ('5', '967')
    GROUP BY attempt_id
  )
SELECT count() AS handoff_attempts,
  countIf(created.created_at >= resumed.resumed_at
    AND created.created_at < resumed.resumed_at + INTERVAL 24 HOUR) AS created_24h
FROM resumed
LEFT JOIN created ON created.attempt_id = resumed.attempt_id
```

Звʼязати конкретний показ у WebView з конкретним продовженням у Safari неможливо без ідентифікатора
в URL. Порівнюємо **кількості**, не пари.

Альтернатива для частини «показ → копіювання» — стандартний insight Funnels:

```json
{
  "kind": "InsightVizNode",
  "source": {
    "kind": "FunnelsQuery",
    "series": [
      { "kind": "EventsNode", "event": "inapp_warning_shown", "name": "Показ підказки" },
      { "kind": "EventsNode", "event": "inapp_warning_action", "name": "Скопіював посилання",
        "properties": [{ "key": "action", "value": ["copy_link"], "operator": "exact", "type": "event" }] }
    ],
    "funnelsFilter": { "funnelVizType": "steps", "funnelOrderType": "ordered",
      "funnelWindowInterval": 30, "funnelWindowIntervalUnit": "minute" },
    "breakdownFilter": { "breakdown": "in_app_browser_host", "breakdown_type": "event" },
    "dateRange": { "date_from": "-14d" },
    "properties": [{ "type": "hogql", "key": "<рядок buildAnalyticsExclusion>" }],
    "filterTestAccounts": true
  }
}
```

### Funnel 4 — шляхи створення

Завершення за шляхом (працює вже зараз):

```sql
SELECT
  coalesce(properties.creation_type, 'unknown') AS creation_type,
  properties.edition AS edition,
  count() AS characters,
  count(DISTINCT distinct_id) AS authors
FROM events
WHERE event = 'character_created' AND properties.source = 'server'
  AND timestamp >= now() - INTERVAL 15 DAY AND timestamp < now() - INTERVAL 1 DAY
  AND distinct_id NOT IN ('5', '967')
GROUP BY creation_type, edition
ORDER BY characters DESC
```

Конверсію шляху рахувати запитом Funnel 1 з розбивкою `creation_path`. За 30 днів пресети дали
4 створення, збірка — 2: це **анекдотично**, шляхи не порівнювати.

### Розбивки

| Розбивка | Властивість | Надійність |
|---|---|---|
| mobile / desktop | `$device_type` | Висока |
| iOS / Android | `$os` | Висока |
| Браузер | `$browser` | Висока; WebView часто виглядає як Mobile Safari / Chrome |
| regular / embedded | `browser_context` | Середня; `unknown` не відкидати |
| Threads / Telegram / direct / інше | `in_app_browser_host`, `entry_source` | Telegram на Android у Custom Tabs не видно — це правильно |
| Увійшов / анонім | `is_signed_in` на першому виборі | Лише після деплою |
| 2014 / 2024 | `edition` | Висока |
| Тип створення | `creation_path` / `creation_type` | Висока |
| Новий / повторний | Лише для залогінених: чи є в людини `character_created` раніше | Анонімів не розрізнити |

## 6. Session replay

**Стан на 2026-10-17:** у коді запис увімкнено лише на маршрутах конструктора, пресетів і левелапу
(локально, не задеплоєно). До деплою записів 0: прод-клієнт має `disable_session_recording: true`.

### Обсяг і квота

Read-only HogQL 2026-10-17, без внутрішніх акаунтів (ID 5 і 967, `is_internal`). Сесія = `$session_id`
з `$pageview`. З `persistence: "memory"` кожне завантаження сторінки починає нову сесію; після входу через
Google сесія продовжується завдяки `bootstrap` із `ph_ctx`.

| Період | Сесії на `/char/create`, `/2024/char`, `/char/presets`, `/char/<id>/levelup` |
|---|---|
| Останні 30 днів | **2 726** (5 174 перегляди); пік — 248 за добу |
| Вересень 2026 | 1 007 |
| 1–17 жовтня 2026 | 1 746 (≈ 3 100 за місяць у цьому темпі) |
| Усі сесії сайту за 30 днів (для порівняння) | 13 201 |

Тариф безкоштовний: 5 000 записів на місяць, ліміт білінгу 5 000. Коли квоту вичерпано, PostHog
перестає приймати записи до кінця місяця, грошей не списує. 2 726 — це близько 55% квоти, тож
**пишемо всі сесії цих маршрутів без семплінгу**. Записи коротші за мінімальну тривалість не
надсилаються, тож фактично їх буде менше. Якщо за місяць набереться понад 4 000 записів, у проєкті
зменшують Sample rate до 50%; деплой для цього не потрібен.

### Що робить клієнт

Код: [session-replay.ts](../../src/lib/monitoring/session-replay.ts),
[posthog-client.ts](../../src/lib/monitoring/posthog-client.ts), тести —
[session-replay.test.ts](../../src/lib/monitoring/session-replay.test.ts) і
[posthog-session-replay.test.tsx](../../tests/components/posthog-session-replay.test.tsx).

- SDK ініціалізується з вимкненим записом. `PostHogProvider` передає кожну зміну маршруту, і клієнт
  викликає `startSessionRecording()` лише на `/char/create`, `/2024/char`, `/char/presets`,
  `/char/<id>/levelup` (і їхніх `/no-ai/...`). На будь-якому іншому маршруті запис зупиняється через
  `stopSessionRecording()`. Тож `/char/share/*`, `/char/folder/share/*`, `/api/auth/*`, `/qa-sign-in`
  і лист персонажа ніколи не записуються.
- Власник і QA не записуються взагалі: для них SDK не завантажується. Якщо внутрішній акаунт увійшов
  на сторінці, де вже йде запис, запис зупиняється.
- Маскування: усі поля вводу (`maskAllInputs`). На цих маршрутах вільний текст гравця (імʼя персонажа,
  імʼя в пресеті, текст повідомлення про проблему) є лише в полях вводу. Текст, позначений
  `data-ph-mask`, також маскується: email у діалозі входу. Біографія, передісторія й нотатки
  редагуються на листі персонажа, а він не записується.
- Наступна сторінка: Next малює новий маршрут (на «Назад» — одразу весь лист із кешу), а запис
  зупиняється лише в ефекті після цього. Тому `maskTextFn` перевіряє `window.location` у момент
  запису: на будь-якому маршруті поза списком увесь текст іде зірочками. Портрети на `/char/home` і
  на листі мають клас `ph-no-capture`: rrweb пише замість них порожній прямокутник, без `src` і `alt`
  з імʼям. `maskAttributeFn` навмисно не задано: з ним rrweb перестає стискати зміни `style` у різницю.
- URL у записі (адреса сторінки, адреси мережевих запитів) проходять через
  `maskReplayUrl`: фрагмент `#...` (зокрема майбутній `#draft=`) прибирається, а `ph_ctx`, `persName`,
  `q`, `code`, `state`, `token`, `callbackUrl` видаляються. Сегмент після `/share/` замінюється на `[token]`.
- Мережа: `capture_performance: false` (таймінги не пишуться), `recordHeaders/recordBody: false`, а
  `maskCapturedNetworkRequestFn` викидає заголовки й тіла, навіть якщо їх увімкнуть у проєкті.
  Консоль: `enable_recording_console_log: false` переважає налаштування проєкту.
- `before_send` пропускає `$snapshot` без змін: у снапшотів немає сторінкових властивостей.
- Якщо SDK заблокований або `startSessionRecording` кидає помилку, сторінка й події працюють як раніше,
  і в консолі зʼявляється `PostHog replay failed`.

Налаштування клієнта переважають проєктні для маскування, консолі й таймінгів мережі. Заголовки й
тіла запитів PostHog вмикає, якщо їх увімкнено **хоч де-небудь**, тому в проєкті вони мають лишатися
вимкненими (крок 4 нижче). Клієнт однаково їх вирізає.

### Кроки в PostHog після деплою (власник)

Робити **після** того, як деплой із цим кодом дійшов до користувачів. До деплою запис не почнеться
за жодних налаштувань проєкту. Сторінка: `https://eu.posthog.com/project/245714/settings/project-replay`.
Стан проєкту на 2026-10-17: запис увімкнено, sample rate не задано (100%), консоль увімкнена,
`capture_performance_opt_in: true`, network payload не задано, тригерів немає, `maskAllInputs: true`,
retention 30 днів.

1. **Record user sessions** — лишити ввімкненим.
2. **Capture console logs** — вимкнути (клієнт і так не пише, але так налаштування не вводять в оману).
3. **Capture network performance** — вимкнути.
4. **Capture headers / Capture body** — вимкнути обидва.
5. **Sampling** — 100%. **Minimum duration** — 10 с.
6. **URL triggers** — порожні: маршрути обирає клієнт. **URL blocklist** — додати регулярку
   `/char/(folder/)?share/` як другий захист.
7. **Event triggers**, **Linked flag** — порожні. **Canvas capture** — вимкнено.
8. **Privacy and masking** — «Mask all inputs» увімкнено (клієнт переважає, але хай збігається).
9. **Retention** — 30 днів, без змін. Білінг: ліміт session replay лишити 5 000 (безкоштовно).

Перевірка після кроків: у приватному вікні **без входу** (власник і QA не записуються) відкрити
`https://char.holota.family/char/create`, пройти 2–3 кроки за 15+ с, потім `/char/home`. За кілька
хвилин запис має зʼявитися в Replay. У ньому мають бути: зірочки замість імені персонажа, адреса без
`ph_ctx` і `#...`, жодної консолі чи мережевих запитів, і запис має закінчитися на переході з конструктора.
Окремо відкрити спільне посилання на персонажа: запису бути не повинно. Подія `$pageview` на конструкторі
має `$recording_status = active` (у перші секунди може бути `buffering`), на інших сторінках — не `active`.

Політики конфіденційності на сайті немає (сторінки не знайдено). Якщо вона зʼявиться, у ній треба
згадати запис сесій на сторінках створення.

### Як знайти записи тих, хто не завершив

1. Запустити SQL нижче: спроби з першим вибором і без створення, з `$session_id` першого вибору.
2. Відкрити `https://eu.posthog.com/project/245714/replay/<session_id>`.
3. Серверний `character_created` не має `$session_id`, тож фільтр «не виконав подію» в Replay для нього
   не працює. Лише цей SQL.

```sql
WITH
  qualified AS (
    SELECT toString(properties.creation_attempt_id) AS attempt_id,
      argMin($session_id, timestamp) AS session_id,
      min(timestamp) AS qualified_at,
      argMin(properties.$device_type, timestamp) AS device_type
    FROM events
    WHERE event = 'character_creation_first_choice'
      AND properties.creation_attempt_id IS NOT NULL
      AND timestamp >= now() - INTERVAL 7 DAY AND timestamp < now() - INTERVAL 1 DAY
      AND coalesce(toString(properties.is_internal), '') NOT IN ('true', '1')
      AND coalesce(properties.environment, 'production') = 'production'
    GROUP BY attempt_id
  ),
  created AS (
    SELECT DISTINCT toString(properties.creation_attempt_id) AS attempt_id
    FROM events
    WHERE event = 'character_created' AND properties.source = 'server'
      AND properties.creation_attempt_id IS NOT NULL
      AND timestamp >= now() - INTERVAL 8 DAY
  )
SELECT qualified.session_id AS session_id, qualified.device_type AS device_type, qualified.qualified_at AS qualified_at
FROM qualified
WHERE qualified.attempt_id NOT IN (SELECT attempt_id FROM created)
ORDER BY qualified_at DESC
LIMIT 50
```

## 7. Експеримент і rollout

Трафіку для A/B замало: Threads — 8 стартів за 7 днів. Крім того, флаги PostHog на анонімах
з `persistence: "memory"` перевипадають на кожному завантаженні.

План — **послідовний запуск**, а не A/B:
- **Control** — поточна поведінка, базовий період 27.09–15.10.
- **Варіант A** — неблокувальна підказка лише в контексті входу.
- **Варіант B** — A + чітка дія «Скопіювати посилання» з інструкцією для платформи.
- Перемикач — env-прапорець (`NEXT_PUBLIC_…`) з вимкненням без коду, не флаг PostHog. Варіант
  у властивості `experiment_variant` на подіях `inapp_*` і `auth_*`.

Критерії, визначені заздалегідь (14 днів кожен етап):
- Успіх: частка `copy_link` серед показів ≥20% **і** ≥5 спроб з `entry_medium = inapp_handoff` дійшли
  до створення.
- Відкат: падіння regular-конверсії (Funnel 1, `browser_context = regular_browser`) поза 95% інтервалом
  або нова група помилок у Sentry.
- Будь-яка різниця на embedded при <30 спробах — **немає висновку**. Кореляція з часом — не причинність:
  трафік Threads і так спадає.

## 8. Вимірювання «до / після»

1. **Межа.** Деплой з `analytics_version = 3`. Дату й коміт записати в KR-журнал.
2. **Два тижні до** (уже є): legacy-метрика і оцінка зшивання з таблиці §2.
3. **Два тижні після:** legacy-метрика (Funnel 0) **і** основна (Funnel 1) поруч.
4. **Порівнювати можна** лише legacy з legacy і кількість нових авторів на день у базі. Основна
   метрика до деплою не існувала — її зростання відносно legacy означає виправлення вимірювання,
   а не поведінки.
5. **Запобіжники** (§4) — щотижня.
6. **Звіт** — через 14 днів після деплою: обидва числа, розбивка mobile/desktop і regular/embedded,
   Funnel 2–3, кількість для кожного сегмента, висновок лише там, де ≥100 одиниць.
