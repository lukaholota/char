# Як генерувати: Портрети готових персонажів (решта)

## Що кинути в ChatGPT

Прикріпи файл `all-prompts.txt` (112 промптів) і надішли першим повідомленням оцей текст:

---

У прикріпленому файлі 112 пронумерованих блоків. Кожен блок — готовий промпт для генерації
ОДНОГО окремого зображення, у якому вже все підставлено. Працюй автономно, без моєї участі, поки не
дійдеш до кінця списку.

Правила:
1. Генеруй по одному зображенню на повідомлення, суворо в порядку нумерації.
2. Кожне зображення — окремий кадр на весь екран, 16:9 (1672×941, якщо інструмент дає вибір; інакше
   найширший горизонтальний формат). НЕ роби колаж, сітку, галерею, контактний аркуш, розкадрування,
   диптих чи типтих і не клади кілька блоків в один кадр.
3. На зображенні не має бути жодного тексту: ні літер, ні цифр, ні підписів, ні назви файлу, ні
   водяних знаків, ні рамки чи полів.
4. Текст промпта бери з блока дослівно. Нічого не додавай, не скорочуй і не «покращуй».
5. Перед кожним зображенням напиши одним рядком «номер/усього імʼя-файлу» (наприклад `3/112 preset-artificer-armorer-vedalken-2014`) — більше нічого.
6. Не питай підтвердження, чи продовжувати, не роби пауз і не підсумовуй. Зупиняйся лише після
   останнього блока.
7. Якщо зображення заблоковане фільтром безпеки, не зупиняйся: ОДИН раз повтори той самий блок, зробивши
   сцену спокійнішою — без будь-якої шкоди чи загрози людям і без зброї поруч із ними, але лишивши
   композицію, ракурс і колір. Якщо знову заблоковано — напиши `SKIPPED: імʼя-файлу` і йди до наступного блока.
8. Після останнього блока виведи одним рядком усі SKIPPED, якщо вони були.
9. Якщо обірвешся — я скажу номер, з якого продовжити.

Почни з блока 1.

---

## Якщо сесія не тягне весь файл

Поруч лежать ті самі промпти, порізані на 6 партій по 20 — `batch-01.txt` … Тоді
прикріплюй партію замість `all-prompts.txt`, текст першого повідомлення той самий. Нумерація в партіях
наскрізна, тож «продовжуй з номера N» працює й там.

## Що робити з результатом

Збережи кожне зображення під іменем із рядка над ним, усі в одну теку і скинь її в Завантаження — далі я
сконвертую у webp, розкладу по теках і підключу. Для підкласів одна картинка обслуговує обидві
редакції (відповідність нижче); портрети готових персонажів ідуть у `public/images/presets/`.

## Якщо ChatGPT зробив колаж або поставив текст

Відповідай: «Це колаж. Згенеруй тільки блок N: одне зображення на весь кадр 16:9, без тексту».
Не переробляй картинку руками.

## Якщо зображення не вийшло або SKIPPED

Правиться сюжет у `data/subclass-art/` (файл класу або `portraits.json`, один запис), далі
`bunx tsx scripts/build-subclass-art-prompts.ts presets` — і промпти перезберуться.

## Відповідність

| № | Файл | Що покриває |
|---|---|---|
| 1 | `preset-artificer-alchemist-2014.png` | готовий персонаж |
| 2 | `preset-artificer-alchemist-fairy-2014.png` | готовий персонаж |
| 3 | `preset-artificer-armorer-vedalken-2014.png` | готовий персонаж |
| 4 | `preset-artificer-artillerist-centaur-2014.png` | готовий персонаж |
| 5 | `preset-artificer-battle-smith-autognome-2014.png` | готовий персонаж |
| 6 | `preset-barbarian-battlerager-2014.png` | готовий персонаж |
| 7 | `preset-barbarian-path-of-the-beast-2014.png` | готовий персонаж |
| 8 | `preset-barbarian-path-of-the-giant-2014.png` | готовий персонаж |
| 9 | `preset-barbarian-path-of-wild-magic-2014.png` | готовий персонаж |
| 10 | `preset-barbarian-storm-herald-2014.png` | готовий персонаж |
| 11 | `preset-barbarian-totem-warrior-2014.png` | готовий персонаж |
| 12 | `preset-barbarian-zealot-2014.png` | готовий персонаж |
| 13 | `preset-bard-creation-2014.png` | готовий персонаж |
| 14 | `preset-bard-eloquence-2014.png` | готовий персонаж |
| 15 | `preset-bard-lore-2014.png` | готовий персонаж |
| 16 | `preset-bard-lore-sorcerers-apprentice-2014.png` | готовий персонаж |
| 17 | `preset-bard-spirits-2014.png` | готовий персонаж |
| 18 | `preset-bard-swords-2014.png` | готовий персонаж |
| 19 | `preset-bard-valor-2014.png` | готовий персонаж |
| 20 | `preset-bard-whispers-2014.png` | готовий персонаж |
| 21 | `preset-bugbear-ambush-caster-2014.png` | готовий персонаж |
| 22 | `preset-bugbear-fiend-warlock-2014.png` | готовий персонаж |
| 23 | `preset-cleric-death-2014.png` | готовий персонаж |
| 24 | `preset-cleric-forge-2014.png` | готовий персонаж |
| 25 | `preset-cleric-grave-2014.png` | готовий персонаж |
| 26 | `preset-cleric-knowledge-2014.png` | готовий персонаж |
| 27 | `preset-cleric-life-2014.png` | готовий персонаж |
| 28 | `preset-cleric-light-2014.png` | готовий персонаж |
| 29 | `preset-cleric-order-2014.png` | готовий персонаж |
| 30 | `preset-cleric-peace-2014.png` | готовий персонаж |
| 31 | `preset-cleric-tempest-2014.png` | готовий персонаж |
| 32 | `preset-cleric-twilight-2014.png` | готовий персонаж |
| 33 | `preset-cleric-war-2014.png` | готовий персонаж |
| 34 | `preset-d4-dispenser-cleric-peace-2014.png` | готовий персонаж |
| 35 | `preset-druid-dreams-githzerai-2014.png` | готовий персонаж |
| 36 | `preset-druid-land-2014.png` | готовий персонаж |
| 37 | `preset-druid-land-owlin-2014.png` | готовий персонаж |
| 38 | `preset-druid-moon-stout-halfling-2014.png` | готовий персонаж |
| 39 | `preset-druid-shepherd-satyr-2014.png` | готовий персонаж |
| 40 | `preset-druid-spores-tortle-2014.png` | готовий персонаж |
| 41 | `preset-druid-stars-loxodon-2014.png` | готовий персонаж |
| 42 | `preset-druid-wildfire-tortle-2014.png` | готовий персонаж |
| 43 | `preset-fighter-arcane-archer-2014.png` | готовий персонаж |
| 44 | `preset-fighter-battle-master-2014.png` | готовий персонаж |
| 45 | `preset-fighter-cavalier-2014.png` | готовий персонаж |
| 46 | `preset-fighter-eldritch-knight-2014.png` | готовий персонаж |
| 47 | `preset-fighter-psi-warrior-2014.png` | готовий персонаж |
| 48 | `preset-fighter-purple-dragon-knight-2014.png` | готовий персонаж |
| 49 | `preset-fighter-rune-knight-goliath-2014.png` | готовий персонаж |
| 50 | `preset-fighter-samurai-2014.png` | готовий персонаж |
| 51 | `preset-hexadin-ancients-2014.png` | готовий персонаж |
| 52 | `preset-hexbuckler-swashbuckler-2014.png` | готовий персонаж |
| 53 | `preset-monk-ascendant-dragon-2014.png` | готовий персонаж |
| 54 | `preset-monk-astral-self-2014.png` | готовий персонаж |
| 55 | `preset-monk-drunken-master-2014.png` | готовий персонаж |
| 56 | `preset-monk-four-elements-2014.png` | готовий персонаж |
| 57 | `preset-monk-human-open-hand-2014.png` | готовий персонаж |
| 58 | `preset-monk-kensei-2014.png` | готовий персонаж |
| 59 | `preset-monk-sun-soul-2014.png` | готовий персонаж |
| 60 | `preset-paladin-devotion-2014.png` | готовий персонаж |
| 61 | `preset-paladin-oath-of-conquest-2014.png` | готовий персонаж |
| 62 | `preset-paladin-oath-of-devotion-2014.png` | готовий персонаж |
| 63 | `preset-paladin-oath-of-glory-2014.png` | готовий персонаж |
| 64 | `preset-paladin-oath-of-the-crown-2014.png` | готовий персонаж |
| 65 | `preset-paladin-oath-of-vengeance-2-2014.png` | готовий персонаж |
| 66 | `preset-paladin-oath-of-vengeance-2014.png` | готовий персонаж |
| 67 | `preset-ranger-beast-master-2014.png` | готовий персонаж |
| 68 | `preset-ranger-fey-wanderer-2014.png` | готовий персонаж |
| 69 | `preset-ranger-gloom-stalker-2014.png` | готовий персонаж |
| 70 | `preset-ranger-horizon-walker-bugbear-2014.png` | готовий персонаж |
| 71 | `preset-ranger-hunter-2014.png` | готовий персонаж |
| 72 | `preset-ranger-hunter-leonin-2014.png` | готовий персонаж |
| 73 | `preset-ranger-monster-slayer-variant-human-2014.png` | готовий персонаж |
| 74 | `preset-ranger-swarmkeeper-custom-lineage-2014.png` | готовий персонаж |
| 75 | `preset-rogue-assassin-2014.png` | готовий персонаж |
| 76 | `preset-rogue-inquisitive-2014.png` | готовий персонаж |
| 77 | `preset-rogue-mastermind-2014.png` | готовий персонаж |
| 78 | `preset-rogue-phantom-2014.png` | готовий персонаж |
| 79 | `preset-rogue-scout-2014.png` | готовий персонаж |
| 80 | `preset-rogue-soulknife-2014.png` | готовий персонаж |
| 81 | `preset-rogue-swashbuckler-2014.png` | готовий персонаж |
| 82 | `preset-sorcadin-clockwork-2014.png` | готовий персонаж |
| 83 | `preset-sorcerer-aarakocra-storm-sorcery-2014.png` | готовий персонаж |
| 84 | `preset-sorcerer-divine-soul-2014.png` | готовий персонаж |
| 85 | `preset-sorcerer-draconic-2014.png` | готовий персонаж |
| 86 | `preset-sorcerer-lunar-sorcery-2014.png` | готовий персонаж |
| 87 | `preset-sorcerer-silver-dragonborn-draconic-bloodline-2014.png` | готовий персонаж |
| 88 | `preset-sorcerer-variant-human-storm-sorcery-tempest-2014.png` | готовий персонаж |
| 89 | `preset-sorcerer-warforged-aberrant-mind-2014.png` | готовий персонаж |
| 90 | `preset-warlock-fallen-aasimar-undead-2014.png` | готовий персонаж |
| 91 | `preset-warlock-fiend-2014.png` | готовий персонаж |
| 92 | `preset-warlock-genie-2014.png` | готовий персонаж |
| 93 | `preset-warlock-hexblade-2014.png` | готовий персонаж |
| 94 | `preset-warlock-kenku-great-old-one-2014.png` | готовий персонаж |
| 95 | `preset-warlock-stout-halfling-celestial-2014.png` | готовий персонаж |
| 96 | `preset-warlock-tiefling-archfey-2014.png` | готовий персонаж |
| 97 | `preset-warlock-tiefling-fiend-iconic-2014.png` | готовий персонаж |
| 98 | `preset-warlock-undying-2014.png` | готовий персонаж |
| 99 | `preset-warlock-variant-human-fathomless-2014.png` | готовий персонаж |
| 100 | `preset-wizard-abjuration-2014.png` | готовий персонаж |
| 101 | `preset-wizard-bladesinging-2014.png` | готовий персонаж |
| 102 | `preset-wizard-chronurgy-magic-2014.png` | готовий персонаж |
| 103 | `preset-wizard-conjuration-2014.png` | готовий персонаж |
| 104 | `preset-wizard-divination-2014.png` | готовий персонаж |
| 105 | `preset-wizard-enchantment-2014.png` | готовий персонаж |
| 106 | `preset-wizard-evocation-2014.png` | готовий персонаж |
| 107 | `preset-wizard-evoker-2014.png` | готовий персонаж |
| 108 | `preset-wizard-illusion-2014.png` | готовий персонаж |
| 109 | `preset-wizard-necromancy-2014.png` | готовий персонаж |
| 110 | `preset-wizard-scribes-2014.png` | готовий персонаж |
| 111 | `preset-wizard-transmutation-2014.png` | готовий персонаж |
| 112 | `preset-wizard-war-magic-2014.png` | готовий персонаж |
