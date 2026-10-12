# Як генерувати: уся черга (портрети й підкласи)

## Що кинути в ChatGPT

Прикріпи файл `all-prompts.txt` (132 промптів) і надішли першим повідомленням оцей текст:

---

У прикріпленому файлі 132 пронумерованих блоків. Кожен блок — готовий промпт для генерації
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
5. Перед кожним зображенням напиши одним рядком «номер/усього імʼя-файлу» (наприклад `3/132 preset-fighter-champion-greataxe-2014`) — більше нічого.
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

Поруч лежать ті самі промпти, порізані на 7 партій по 20 — `batch-01.txt` … Тоді
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
`bunx tsx scripts/build-subclass-art-prompts.ts all` — і промпти перезберуться.

## Відповідність

| № | Файл | Що покриває |
|---|---|---|
| 1 | `preset-monk-shadow-2014.png` | готовий персонаж |
| 2 | `preset-barbarian-berserker-2014.png` | готовий персонаж |
| 3 | `preset-fighter-champion-greataxe-2014.png` | готовий персонаж |
| 4 | `preset-fighter-champion-shield-2014.png` | готовий персонаж |
| 5 | `preset-monk-open-hand-2014.png` | готовий персонаж |
| 6 | `preset-rogue-thief-2014.png` | готовий персонаж |
| 7 | `monk-mercy.png` | WAY_OF_MERCY, WARRIOR_OF_MERCY |
| 8 | `fighter-champion.png` | CHAMPION |
| 9 | `fighter-battle-master.png` | BATTLE_MASTER |
| 10 | `fighter-eldritch-knight.png` | ELDRITCH_KNIGHT |
| 11 | `fighter-echo-knight.png` | ECHO_KNIGHT |
| 12 | `fighter-arcane-archer.png` | ARCANE_ARCHER |
| 13 | `fighter-psi-warrior.png` | PSI_WARRIOR |
| 14 | `fighter-rune-knight.png` | RUNE_KNIGHT |
| 15 | `fighter-samurai.png` | SAMURAI |
| 16 | `fighter-cavalier.png` | CAVALIER |
| 17 | `fighter-banneret.png` | BANNERET |
| 18 | `rogue-thief.png` | THIEF |
| 19 | `rogue-inquisitive.png` | INQUISITIVE |
| 20 | `rogue-mastermind.png` | MASTERMIND |
| 21 | `rogue-arcane-trickster.png` | ARCANE_TRICKSTER |
| 22 | `rogue-soulknife.png` | SOULKNIFE |
| 23 | `rogue-scout.png` | SCOUT |
| 24 | `rogue-assassin.png` | ASSASSIN |
| 25 | `rogue-phantom.png` | PHANTOM |
| 26 | `rogue-swashbuckler.png` | SWASHBUCKLER |
| 27 | `rogue-scion-of-the-three.png` | SCION_OF_THE_THREE |
| 28 | `wizard-scribes.png` | ORDER_OF_SCRIBES |
| 29 | `wizard-war-magic.png` | SCHOOL_OF_WAR_MAGIC |
| 30 | `wizard-divination.png` | SCHOOL_OF_DIVINATION, DIVINER |
| 31 | `wizard-evocation.png` | SCHOOL_OF_EVOCATION, EVOKER |
| 32 | `wizard-graviturgy.png` | SCHOOL_OF_GRAVITURGY |
| 33 | `wizard-conjuration.png` | SCHOOL_OF_CONJURATION, CONJURER |
| 34 | `wizard-illusion.png` | SCHOOL_OF_ILLUSION, ILLUSIONIST |
| 35 | `wizard-necromancy.png` | SCHOOL_OF_NECROMANCY, NECROMANCER |
| 36 | `wizard-abjuration.png` | SCHOOL_OF_ABJURATION, ABJURER |
| 37 | `wizard-transmutation.png` | SCHOOL_OF_TRANSMUTATION, TRANSMUTER |
| 38 | `wizard-bladesinging.png` | SCHOOL_OF_BLADESINGING, BLADESINGER |
| 39 | `wizard-chronurgy.png` | SCHOOL_OF_CHRONURGY |
| 40 | `wizard-enchantment.png` | SCHOOL_OF_ENCHANTMENT, ENCHANTER |
| 41 | `cleric-tempest.png` | TEMPEST_DOMAIN |
| 42 | `cleric-war.png` | WAR_DOMAIN |
| 43 | `cleric-life.png` | LIFE_DOMAIN |
| 44 | `cleric-knowledge.png` | KNOWLEDGE_DOMAIN |
| 45 | `cleric-forge.png` | FORGE_DOMAIN |
| 46 | `cleric-arcana.png` | ARCANA_DOMAIN |
| 47 | `cleric-peace.png` | PEACE_DOMAIN |
| 48 | `cleric-grave.png` | GRAVE_DOMAIN |
| 49 | `cleric-trickery.png` | TRICKERY_DOMAIN |
| 50 | `cleric-order.png` | ORDER_DOMAIN |
| 51 | `cleric-nature.png` | NATURE_DOMAIN |
| 52 | `cleric-light.png` | LIGHT_DOMAIN |
| 53 | `cleric-death.png` | DEATH_DOMAIN |
| 54 | `cleric-twilight.png` | TWILIGHT_DOMAIN |
| 55 | `paladin-devotion.png` | OATH_OF_DEVOTION |
| 56 | `paladin-ancients.png` | OATH_OF_THE_ANCIENTS |
| 57 | `paladin-vengeance.png` | OATH_OF_VENGEANCE |
| 58 | `paladin-conquest.png` | OATH_OF_CONQUEST |
| 59 | `paladin-crown.png` | OATH_OF_THE_CROWN |
| 60 | `paladin-glory.png` | OATH_OF_GLORY |
| 61 | `paladin-redemption.png` | OATH_OF_REDEMPTION |
| 62 | `paladin-oathbreaker.png` | OATHBREAKER |
| 63 | `paladin-watchers.png` | OATH_OF_THE_WATCHERS |
| 64 | `paladin-noble-genies.png` | OATH_OF_THE_NOBLE_GENIES |
| 65 | `barbarian-berserker.png` | PATH_OF_THE_BERSERKER |
| 66 | `barbarian-battlerager.png` | PATH_OF_THE_BATTLERAGER |
| 67 | `barbarian-giant.png` | PATH_OF_THE_GIANT |
| 68 | `barbarian-storm-herald.png` | PATH_OF_THE_STORM_HERALD |
| 69 | `barbarian-wild-magic.png` | PATH_OF_WILD_MAGIC |
| 70 | `barbarian-beast.png` | PATH_OF_THE_BEAST |
| 71 | `barbarian-ancestral-guardian.png` | PATH_OF_THE_ANCESTRAL_GUARDIAN |
| 72 | `barbarian-totem-warrior.png` | PATH_OF_THE_TOTEM_WARRIOR |
| 73 | `barbarian-wild-heart.png` | PATH_OF_THE_WILD_HEART |
| 74 | `barbarian-world-tree.png` | PATH_OF_THE_WORLD_TREE |
| 75 | `barbarian-zealot.png` | PATH_OF_THE_ZEALOT |
| 76 | `ranger-drakewarden.png` | DRAKEWARDEN |
| 77 | `ranger-beast-master.png` | BEAST_MASTER_CONCLAVE, BEAST_MASTER |
| 78 | `ranger-horizon-walker.png` | HORIZON_WALKER_CONCLAVE |
| 79 | `ranger-hunter.png` | HUNTER_CONCLAVE, HUNTER |
| 80 | `ranger-gloom-stalker.png` | GLOOM_STALKER_CONCLAVE, GLOOM_STALKER |
| 81 | `ranger-monster-slayer.png` | MONSTER_SLAYER_CONCLAVE |
| 82 | `ranger-fey-wanderer.png` | FEY_WANDERER |
| 83 | `ranger-swarmkeeper.png` | SWARMKEEPER |
| 84 | `ranger-winter-walker.png` | WINTER_WALKER |
| 85 | `ranger-hollow-warden.png` | HOLLOW_WARDEN |
| 86 | `bard-glamour.png` | COLLEGE_OF_GLAMOUR |
| 87 | `bard-valor.png` | COLLEGE_OF_VALOR |
| 88 | `bard-spirits.png` | COLLEGE_OF_SPIRITS |
| 89 | `bard-lore.png` | COLLEGE_OF_LORE |
| 90 | `bard-eloquence.png` | COLLEGE_OF_ELOQUENCE |
| 91 | `bard-swords.png` | COLLEGE_OF_SWORDS |
| 92 | `bard-creation.png` | COLLEGE_OF_CREATION |
| 93 | `bard-whispers.png` | COLLEGE_OF_WHISPERS |
| 94 | `bard-moon.png` | COLLEGE_OF_THE_MOON |
| 95 | `bard-dance.png` | COLLEGE_OF_DANCE |
| 96 | `druid-wildfire.png` | CIRCLE_OF_WILDFIRE |
| 97 | `druid-land.png` | CIRCLE_OF_THE_LAND |
| 98 | `druid-stars.png` | CIRCLE_OF_STARS, CIRCLE_OF_THE_STARS |
| 99 | `druid-moon.png` | CIRCLE_OF_THE_MOON |
| 100 | `druid-sea.png` | CIRCLE_OF_THE_SEA |
| 101 | `druid-shepherd.png` | CIRCLE_OF_THE_SHEPHERD |
| 102 | `druid-dreams.png` | CIRCLE_OF_DREAMS |
| 103 | `druid-spores.png` | CIRCLE_OF_SPORES |
| 104 | `sorcerer-aberrant-mind.png` | ABERRANT_MIND, ABERRANT_SORCERY |
| 105 | `sorcerer-divine-soul.png` | DIVINE_SOUL |
| 106 | `sorcerer-wild-magic.png` | WILD_MAGIC, WILD_MAGIC_SORCERY |
| 107 | `sorcerer-draconic.png` | DRACONIC_BLOODLINE, DRACONIC_SORCERY |
| 108 | `sorcerer-shadow.png` | SHADOW_MAGIC, SHADOW_SORCERY |
| 109 | `sorcerer-storm.png` | STORM_SORCERY |
| 110 | `sorcerer-clockwork.png` | CLOCKWORK_SOUL, CLOCKWORK_SORCERY |
| 111 | `sorcerer-lunar.png` | LUNAR_SORCERY |
| 112 | `sorcerer-spellfire.png` | SPELLFIRE_SORCERY |
| 113 | `warlock-archfey.png` | ARCHFEY, ARCHFEY_PATRON |
| 114 | `warlock-fathomless.png` | FATHOMLESS |
| 115 | `warlock-hexblade.png` | HEXBLADE |
| 116 | `warlock-genie.png` | THE_GENIE |
| 117 | `warlock-celestial.png` | CELESTIAL, CELESTIAL_PATRON |
| 118 | `warlock-undead.png` | UNDEAD, UNDEAD_PATRON |
| 119 | `warlock-undying.png` | UNDYING |
| 120 | `warlock-fiend.png` | FIEND, FIEND_PATRON |
| 121 | `warlock-great-old-one.png` | GREAT_OLD_ONE, GREAT_OLD_ONE_PATRON |
| 122 | `warlock-vestige.png` | VESTIGE_PATRON |
| 123 | `artificer-alchemist.png` | ALCHEMIST |
| 124 | `artificer-artillerist.png` | ARTILLERIST |
| 125 | `artificer-battle-smith.png` | BATTLE_SMITH |
| 126 | `artificer-armorer.png` | ARMORER |
| 127 | `artificer-cartographer.png` | CARTOGRAPHER |
| 128 | `artificer-reanimator.png` | REANIMATOR |
| 129 | `blood-hunter-lycan.png` | ORDER_OF_THE_LYCAN |
| 130 | `blood-hunter-ghostslayer.png` | ORDER_OF_THE_GHOSTSLAYER |
| 131 | `blood-hunter-mutant.png` | ORDER_OF_THE_MUTANT |
| 132 | `blood-hunter-profane-soul.png` | ORDER_OF_THE_PROFANE_SOUL |
