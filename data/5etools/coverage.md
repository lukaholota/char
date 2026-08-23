# Покриття 5etools — що джерело дає проти того, що в нас відкладено

Згенеровано `npx tsx scripts/5etools/build-coverage.ts`. **Числа обчислені з даних і
маніфестів, не переписані з README** — інакше вони застаріють мовчки.

- Дзеркало: `5etools-mirror-3/5etools-src`
- Ревізія: `e5f3e77b303a92df10487207857200245e71957c`
- Замок знято: 2026-08-23 · 131 файлів · 15.9 МіБ

## Істоти

Усього записів у бестіарії: **4528**, із них із повним статблоком —
**3382**. «Повний» означає AC, HP, швидкість і шість характеристик;
`cr` навмисно не в переліку — у заклинальних статблоків 2024 його немає.

| Що відкладено в нас | Скільки | Є в 5etools |
|---|---:|---:|
| Істоти 2014 (`import-manifest.json`, `pending`) | 327 | **324** |
| Істоти 2024 | 17 | **16** |

**Не знайшлися серед 2014** (3): `Gem Greatwyrm`, `Chromatic Greatwyrm`, `Metallic Greatwyrm`.
**Не знайшлися серед 2024** (1): `Ranimated Companion`.

## Магічні предмети

Відкладено в `magic-items-manifest.json`: **191** (сторінка aidedd мала
лише резюме). Де вони знайшлися в 5etools, за редакцією 2014 і з непорожнім текстом:

| Де | Скільки |
|---|---:|
| `items.json` → `item` | **147** |
| `items.json` → `itemGroup` | 2 |
| `magicvariants.json` | 27 |
| ніде за точною назвою | 15 |

Останній рядок — не прогалина джерела, а різниця зернистості: 5etools розписує
`+1/+2/+3 Amulet of the Devout` трьома записами, а тату — за типом шкоди. Розпил і
звірка назв — робота KR16.4.

**Ніде за точною назвою** (15): `Perfume of Bwitching`, `All-Purpose Tool`, `Amulet of the Devout`, `Arcane Grimoire`, `Bloodwell Vial`, `Dragonhide Belt`, `Moon Sickle`, `Rhythm-Maker's Drum`, `Figurine of Wondrous Power, Gold Canary`, `Ring of the Winter`, `Barrier Tattoo`, `Fate Dealer's Deck`, `Prehistoric Figurines of Wondrous Power`, `Spellwrought Tattoo`, `Wraps of Unarmed Prowess`.

## Заклинання

| Наш каталог | Скільки | Знайшлося в 5etools |
|---|---:|---:|
| `dictionary.json → SPELLS` (2014) | 501 | **499** |
| `data/2024/normalized/spells.json` | 391 | **391** |

У `spells-xphb.json` — **391** заклинань. Це вхід для KR16.2, де 391 запис
2024 звіряється полем-у-поле.

**Немає в корпусі 2014 за назвою** (2): `Arcane Sword`, `Arcane Hand`.
**Немає в XPHB за назвою:** жодного.

## Бастіони

`bastions.json` — **61** споруд: 55 особливих, 6 базових.

| Книга | Споруд |
|---|---:|
| XDMG | 35 |
| EFA | 10 |
| FRHoF | 8 |
| RHW | 8 |

Цього контенту в проєкті не існує взагалі — KR16.6 створює каталог із нуля.

## Розмітка

Рядків із `{@…}` у корпусі: **32135** (усі 131 файлів
пінутої ревізії). Кожен розкладено `scripts/5etools/markup.ts` без помилок — тобто
жодного тега не викинуто мовчки.

- Тегів у корпусі: **55**
- Тегів знає розкладач: **55**
- Невідомих: **0**

| Тег | Разів |
|---|---:|
| `{@spell}` | 12964 |
| `{@damage}` | 10620 |
| `{@condition}` | 6891 |
| `{@hit}` | 5909 |
| `{@dc}` | 5861 |
| `{@h}` | 5457 |
| `{@atk}` | 4500 |
| `{@variantrule}` | 2942 |
| `{@item}` | 2025 |
| `{@dice}` | 1988 |
| `{@skill}` | 1268 |
| `{@creature}` | 1241 |
| `{@atkr}` | 938 |
| `{@recharge}` | 897 |
| `{@action}` | 877 |
| `{@sense}` | 595 |
| `{@actSaveFail}` | 531 |
| `{@actSave}` | 512 |
| `{@status}` | 444 |
| `{@quickref}` | 272 |
| `{@book}` | 239 |
| `{@actSaveSuccess}` | 238 |
| `{@table}` | 210 |
| `{@scaledamage}` | 148 |
| `{@card}` | 118 |
| `{@filter}` | 113 |
| `{@b}` | 105 |
| `{@chance}` | 96 |
| `{@note}` | 92 |
| `{@actSaveSuccessOrFail}` | 81 |
| `{@i}` | 78 |
| `{@actTrigger}` | 69 |
| `{@actResponse}` | 69 |
| `{@hitYourSpellAttack}` | 63 |
| `{@italic}` | 51 |
| `{@adventure}` | 35 |
| `{@hom}` | 33 |
| `{@hazard}` | 29 |
| `{@color}` | 28 |
| `{@reward}` | 25 |
| `{@race}` | 25 |
| `{@scaledice}` | 14 |
| `{@itemProperty}` | 8 |
| `{@link}` | 8 |
| `{@skillCheck}` | 6 |
| `{@disease}` | 5 |
| `{@deck}` | 3 |
| `{@language}` | 2 |
| `{@d20}` | 2 |
| `{@feat}` | 1 |
| `{@footnote}` | 1 |
| `{@dcYourSpellSave}` | 1 |
| `{@actSaveFailBy}` | 1 |
| `{@deity}` | 1 |
| `{@classFeature}` | 1 |
