# Гідрація включених статей 2014 — 2026-10-04

Власник погодив початкові чотири назви, потім усі 15 назв з таблиці English → Ukrainian,
і відхилив 11 хоумбрю-гайдів. Їхні джерела мають
`excluded`; JSON збережено, список, прямий читач, API та корпус публікації їх не видають.
Публічні RPGbot-індекси обмежено 2014; чернетки 2024 зберігаються для майбутнього рішення.

Додано повні українські правила Wild Companion, Cantrip Versatility (окремо Cleric і Druid),
Blessed Strikes та Cartomancer до `data/rpgbot/feature-descriptions-2014.json`.
Генератор бере ці описи й 1217 наявних seed-описів без БД та додає посилання заклинань.
Оригінал Cartomancer — запис BMT, с. 49, зі зафіксованої ревізії 5etools у `sources/cartomancer-2014.json`.

Взаємні прив’язки поширено на порівняння 13 класів 2014: 593 точні feature bindings,
з перевіркою пунктів, каталогових ключів і оцінок. Перевірений набір Монаха — 42 — збережено.
Історії духів Барда та звірі Первісного супутника відкривають повний чинний опис батьківської здібності.

[Аудит контенту](content-hydration-2014-2026-10-04.json): 153 включені статті 2014,
9949 посилань заклинань, 1622 термінів, 4789 адресованих класових умінь, 284 обладнання.
[Залишки позначок](feature-hydration-2014-2026-10-04.json): 40, без порожніх feature-карток.
Назви рівнів і редакційні заголовки не є здібностями. Повноту довільної прози цей аудит не доводить.
Усі погоджені назви внесено до спільного словника. Додано повні правила Martial Versatility
(окремо Fighter, Ranger і Paladin), Magical Inspiration, Bardic Versatility, Eldritch Versatility;
сім списків Additional … Spells, три класові Fighting Style Options та Metamagic Options.
Cartomancer має заголовки Card Tricks і Hidden Ace, обидві згадки відкривають повний опис риси.
Разом генератор читає 1217 наявних seed-описів і 22 перевірені додаткові записи.
Оригінали списків збережено в `data/rpgbot/sources/optional-class-features-tce-2014.json`
з URL тієї самої зафіксованої ревізії; повну книгу не додано до репозиторію.
Залишки: 35 назв рівнів заклинань, два Environment Choices, Best Fighting Styles for Fighters,
Hit Points і редакційне речення про Tasha’s Cauldron of Everything.

[Браузер desktop/phone](abilities-2014-browser-2026-10-04.json): український опис,
вкладена модалка заклинання, Back і фокус, незмінна прокрутка; окремий аналіз Echo Knight
зі збереженням офіційного опису; виключений гайд недоступний у читачі/API.
Streamed not-found у Next має HTTP 200; API видає null, контент гайда не відображається.
Телефон — Chromium з профілем iPhone 13, не Safari.

clean-code-guard: 1 fixed, 0 flagged for author.
`generate-feature-bindings.ts` — відокремлено читання однієї статті від збору всього набору.
ESLint чистий; TypeScript має попередню помилку `.next/types/validator.ts` для відсутнього qa-sign-in.

Повний фінальний `bun run test:no-db --maxWorkers=4`: 477 файлів, 4020 тестів пройшли.
Preview 3218 у копії `/tmp` завершено, тимчасові env-файли видалено; сервер власника не використано.

Після погодження решти назв: 6 цільових файлів, 50 тестів пройшли; ESLint і
`git diff --check` чисті. `clean-code-guard: clean` для нових псевдонімів Cartomancer.
[Додаткова мобільна перевірка](approved-abilities-browser-2026-10-04.json): Magical Inspiration,
Back/фокус/прокрутка, Additional Bard Spells і вкладений Aid — усе пройшло, JS errors: 0.
Перевірено справжній координатний тап по першому рядку багаторядкового посилання;
автоматичний клік Playwright по bounding box потрапляв поза текстом. Force не використовували.

Фінальний повний прогін після погоджених доповнень: `bun run test:no-db --maxWorkers=4`,
479 файлів, 4048 тестів пройшли (95.85 с). Preview зупинено, тимчасові env-файли видалено.
