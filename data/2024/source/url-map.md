# Карта URL — dnd2024.wikidot.com

Складено 2026-08-15 під час KR6.2. Джерело — `dnd2024.wikidot.com`, фанатська вікі, URL-патерн
Wikidot: `<namespace>:<slug>`, індексна сторінка кожного типу — `<namespace>:all`.

Повний перелік сторінок сайту знято через `system:list-all-pages` (8 сторінок пагінації,
`p/1`–`p/8`), 1536 унікальних посилань після дедуплікації. Розподіл за префіксом namespace:

| Namespace | Сторінок | Що це |
|---|---|---|
| `spell:` | 445 | заклинання (+ 8 сторінок шкіл магії, `spell:all`) |
| `magic-item:` | 418 (400 досяжні з `magic-item:all`¹) | магічні предмети (+ `magic-item:all`) |
| `feat:` | 179 | риси, категоризовані на сторінці `feat:all` (Origin/General/Fighting Style/Epic Boon + Dragonmark/Planar Pact/Dark Gift) |
| `ua:` | 160 | Unearthed Arcana — плейтест, **поза межами**, не офіційний контент |
| `background:` | 64 | походження (+ `background:all`, `background:link-collection`) |
| `species:` | 27 | види (+ `species:all`, `species:link-collection`) |
| 12 класових namespace (`sorcerer:`…`fighter:`) | 8–17 кожен | огляд класу (`:main`), підкласи, у деяких — `:spell-list` |
| `artificer:` | 8 | окремо — див. нижче |
| `equipment:` | 11 | зброя, броня, спорядження, крафтинг, валюта, отрута тощо |

## Метод: як розрізнити PHB 2024 від решти контенту вікі

Кожна сторінка-сутність містить рядок `Source: <книга>`. Це дозволило відокремити core PHB 2024
від пізніших 2024-джерел без здогадок за назвою:

- `Source: Player's Handbook` → **core, у межах KR6.2**
- `Source: Forgotten Realms - Heroes of Faerun`, `Source: Ravenloft - The Horrors Within`,
  `Source: Eberron - Forge of the Artificer`, `Source: D&D Beyond Drops - <місяць>` → пізніші
  2024-джерела, **поза межами** цього KR
- Індексні сторінки (`*:all`) і агреговані таблиці (`equipment:weapon`, `equipment:armor`) джерела
  на рівні одного запису не мають — класифіковані окремо

Метод перевірено практично: на сторінці `feat:all` категорії Origin/General/Fighting
Style/Epic Boon самі містять секції з не-PHB контентом (наприклад «Origin Feats» включає і
10 справжніх PHB-рис, і Forgotten-Realms-фракційні риси в тому самому списку без явного
розділювача) — саме тому позиція в списку **не** є надійним критерієм, а `Source:` — є.
Це впіймало реальні помилки: `Sharp Eye`/`Survivor` виглядали як Origin-риси за позицією в
списку, але насправді `Source: Ravenloft`; `Pack Fighting`/`Prone Fighting`/`Shifting
Combatant`/`Tactical Combatant` — не PHB узагалі.

## Обсяг за типом: PHB 2024 core проти 2014

| Тип | PHB 2024 core (перевірено) | 2014 (для порівняння) |
|---|---|---|
| Види (`species`) | **10** — Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling | 66 рас (усі книги) |
| Походження (`background`) | **16** — 15 наявних `*_2024`-заглушок + Acolyte (відсутній серед заглушок) | 90 (з них 15 — самі заглушки) |
| Класи (`class`) | **12** — Artificer НЕ входить (див. нижче) | 13 |
| Підкласи (`subclass`) | **48** (12 класів × 4) | 118 |
| Риси (`feat`) | **74** — 10 Origin + 42 General + 10 Fighting Style + 12 Epic Boon | 92 |
| Зброя (`equipment:weapon`) | 38 записів, кожен із властивістю mastery | — (концепції mastery в 2014 немає) |

**Важлива знахідка: Artificer не входить у core PHB 2024.** Сторінка `artificer:main` сама має
`Source: Eberron - Forge of the Artificer`, і всі 6 підкласів на вікі під `artificer:` теж не
PHB (5 — Eberron, 1 — Ravenloft). 2024-оновлення Винахідника ще не випущене в PHB; якщо
зʼявиться пізніше окремою книгою, це нова робота поза цим KR.

## Скрейплено в цій сесії (Phase 1, `data/2024/source/raw/`)

235 сторінок, повний перелік і хеші — `provenance-manifest.json`
(`webScrapeSnapshots[0].pages`). Категорії: `species` (11 = 10 + `all`), `background`
(17 = 16 + `all`), `feat` (82 = 74 core + 6 не-core, знайдені під час фільтрації + `all`),
`equipment` (3: `weapon`, `armor`, `all`), `class` (13 = 12 core `:main` + Artificer),
`subclass` (68 = 48 core + 17 не-core, знайдені при переборі списку підкласів класу + 3 дублікати
перевірки), `spell` (41 = `all` + 40 кандидатів «лише у 2024» для звірки перейменувань/нового).

¹ Первісний підрахунок 418 — з повного `system:list-all-pages` (сесія Phase 1, увесь сайт).
`magic-item:all` (той самий метод, що `feat:all`/`spell:all` — індексна сторінка з посиланнями на
кожен предмет) лінкує лише на 400 сторінок простору `magic-item:` (396 предметів + 4 навігаційні:
`all`, `crafting`, `consumable`, `type`). Різниця в 18 сторінок — не досліджена: імовірно,
чернетки/переспрямування/сторінки без вхідного посилання з індексу. Не критично для
core-класифікації нижче — вона зроблена прямою перевіркою `Source:` на кожній із 396 сторінок,
не на підрахунку самого namespace.

## Каталог магічних предметів — важлива відмінність від решти категорій

**Джерело core-контенту для магічних предметів — не Player's Handbook, а Dungeon Master's
Guide.** Це відрізняється від кожної іншої категорії в цьому KR (species/background/feat/
subclass/class/spell — усі мають `Source: Player's Handbook` як критерій core). Знайдено Phase 4
прямою перевіркою `Source:` на перших же сторінках: `Amulet of Health` → `Source: Dungeon
Master's Guide`, і так на 349 з 396 сторінок. Це логічно — розділ магічних предметів історично
живе в DMG, не PHB, в обох редакціях (2014-контент цього проєкту в `prisma/seed/magicItemSeed.ts`
теж DMG-походження, не PHB). Рівно **один** предмет тегований `Source: Player's Handbook` —
`Potion of Healing` (входить у стартове спорядження персонажа, тому передрукований у PHB) —
зарахований до core разом із 349 DMG-предметами.

**Метод класифікації: пряма перевірка `Source:` на кожній із 396 сторінок, не довіра до
`magic-item:sources`-навігаційної сторінки.** Вікі має сторінку `magic-item:sources`, що лінкує
на 7 під-сторінок з предметами по не-core джерелах (D&D Beyond Drops, Eberron: Forge of the
Artificer, Forgotten Realms ×2, Lorwyn: First Light, Netheril's Fall, Ravenloft: The Horrors
Within — 41 предмет разом). Швидка перевірка через цей ярлик здавалась достатньою, але **пряма
перевірка `Source:` на всіх 396 сторінках знайшла 5 предметів, яких немає в жодній із цих 7
категорій**: `Cap of Vanishing`, `Pipes of Pestilence`, `Poison-Soaked Kukri`, `Spiked Shield`
(усі — `Source: Welcome to the Hellfire Club`) і `Niko's Mace` (`Source: Uni and the Hunt for the
Lost Horn`) — дві книги, яких навігаційна сторінка взагалі не перелічує. Без прямої перевірки ці
5 потрапили б у core-набір помилково. Той самий клас помилки, що вже ловився раніше (Sharp
Eye/Survivor для рис, Blade of Disaster для заклинань) — позиція/зручний індекс не є надійним
критерієм, `Source:` на самій сторінці — є.

**Підсумок:** 396 сторінок-кандидатів (`magic-item:all` мінус 4 навігаційні), **350 core**
(349 DMG + 1 PHB), **46 не-core** (9 різних джерел). Це набагато більший обсяг, ніж будь-яка
попередня категорія цього KR — понад повний корпус заклинань (391).

## Свідомо відкладено

- **Переклад каталогу магічних предметів.** Скрейп (396 сторінок) і класифікація (350 core / 46
  не-core) закриті Phase 4. Переклад і нормалізація в `data/2024/normalized/magic-items.json` —
  структурний скелет (`ruleset`, `engName`, `itemType`, `rarity`, `requiresAttunement`,
  `descriptionEng` сирий) уже є, `translationStatus: "not started"` на кожному з 350 записів.
  Повний переклад — окрема майбутня сесія.
- **13-й non-core клас** (`ua:` простір, 160 сторінок Unearthed Arcana) — свідомо поза межами
  завжди, не лише цієї сесії: UA не є офіційним фінальним правилом.

**Закрито Phase 2 (2026-08-15, сесія 2):** повний переклад описів усіх 75 core-рис і всіх 240+
фіч 48 core-підкласів (тексту, не лише назв) — деталі в
[kr6.2-extraction-translation.md](../../docs/o6-rules-2024-import/kr6.2-extraction-translation.md).
Мережевий скрейп для цього не знадобився: сирий текст фіч підкласів уже лежав у 68 файлах
`data/2024/source/raw/subclass/`, зібраних Phase 1, — бракувало лише парсингу й перекладу.

**Закрито Phase 3 (2026-08-15, сесія 3):** повний корпус заклинань — доскрейплено 379 сторінок
(мінус 40 уже отримані Phase 1), перекладено й структурно звірено проти 2014-корпусу всі
391 PHB-заклинання. Деталі методу — [kr6.2-extraction-translation.md
§Phase 3](../../docs/o6-rules-2024-import/kr6.2-extraction-translation.md).

**Закрито Phase 4 (2026-08-15, сесія 4):** скрейп і класифікація повного каталогу магічних
предметів — 396 сторінок, 350 core, структурний (неперекладений) скелет у
`data/2024/normalized/magic-items.json`. Деталі методу — [kr6.2-extraction-translation.md
§Phase 4](../../docs/o6-rules-2024-import/kr6.2-extraction-translation.md).
