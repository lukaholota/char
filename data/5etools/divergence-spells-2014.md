# Розбіжності заклинань 2014 проти 5etools

Згенеровано `npx tsx scripts/5etools/compare-spells.ts --edition=2014`.
Джерело — пінута ревізія `e5f3e77b303a92df10487207857200245e71957c`.
Каталог — `src/lib/generated/spells.json`.

- У каталозі: **499**
- Звірено полем-у-поле: **499**
- Розійшлося щонайменше в одному полі: **46**
- Не звірено: **0**
- Списку класів джерело не подає (порівняно решту полів): **15**

## За полями

| Поле | Розбіжностей |
|---|---:|
| `classes` | 46 |

## Підкласи в переліку класів

У **194** записів серед «класів» стоять підкласи — розширені списки
заклинань 2014-стилю. У 5etools список класів заклинання містить лише базові класи.

| Підклас | Заклинань |
|---|---:|
| Коло землі | 47 |
| Джин | 26 |
| Школа гравітургії | 15 |
| Домен сутінків | 10 |
| Абераційний розум | 10 |
| Домен могили | 10 |
| Коло дикого вогню | 10 |
| Невмирущий | 10 |
| Коло спор | 9 |
| Домен життя | 9 |
| Домен війни | 9 |
| Клятва корони | 9 |
| Клятва завоювання | 9 |
| Домен світла | 9 |
| Архіфея | 9 |
| Домен кузні | 9 |
| Зброяр | 9 |
| Артилерист | 9 |
| Домен бурі | 9 |
| Безодня | 9 |

Усього різних підкласів: **49**.

## Класи з розширених списків, яких у нас немає

**46** заклинань дістають клас не з базового переліку, а з розширеного
списку іншої книги (`classVariant`). Рішення власника 2026-08-23 — брати їх дефолтно,
показуючи книгу; тому їхня відсутність рахується розбіжністю поля `classes`.

| Клас (книга розширеного списку) | Заклинань |
|---|---:|
| Bard (TCE) | 12 |
| Druid (TCE) | 10 |
| Ranger (TCE) | 9 |
| Sorcerer (TCE) | 8 |
| Warlock (TCE) | 5 |
| Wizard (TCE) | 4 |
| Paladin (TCE) | 3 |
| Cleric (TCE) | 2 |
| Sorcerer (XGE) | 1 |

## Класи, які 5etools виводить із фічі, а не зі списку заклинань

Ці рядки зі звірки виключені навмисно: клас дістає заклинання від своєї фічі, а не з
переліку. Вписати їх у `spell_classes` означало б показати заклинання в каталозі класу.

| Заклинання | Клас | Чому |
|---|---|---|
| `Astral Projection` | Monk | у Монаха немає списку заклинань; `Empty Body`, 18 рівень |

## Поіменно

| Заклинання | Прапорець | Поле | У нас | У 5etools |
|---|---|---|---|---|
| `Protection From Evil and Good` | — | `classes` | Cleric, Paladin, Warlock, Wizard | Cleric, Druid, Paladin, Warlock, Wizard |
| `Color Spray` | — | `classes` | Sorcerer, Wizard | Bard, Sorcerer, Wizard |
| `Command` | — | `classes` | Cleric, Paladin | Bard, Cleric, Paladin |
| `Entangle` | — | `classes` | Druid | Druid, Ranger |
| `Grease` | — | `classes` | Artificer, Wizard | Artificer, Sorcerer, Wizard |
| `Mirror Image` | — | `classes` | Sorcerer, Warlock, Wizard | Bard, Sorcerer, Warlock, Wizard |
| `Continual Flame` | — | `classes` | Artificer, Cleric, Wizard | Artificer, Cleric, Druid, Wizard |
| `Flame Blade` | — | `classes` | Druid | Druid, Sorcerer |
| `Enlarge/Reduce` | — | `classes` | Artificer, Druid, Sorcerer, Wizard | Artificer, Bard, Druid, Sorcerer, Wizard |
| `Magic Weapon` | — | `classes` | Artificer, Paladin, Wizard | Artificer, Paladin, Ranger, Sorcerer, Wizard |
| `Prayer of Healing` | — | `classes` | Cleric | Cleric, Paladin |
| `Gentle Repose` | — | `classes` | Cleric, Wizard | Cleric, Paladin, Wizard |
| `Warding Bond` | — | `classes` | Cleric | Cleric, Paladin |
| `Flaming Sphere` | — | `classes` | Druid, Wizard | Druid, Sorcerer, Wizard |
| `Aid` | — | `classes` | Artificer, Cleric, Paladin | Artificer, Bard, Cleric, Paladin, Ranger |
| `Enhance Ability` | — | `classes` | Artificer, Bard, Cleric, Druid, Sorcerer | Artificer, Bard, Cleric, Druid, Ranger, Sorcerer, Wizard |
| `Gust of Wind` | — | `classes` | Druid, Sorcerer, Wizard | Druid, Ranger, Sorcerer, Wizard |
| `Augury` | — | `classes` | Cleric | Cleric, Druid, Wizard |
| `Vampiric Touch` | — | `classes` | Warlock, Wizard | Sorcerer, Warlock, Wizard |
| `Revivify` | — | `classes` | Artificer, Cleric, Paladin | Artificer, Cleric, Druid, Paladin, Ranger |
| `Meld Into Stone` | — | `classes` | Cleric, Druid | Cleric, Druid, Ranger |
| `Mass Healing Word` | — | `classes` | Cleric | Bard, Cleric |
| `Speak with Dead` | — | `classes` | Bard, Cleric | Bard, Cleric, Wizard |
| `Slow` | — | `classes` | Sorcerer, Wizard | Bard, Sorcerer, Wizard |
| `Divination` | — | `classes` | Cleric | Cleric, Druid, Wizard |
| `Fire Shield` | — | `classes` | Wizard | Druid, Sorcerer, Wizard |
| `Dominate Beast` | — | `classes` | Druid, Sorcerer | Druid, Ranger, Sorcerer |
| `Phantasmal Killer` | — | `classes` | Wizard | Bard, Wizard |
| `Greater Restoration` | — | `classes` | Artificer, Bard, Cleric, Druid | Artificer, Bard, Cleric, Druid, Ranger |
| `Teleportation Circle` | — | `classes` | Bard, Sorcerer, Wizard | Bard, Sorcerer, Warlock, Wizard |
| `Cone of Cold` | — | `classes` | Sorcerer, Wizard | Druid, Sorcerer, Wizard |
| `Mislead` | — | `classes` | Bard, Wizard | Bard, Warlock, Wizard |
| `Planar Binding` | — | `classes` | Bard, Cleric, Druid, Wizard | Bard, Cleric, Druid, Warlock, Wizard |
| `Heroes' Feast` | — | `classes` | Cleric, Druid | Bard, Cleric, Druid |
| `Flesh to Stone` | — | `classes` | Warlock, Wizard | Druid, Sorcerer, Warlock, Wizard |
| `Sunbeam` | — | `classes` | Druid, Sorcerer, Wizard | Cleric, Druid, Sorcerer, Wizard |
| `Prismatic Spray` | — | `classes` | Sorcerer, Wizard | Bard, Sorcerer, Wizard |
| `Symbol` | — | `classes` | Bard, Cleric, Wizard | Bard, Cleric, Druid, Wizard |
| `Antipathy/Sympathy` | — | `classes` | Druid, Wizard | Bard, Druid, Wizard |
| `Incendiary Cloud` | — | `classes` | Sorcerer, Wizard | Druid, Sorcerer, Wizard |
| `Demiplane` | — | `classes` | Warlock, Wizard | Sorcerer, Warlock, Wizard |
| `Sunburst` | — | `classes` | Druid, Sorcerer, Wizard | Cleric, Druid, Sorcerer, Wizard |
| `Gate` | — | `classes` | Cleric, Sorcerer, Wizard | Cleric, Sorcerer, Warlock, Wizard |
| `Prismatic Wall` | — | `classes` | Wizard | Bard, Wizard |
| `Weird` | — | `classes` | Wizard | Warlock, Wizard |
| `Mass Polymorph` | — | `classes` | Bard, Wizard | Bard, Sorcerer, Wizard |

**Не звірено:** жодного.
