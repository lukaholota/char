# Звірка імпорту підкласів 2024 — 2026-09-05

Пов’язана робота: [KR31.2](kr31.2-class-choices-2024.md).

## Висновок

На 13 актуальних сторінках класів Wikidot знайдено **76 посилань на підкласи**.
У `data/2024/normalized/subclasses.json` є **48**, усі з PHB 2024; кожен із них
знайдений на відповідній сторінці класу. **28 відсутні**: 20 уже скачані у старому
знімку (68 HTML), ще 8 відсутні навіть у ньому. Вісім нових сторінок позначені
`Source: Arcana Unleashed`.

Це два різні розриви: PHB-фільтр нормалізації та застарілий знімок джерела.
Причина першого зафіксована в [KR6.2](../o6-rules-2024-import/kr6.2-extraction-translation.md),
журнал 2026-08-15: шість підкласів Артифайсера відсіяні як не-PHB, сам клас
залишений як non-core. KR13.1 далі звіряв 48 уже нормалізованих підкласів із базою;
такий знаменник не міг виявити відсутні записи.

## Метод і межі

Прямий HTTP GET через curl до кожної сторінки `http://dnd2024.wikidot.com/<class>:main`,
послідовно з паузами 1,5 с. Із HTML узяті унікальні посилання namespace свого класу;
виключені `main`, `spell-list`, `metamagic`, `eldritch-invocation`.
Порівняння з JSON — пара `(className, engName у форматі slug)`.
Джерело 20 давніх пропусків прочитане зі старого HTML; джерело восьми нових —
зі щойно завантажених сторінок. Це перевірка повноти посилань і нормалізації,
**не** новий аудит механік, текстів, статусу публікації книжок чи прод-бази.
Файли в `/tmp` тимчасові; контрольні суми нижче ідентифікують використані відповіді.

Власник підтвердив Wikidot як пріоритетне джерело для цих матеріалів і надав шість
посилань Артифайсера. Reanimator має джерело Ravenloft, решта п’ять — Eberron.
Імпорт інших знайдених підкласів у цьому вимірі ще не виконаний.

## За класами

| Клас | Wikidot зараз | Нормалізовано | Відсутні |
|---|---:|---:|---:|
| artificer | 6 | 0 | 6 |
| barbarian | 4 | 4 | 0 |
| bard | 6 | 4 | 2 |
| cleric | 7 | 4 | 3 |
| druid | 4 | 4 | 0 |
| fighter | 6 | 4 | 2 |
| monk | 5 | 4 | 1 |
| paladin | 5 | 4 | 1 |
| ranger | 6 | 4 | 2 |
| rogue | 6 | 4 | 2 |
| sorcerer | 6 | 4 | 2 |
| warlock | 6 | 4 | 2 |
| wizard | 9 | 4 | 5 |
| **Разом** | **76** | **48** | **28** |

## Відсутні записи

| Клас | Підклас / URL | Source у HTML | Старий HTML | Normalized |
|---|---|---|---|---|
| artificer | [alchemist](http://dnd2024.wikidot.com/artificer:alchemist) | Eberron - Forge of the Artificer | є | немає |
| artificer | [armorer](http://dnd2024.wikidot.com/artificer:armorer) | Eberron - Forge of the Artificer | є | немає |
| artificer | [artillerist](http://dnd2024.wikidot.com/artificer:artillerist) | Eberron - Forge of the Artificer | є | немає |
| artificer | [battle-smith](http://dnd2024.wikidot.com/artificer:battle-smith) | Eberron - Forge of the Artificer | є | немає |
| artificer | [cartographer](http://dnd2024.wikidot.com/artificer:cartographer) | Eberron - Forge of the Artificer | є | немає |
| artificer | [reanimator](http://dnd2024.wikidot.com/artificer:reanimator) | Ravenloft - The Horrors Within | є | немає |
| bard | [college-of-spirits](http://dnd2024.wikidot.com/bard:college-of-spirits) | Ravenloft - The Horrors Within | є | немає |
| bard | [college-of-the-moon](http://dnd2024.wikidot.com/bard:college-of-the-moon) | Forgotten Realms - Heroes of Faerun | є | немає |
| cleric | [arcana-domain](http://dnd2024.wikidot.com/cleric:arcana-domain) | Arcana Unleashed | немає | немає |
| cleric | [grave-domain](http://dnd2024.wikidot.com/cleric:grave-domain) | Ravenloft - The Horrors Within | є | немає |
| cleric | [knowledge-domain](http://dnd2024.wikidot.com/cleric:knowledge-domain) | Forgotten Realms - Heroes of Faerun | є | немає |
| fighter | [arcane-archer](http://dnd2024.wikidot.com/fighter:arcane-archer) | Arcana Unleashed | немає | немає |
| fighter | [banneret](http://dnd2024.wikidot.com/fighter:banneret) | Forgotten Realms - Heroes of Faerun | є | немає |
| monk | [warrior-of-the-mystic-arts](http://dnd2024.wikidot.com/monk:warrior-of-the-mystic-arts) | Arcana Unleashed | немає | немає |
| paladin | [oath-of-the-noble-genies](http://dnd2024.wikidot.com/paladin:oath-of-the-noble-genies) | Forgotten Realms - Heroes of Faerun | є | немає |
| ranger | [hollow-warden](http://dnd2024.wikidot.com/ranger:hollow-warden) | Ravenloft - The Horrors Within | є | немає |
| ranger | [winter-walker](http://dnd2024.wikidot.com/ranger:winter-walker) | Forgotten Realms - Heroes of Faerun | є | немає |
| rogue | [phantom](http://dnd2024.wikidot.com/rogue:phantom) | Ravenloft - The Horrors Within | є | немає |
| rogue | [scion-of-the-three](http://dnd2024.wikidot.com/rogue:scion-of-the-three) | Forgotten Realms - Heroes of Faerun | є | немає |
| sorcerer | [shadow-sorcery](http://dnd2024.wikidot.com/sorcerer:shadow-sorcery) | Ravenloft - The Horrors Within | є | немає |
| sorcerer | [spellfire-sorcery](http://dnd2024.wikidot.com/sorcerer:spellfire-sorcery) | Forgotten Realms - Heroes of Faerun | є | немає |
| warlock | [undead-patron](http://dnd2024.wikidot.com/warlock:undead-patron) | Ravenloft - The Horrors Within | є | немає |
| warlock | [vestige-patron](http://dnd2024.wikidot.com/warlock:vestige-patron) | Arcana Unleashed | немає | немає |
| wizard | [bladesinger](http://dnd2024.wikidot.com/wizard:bladesinger) | Forgotten Realms - Heroes of Faerun | є | немає |
| wizard | [conjurer](http://dnd2024.wikidot.com/wizard:conjurer) | Arcana Unleashed | немає | немає |
| wizard | [enchanter](http://dnd2024.wikidot.com/wizard:enchanter) | Arcana Unleashed | немає | немає |
| wizard | [necromancer](http://dnd2024.wikidot.com/wizard:necromancer) | Arcana Unleashed | немає | немає |
| wizard | [transmuter](http://dnd2024.wikidot.com/wizard:transmuter) | Arcana Unleashed | немає | немає |

## Контрольні суми використаних HTML

| Локальний файл | SHA-256 |
|---|---|
| `data/2024/source/raw/subclass/artificer-alchemist.html` | `b45950974c237e69be2a1ace78e186c69a6c788d6298008662bb8369ac87ec4a` |
| `data/2024/source/raw/subclass/artificer-armorer.html` | `0ae4b688bf8ef1c34c0aec30cafbac4bb6e2a1d76e46725caf58982323e72c1a` |
| `data/2024/source/raw/subclass/artificer-artillerist.html` | `b52b5ec86dc0d2e2c4f9e073e238224a1f6826d6987e4a41113bf282e45217bf` |
| `data/2024/source/raw/subclass/artificer-battle-smith.html` | `63986ba9135e84a9f61b07463c2c9bc57266ae626711f8db0b37f1a837dee4cc` |
| `data/2024/source/raw/subclass/artificer-cartographer.html` | `2158b58f7fc17967c8d605430d9ef76e0dc0062dea8d6caf23fbd0815ab1a354` |
| `data/2024/source/raw/subclass/artificer-reanimator.html` | `634c55a8ec174bc42207fbde7739470b9e914f56726bdec97a1a28d58c5b5d84` |
| `/tmp/kr31.2-wikidot-audit/artificer-main.html` | `84835c5cc1d29c292a88a6b9f5bac5854c8f18a64b04c113b6d0b52d93673754` |
| `/tmp/kr31.2-wikidot-audit/barbarian-main.html` | `5c4cb79cbfaaad26a1cfa3eeb480dca178a1824dad4496e7e05d5a3eff3e418d` |
| `data/2024/source/raw/subclass/bard-college-of-spirits.html` | `5f9025095e61fc0864b40c3a83dba898a68753f9a01b758f48e437ce81751f13` |
| `data/2024/source/raw/subclass/bard-college-of-the-moon.html` | `457e672b7653fbf79328f68d60c65c29bdc9fd13e40eefef1db085e9e9db2aa0` |
| `/tmp/kr31.2-wikidot-audit/bard-main.html` | `6f8f4408190d1dd9732291dce0d9ad53f879c20179000c29056dfdad78360ae3` |
| `/tmp/kr31.2-wikidot-audit/cleric-arcana-domain.html` | `d89ded2e351bac60612a28f9ef7ff0114c5b6fdaf09048735d8646dad79092c8` |
| `data/2024/source/raw/subclass/cleric-grave-domain.html` | `feb193e36b71c7f1ff1c54f0681c7264066dcb663c34303f65e1eb3c95d7f6c3` |
| `data/2024/source/raw/subclass/cleric-knowledge-domain.html` | `d924890a6bf56b8cf05e2940a22018928bf100b4b6019586d9da2711becdb827` |
| `/tmp/kr31.2-wikidot-audit/cleric-main.html` | `7bf84af941997c42450bbe9ec37da712fc61fda64916fd6514bc35b6f077829e` |
| `/tmp/kr31.2-wikidot-audit/druid-main.html` | `4fcaca3863bc0d06b575169e0356b8ff0e34bfe5b91df5389f48b8a9d9d7fdf9` |
| `/tmp/kr31.2-wikidot-audit/fighter-arcane-archer.html` | `1b0e9aefd470f50df7144f8a1a63266e61cd0b02f9c3b5c8149b0e2a93fbc91a` |
| `data/2024/source/raw/subclass/fighter-banneret.html` | `990015af5ef8ef5ba9e01243ff23b0c9d8943a4b802666842a79f0bf7e2c9ff0` |
| `/tmp/kr31.2-wikidot-audit/fighter-main.html` | `46c900752cc7061004b11b4c7a09d23ce87b055b3f6d317978cce78eae844742` |
| `/tmp/kr31.2-wikidot-audit/monk-warrior-of-the-mystic-arts.html` | `c27baed5952316228f6efc14f43dfd62de866a353cd5eabfade1ba2050856669` |
| `/tmp/kr31.2-wikidot-audit/monk-main.html` | `81c1f870e189031ce4ea1d84b0c608e54c6cc297dc1844c0437c797360692b2d` |
| `data/2024/source/raw/subclass/paladin-oath-of-the-noble-genies.html` | `e13a31ec5ede12f47490cbc56c6890e617985e31bc1a90b9037147d3ed0fbe29` |
| `/tmp/kr31.2-wikidot-audit/paladin-main.html` | `48b0f13f1718bf656e446024a31695fc44aa4b8a2a985ec44f6410859dc99239` |
| `data/2024/source/raw/subclass/ranger-hollow-warden.html` | `eb94a4184fee0fed8295a8b2188489887652ab22bf1f2cd2dd7432c1976a29f3` |
| `data/2024/source/raw/subclass/ranger-winter-walker.html` | `361023914b22a02236de4f700596e2cfe0619c3460c5da72947e63200c2abb4c` |
| `/tmp/kr31.2-wikidot-audit/ranger-main.html` | `0669c854a051269a2ca87d72f6964bafa099b420adf6e9622ce578139ef9dc5a` |
| `data/2024/source/raw/subclass/rogue-phantom.html` | `7a1315dd9936d6084a222509b1695c7df2ae1744f8ebf8a3035609ae34599ffd` |
| `data/2024/source/raw/subclass/rogue-scion-of-the-three.html` | `64de94b05afe59d442d161cb69b5d4ce3d0d09361cb09fb905f1f24eff563717` |
| `/tmp/kr31.2-wikidot-audit/rogue-main.html` | `a5c07d0b00dc1f1de695e6b78933c7ff252a24ec52480ad60ea1f343402e97b0` |
| `data/2024/source/raw/subclass/sorcerer-shadow-sorcery.html` | `2aadc32160cd65730783da68e8c51bbd37a7f2a29773c4e2f34aa73c7cdc4909` |
| `data/2024/source/raw/subclass/sorcerer-spellfire-sorcery.html` | `7e354e11cc2d8789db5c6bb16d2cefa30ae6b3bbf58b3d4b4be066945642c2aa` |
| `/tmp/kr31.2-wikidot-audit/sorcerer-main.html` | `15e6a2a06b95f2149654ad8547941e439b7f3a0001145ffddc464047f42a3842` |
| `data/2024/source/raw/subclass/warlock-undead-patron.html` | `b0bca24c2f5099e15b59a31682ab12ca9765a778ead8e216e5367d7ad887b184` |
| `/tmp/kr31.2-wikidot-audit/warlock-vestige-patron.html` | `9b2e1ccae528b30d93b311695317819ab5e8c0ade412870acdf3c9989c574577` |
| `/tmp/kr31.2-wikidot-audit/warlock-main.html` | `2876eadd690f7b3bdc4a27a278fd95eb836a352775c3b42cf64ca6a92407eab2` |
| `data/2024/source/raw/subclass/wizard-bladesinger.html` | `43f4884a293cb4781169f176be1ef8eb658d38f27207e950d3e5b94446e6fc08` |
| `/tmp/kr31.2-wikidot-audit/wizard-conjurer.html` | `f40656fd909f0bfafdb4644afe727c04cad526e289897f69db480eea46dd04a8` |
| `/tmp/kr31.2-wikidot-audit/wizard-enchanter.html` | `13ac7f01624129bfbf0157dcdaf1179312c5e5636c3eecc0db48f117b0dbf6ba` |
| `/tmp/kr31.2-wikidot-audit/wizard-necromancer.html` | `6c6ce18e3edc1b57d8258ecf6c73fab22f325e372f02020962ca5e1a8adec498` |
| `/tmp/kr31.2-wikidot-audit/wizard-transmuter.html` | `479c559ed4bd45a859493b3bb237edf457fc57b52fe4ba50f1500d991a97bc82` |
| `/tmp/kr31.2-wikidot-audit/wizard-main.html` | `ef9d8c291efcfc26147c3579420fb59bb20f10cdb16e8e35b0db141f8378d891` |
