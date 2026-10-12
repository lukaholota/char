Повні перекладені статті зберігаються окремими `<articleId>.json` за
`documentSchema`. Перші файли — `rpgbot-reborn-2024.json`,
`rpgbot-plasmoid-2014.json`, `rpgbot-dual-wielder-2024.json`,
`rpgbot-planescape-backgrounds-feats-2014.json`,
`rpgbot-animating-the-dead-2014.json`,
`rpgbot-barbarian-subclasses-2024.json`, `rpgbot-champion-2014.json` і
`rpgbot-hexbuckler-2014.json`, `rpgbot-super-mario-jump-2014.json` і
`rpgbot-replicate-magic-item-2024.json` і
`rpgbot-sorcerer-2024.json`, `rpgbot-fighter-2014.json` і
`rpgbot-champion-2024.json`, `rpgbot-wild-magic-2024.json` і одинадцять
коротких гайдів рис 2024, повні
структурні переклади як `unpublished/draft`.
Вони ще не мають редакторського статусу `reviewed` і не входять до публічного
індексу. Технічні fixtures живуть лише в тестах KR49.2.

Для довгого списку предметів у Replicate Magic Item переклад спершу записано
в [пласкому аркуші](../authoring/replicate-magic-item-2024.md), після чого
`scripts/rpgbot/compile-list-pilot.py` перевіряє ключі, посилання й оцінки та
створює JSON. Повторний `--apply` не перезаписує відредаговані файли.

Класовий гайд Чародія 2024 записано в
[аркуші](../authoring/sorcerer-2024.md), зокрема таблицю характеристик і
244 оцінки. `scripts/rpgbot/compile-class-pilot.py` перевіряє всі 339
фрагментів та 229 URL; його `--apply` створює чернетку й технічний review
лише за відсутності обох файлів.

Класовий гайд Воїна 2014 має
[аркуш](../authoring/fighter-2014.md) із 436 перекладеними полями.
`scripts/rpgbot/compile-fighter-pilot.py` звіряє 231 URL, три таблиці й
233 оцінені варіанти та створює JSON і технічний review без перезапису.
Пʼять неоднозначних source-сигналів залишено для редакторського рішення.

Гайд із підкласу Чемпіона 2024 має
[аркуш](../authoring/champion-2024.md) із 172 перекладеними полями.
`scripts/rpgbot/compile-champion-2024-pilot.py` звіряє 29 URL, три таблиці
й 13 оцінок; обидва розділи характеристик з однаковим HTML-id зберігаються
під окремими section IDs.

Гайд Чародія Дикої Магії 2024 має
[аркуш](../authoring/wild-magic-2024.md) із 143 перекладеними полями.
`scripts/rpgbot/compile-wild-magic-2024-pilot.py` звіряє 34 URL і пʼять
оцінок; його exporter не плутає заголовок у змісті з оціненим умінням.

Для коротких окремих рис із простими абзацами
`scripts/rpgbot/short-feat-2024.py` створює плаский worksheet і перевіряє
всі оцінені заголовки до складання приватного JSON. Перший пакет:
`rpgbot-delicious-pain-2024.json`, `rpgbot-rebuke-2024.json`,
`rpgbot-light-bringer-2024.json`, `rpgbot-putrefy-2024.json`,
`rpgbot-bomber-2024.json`. Другий пакет:
`rpgbot-vampires-plaything-2024.json`, `rpgbot-love-bites-2024.json`,
`rpgbot-cloying-mists-2024.json`, `rpgbot-treacherous-allure-2024.json`,
`rpgbot-bloodlust-2024.json`. Додатково:
`rpgbot-symbiotic-being-2024.json`. Складніші сторінки цей вузький конвеєр відхиляє.
