# Портрети готових пресетів — 2026-10-10

За запитом власника послідовно згенеровано всі 112 блоків `data/subclass-art/prompts/presets/all-prompts.txt`, без пропусків. Оригінальні PNG збережено в `data/subclass-art/generated/presets/`; WebP для сайту — в `public/images/presets/`, якість 82, effort 5, 1672×941. Чотири оригінали мали висоту 940 px; WebP приведено до 941 px, PNG залишено оригінальними.

Усі 112 готових пресетів мають `portraitSrc`; відповідні 110 build-specs також містять посилання, щоб компіляція їх зберігала. `sorcadin-clockwork-2014` і `wizard-evocation-2014` є рукописними пресетами без build-spec. Порядок поля в компільованих ready-builds відповідає `PRESET_KEY_ORDER`. Продакшен-код не змінювався: галерея вже підтримує портрети, `/images/presets/` уже позначено як AI та приховано в no-ai.

Перевірено декодування всіх 112 PNG/WebP, остаточні розміри та фільтрацію no-ai. Арт/галерея/no-ai: 336 тестів пройшли. Ширший прогін компілятора, усіх пресетів, арту й no-ai: 819 пройшли, 1 впав — `bugbear-fiend-warlock-2014 matches the files compiled from it`: рецепт на диску має лише рівень 1 і ACOLYTE, тоді як поточна специфікація компілює рівні 1–20 і SAILOR. Ці поля не змінювалися в роботі над портретами. Спільний робочий каталог змінювався під час роботи; сторонні зміни збережені. Commit/push/deploy не виконувалися.

## Галерея і створення за пресетом

Наступні рішення власника: короткий заголовок картки в один рядок; два способи створення навіть на 20-му рівні — довіритися гайду й дати імʼя або налаштувати через знайомі кроки конструктора. Довгий обовʼязковий екран перевірки прибрано.

Галерея показує підклас або коротку назву білда, клас і расу під ним; повна назва лишається в доступній назві й tooltip. Пошук підтримує всі ці поля. Заголовки перевірено на 375/1280 px. AI-портрети лишаються прихованими в no-ai.

`ReadyPresetCreator` спочатку показує рівень (розгортається кнопкою) і два шляхи. Швидкий шлях відновлює рекомендації, зберігає рівень та імʼя, відкриває форму імені. Якщо вибори не змінилися, ідентифікатор запиту лишається стабільним. Налаштування використовує `ASIForm`, `LanguagesForm`, `EquipmentForm`, `CreationFooter`, `SpellChoiceGrid`; навички й Експертиза адаптовані до джерел пресета. На наступних рівнях відкриті вибори згруповані за рівнем. Раса, класи, походження й закріплені расові бонуси залишаються ідентичністю гайда. Рівень і класи додає наявна збірка; серверні actions не змінювались.

Картки заклинань мають пошук, обмеження кількості, спільного списку риси та її рівнів, перегляд опису. Підготовка Чарівника бачить усю книгу до обраного рівня. Форми мов і спорядження отримують вкладені значення пресета явно; спорядження зберігається також при переході через меню. Неповні чернетки відновлюються, пошкоджені розділи й дрейф закріпленого походження відхиляються; створення зберігає строгу перевірку.

Перевірка: 135 цільових тестів без DB пройшли; typecheck джерел із виключенням застарілих згенерованих `.next*` типів пройшов. WebKit 375 px і Chromium 1280 px: швидкий шлях на 20-й рівень, повернення, налаштування, відновлення кроку після reload, без page errors і горизонтального overflow. Повний прохід до імені: Пройдисвіт 1, Чарівник 5, Соркадін 7, Чародій 20. UI-probe мав попередження Google One Tap про відсутній акаунт ізольованого браузера; маленьку кнопку очищення пошуку виправлено. Скріншоти: `tmp/ui-qa/preset-titles/`, composite: `tmp/ui-qa/20261010-145300/composite.png`. Реальне створення в production DB не запускалося; запити та повтори перевірено тестами з mocked actions. Commit/push/deploy не виконувались.


## Правки ілюстрацій — 2026-10-11

За запитом власника показані портрети Хадозі, Три-кріна та Автогнома стали стандартними расовими ілюстраціями AI-режиму. Копії з хешем: `public/images/races/hadozee-3bb34d1d2f.webp`, `public/images/races/thri_kreen-15344e36d9.webp`, `public/images/races/autognome-4c6d78b319.webp`. Для кожної явно збережено книжкову заміну no-ai. Расовий Автогном використовує саме попередній портрет, який показав власник; пресет бойового коваля отримав окрему нову сцену.

Вбудованим imagegen перегенеровано Фантома (Королева Круків, талісман душі, примарні відлуння), Вартового дракона (видимий людський слідопит і малий безкрилий дрейк на камені) та всіх пʼятьох винахідників: польова алхімія, ботанічна алхімія, магічний обладунок, артилерійський полігон, обслуговування сталевого захисника. Персонажі винахідників збережені за оригінальними референсами.

- rogue-phantom-2014: `public/images/presets/rogue-phantom-2014-fb82638518.webp`; промпт: `data/subclass-art/prompts/presets/preset-rogue-phantom-2014-v2.txt`; PNG: `data/subclass-art/generated/presets/preset-rogue-phantom-2014-v2.png`.
- ranger-drakewarden-2014: `public/images/presets/ranger-drakewarden-2014-255411b581.webp`; промпт: `data/subclass-art/prompts/presets/preset-ranger-drakewarden-2014-v2.txt`; PNG: `data/subclass-art/generated/presets/preset-ranger-drakewarden-2014-v2.png`.
- artificer-alchemist-2014: `public/images/presets/artificer-alchemist-2014-7e71d8bfaa.webp`; промпт: `data/subclass-art/prompts/presets/preset-artificer-alchemist-2014-v2.txt`; PNG: `data/subclass-art/generated/presets/preset-artificer-alchemist-2014-v2.png`.
- artificer-alchemist-fairy-2014: `public/images/presets/artificer-alchemist-fairy-2014-ed84a85d2d.webp`; промпт: `data/subclass-art/prompts/presets/preset-artificer-alchemist-fairy-2014-v2.txt`; PNG: `data/subclass-art/generated/presets/preset-artificer-alchemist-fairy-2014-v2.png`.
- artificer-armorer-vedalken-2014: `public/images/presets/artificer-armorer-vedalken-2014-6e13525bc7.webp`; промпт: `data/subclass-art/prompts/presets/preset-artificer-armorer-vedalken-2014-v2.txt`; PNG: `data/subclass-art/generated/presets/preset-artificer-armorer-vedalken-2014-v2.png`.
- artificer-artillerist-centaur-2014: `public/images/presets/artificer-artillerist-centaur-2014-88ac2c9ac8.webp`; промпт: `data/subclass-art/prompts/presets/preset-artificer-artillerist-centaur-2014-v2.txt`; PNG: `data/subclass-art/generated/presets/preset-artificer-artillerist-centaur-2014-v2.png`.
- artificer-battle-smith-autognome-2014: `public/images/presets/artificer-battle-smith-autognome-2014-d91debc4ce.webp`; промпт: `data/subclass-art/prompts/presets/preset-artificer-battle-smith-autognome-2014-v2.txt`; PNG: `data/subclass-art/generated/presets/preset-artificer-battle-smith-autognome-2014-v2.png`.

Посилання оновлено в ready-builds та build-specs. Усі сім WebP перевірені: 1672×941, quality 82, effort 5, хеш у назві для обходу кешу. «Соркадін» перейменовано на «Чародин» у пресеті, рецепті, короткому заголовку картки, українському гайді, робочому аркуші та пошукових даних; технічні англійські slug не змінені.

Перевірка: 69 тестів у пʼяти цільових файлах пройшли (расовий арт, no-ai, підключення арту, галерея, публічні пресети); ESLint змінених TypeScript-файлів пройшов. clean-code-guard: clean. Commit/push/deploy не виконувалися.


## Порядок класів за простотою — 2026-10-11

За субʼєктивним рейтингом власника фільтри та групи карток галереї готових персонажів упорядковано так: Воїн, Варвар, Пройдисвіт, Паладин, Слідопит, Клірик, Чародій, Бард, Монах, Кривавий мисливець, Чарівник, Винахідник, Чорнокнижник, Друїд. Відповідники власникових Жреця, Мисливця за кровʼю та Чаклуна залишаються чинними назвами платформи. Спільний comparator у ready-preset-catalog; порядок усередині класу стабільний, вхідний масив не мутується.

16 тестів галереї й публічних пресетів пройшли; після звірки назви Кривавого мисливця 11 тестів галереї повторно пройшли. ESLint і ui-check чисті. WebKit 375px / Chromium 1280px: порядок та компонування перевірені, overflow немає. Лише попередження Google One Tap про порожній список акаунтів ізольованого браузера. Скріншот: `tmp/ui-qa/20261011-071327/composite.png`. clean-code-guard: clean. Власний сервер 3201 зупинено, додані ним include у tsconfig прибрані; сервер власника не змінювався. Commit/push/deploy не виконувалися.


## Помітніший вхід у пресети — 2026-10-11

У CharacterCreateHeader кнопка «Готові персонажі» отримала UserRoundCheck, позначку «Нове» та підказку «Оберіть білд і дайте імʼя». На телефоні посилання займає всю ширину, службові кнопки лишаються нижче; горизонтальна шапка починається з lg, щоб не стискати її на планшеті. Наявні ModeLink, аналітика та умова доступності пресетів збережені.

7 тестів аналітики/no-ai пройшли; ESLint і ui-check чисті. WebKit 375px / Chromium 1280px: вигляд перевірений, overflow немає. Tap у WebKit відкриває галерею в AI й no-ai та зберігає режим у URL. Попередження UI-probe стосуються наявних англійських підписів рас 11px і Google One Tap у порожньому ізольованому профілі. Composite: `tmp/ui-qa/20261011-071730/composite.png`. clean-code-guard: clean. Власний сервер 3201 зупинено, його include прибрано з tsconfig; сервер власника не змінювався. Commit/push/deploy не виконувалися.


## Різні сюжети Чарівників і виправлення борід — 2026-10-12

Перероблено 17 портретів, усі одразу стиснуті у WebP та підключені. Оновлено джерельні сюжети і вимоги до облич; точні нові промпти лежать поза текою, яку очищає генератор batch-файлів. [Результати, шляхи до WebP і промптів, перевірка](wizard-art-revision-2026-10-12.md). [Пресети без власного портрета — 16 із 135](presets-without-portraits-2026-10-12.md). 71 тест пройшов, commit/push/deploy не виконувалися.
