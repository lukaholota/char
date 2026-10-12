# Звірка прив’язок рис Монаха 2014 — 2026-10-04

Зіставлено маркер на початку пункту, англійську назву, підклас і рівень у
`classes.json`: 42 риси в десяти підкласах. Два явні відповідники назв із уточненням
підкласу: `Cloak of Shadows (Way of Shadow)` → `Cloak of Shadows` та
`Bonus Proficiencies (Drunken Master)` → `Bonus Proficiencies`.
Офіційний текст підтверджує відповідно невидимість на 11-му рівні та володіння
Виступом і набором пивовара на 3-му. Решта зіставлена за англійськими назвами,
рівнями й змістом риси в межах конкретного підкласу.

Сонячна душа: три оцінки в `block-section-sun-soul-4` стосуються авторських
пропозицій змін. Риси прив’язано до аналізу чинних умінь у
`block-section-sun-soul-6`; перші три не мають окремої оцінки. Оцінки пропозицій
на чинні вміння не переносимо.

Непаровані пункти — частини складених умінь, заклинання, стихійні дисципліни та
пропозиції змін. Вони не створюють окремих рис у каталозі, тому прив’язок немає.
Повний список нижче відтворюється командою
`bun scripts/rpgbot/generate-feature-bindings.ts` (без `--apply` записів немає).

| Підклас | Ключ риси | Пункт статті | Ідентифікатори оцінок |
|---|---|---|---|
| WAY_OF_THE_ASTRAL_SELF | arms-of-the-astral-self-3 | section-astral-self-block-section-astral-self-7-item-0 | rating-monk-subclasses-2014-032 |
| WAY_OF_THE_ASTRAL_SELF | visage-of-the-astral-self-6 | section-astral-self-block-section-astral-self-7-item-1 | rating-monk-subclasses-2014-033 |
| WAY_OF_THE_ASTRAL_SELF | body-of-the-astral-self-11 | section-astral-self-block-section-astral-self-7-item-5 | rating-monk-subclasses-2014-037 |
| WAY_OF_THE_ASTRAL_SELF | awakened-astral-self-17 | section-astral-self-block-section-astral-self-7-item-8 | rating-monk-subclasses-2014-040 |
| WAY_OF_THE_ASCENDANT_DRAGON | draconic-disciple-3 | section-ascendant-dragon-block-section-ascendant-dragon-2-item-0 | rating-monk-subclasses-2014-018 |
| WAY_OF_THE_ASCENDANT_DRAGON | breath-of-the-dragon-3 | section-ascendant-dragon-block-section-ascendant-dragon-2-item-4 | rating-monk-subclasses-2014-022 |
| WAY_OF_THE_ASCENDANT_DRAGON | wings-unfurled-6 | section-ascendant-dragon-block-section-ascendant-dragon-2-item-5 | rating-monk-subclasses-2014-023 |
| WAY_OF_THE_ASCENDANT_DRAGON | aspect-of-the-wyrm-11 | section-ascendant-dragon-block-section-ascendant-dragon-2-item-6 | rating-monk-subclasses-2014-024 |
| WAY_OF_THE_ASCENDANT_DRAGON | ascendant-aspect-17 | section-ascendant-dragon-block-section-ascendant-dragon-2-item-9 | rating-monk-subclasses-2014-027 |
| WAY_OF_THE_OPEN_HAND | open-hand-technique-3 | section-open-hand-block-section-open-hand-3-item-0 | rating-monk-subclasses-2014-085 |
| WAY_OF_THE_OPEN_HAND | wholeness-of-body-6 | section-open-hand-block-section-open-hand-3-item-1 | rating-monk-subclasses-2014-086 |
| WAY_OF_THE_OPEN_HAND | tranquility-11 | section-open-hand-block-section-open-hand-3-item-2 | rating-monk-subclasses-2014-087 |
| WAY_OF_THE_OPEN_HAND | quivering-palm-17 | section-open-hand-block-section-open-hand-3-item-3 | rating-monk-subclasses-2014-088 |
| WAY_OF_THE_LONG_DEATH | touch-of-death-3 | section-long-death-block-section-long-death-3-item-0 | rating-monk-subclasses-2014-080 |
| WAY_OF_THE_LONG_DEATH | hour-of-reaping-6 | section-long-death-block-section-long-death-3-item-1 | rating-monk-subclasses-2014-081 |
| WAY_OF_THE_LONG_DEATH | mastery-of-death-11 | section-long-death-block-section-long-death-3-item-2 | rating-monk-subclasses-2014-082 |
| WAY_OF_THE_LONG_DEATH | touch-of-the-long-death-17 | section-long-death-block-section-long-death-3-item-3 | rating-monk-subclasses-2014-083 |
| WAY_OF_THE_KENSEI | path-of-the-kensei-3 | section-kensei-block-section-kensei-7-item-0 | rating-monk-subclasses-2014-069 |
| WAY_OF_THE_KENSEI | one-with-the-blade-6 | section-kensei-block-section-kensei-7-item-5 | rating-monk-subclasses-2014-074 |
| WAY_OF_THE_KENSEI | sharpen-the-blade-11 | section-kensei-block-section-kensei-7-item-8 | rating-monk-subclasses-2014-077 |
| WAY_OF_THE_KENSEI | unerring-accuracy-17 | section-kensei-block-section-kensei-7-item-9 | rating-monk-subclasses-2014-078 |
| WAY_OF_MERCY | implements-of-mercy-3 | section-mercy-block-section-mercy-7-item-0 | rating-monk-subclasses-2014-002 |
| WAY_OF_MERCY | hand-of-healing-3 | section-mercy-block-section-mercy-7-item-1 | rating-monk-subclasses-2014-003 |
| WAY_OF_MERCY | hand-of-harm-3 | section-mercy-block-section-mercy-7-item-2 | rating-monk-subclasses-2014-004 |
| WAY_OF_MERCY | physicians-touch-6 | section-mercy-block-section-mercy-7-item-3 | rating-monk-subclasses-2014-005 |
| WAY_OF_MERCY | flurry-of-healing-and-harm-11 | section-mercy-block-section-mercy-7-item-4 | rating-monk-subclasses-2014-006 |
| WAY_OF_MERCY | hand-of-ultimate-mercy-17 | section-mercy-block-section-mercy-7-item-5 | rating-monk-subclasses-2014-007 |
| WAY_OF_THE_DRUNKEN_MASTER | bonus-proficiencies-drunken-master-3 | section-drunken-master-block-section-drunken-master-3-item-0 | rating-monk-subclasses-2014-042 |
| WAY_OF_THE_DRUNKEN_MASTER | drunken-technique-3 | section-drunken-master-block-section-drunken-master-3-item-1 | rating-monk-subclasses-2014-043 |
| WAY_OF_THE_DRUNKEN_MASTER | tipsy-sway-6 | section-drunken-master-block-section-drunken-master-3-item-2 | rating-monk-subclasses-2014-044 |
| WAY_OF_THE_DRUNKEN_MASTER | drunkards-luck-11 | section-drunken-master-block-section-drunken-master-3-item-5 | rating-monk-subclasses-2014-047 |
| WAY_OF_THE_DRUNKEN_MASTER | intoxicated-frenzy-17 | section-drunken-master-block-section-drunken-master-3-item-6 | rating-monk-subclasses-2014-048 |
| WAY_OF_THE_SUN_SOUL | radiant-sun-bolt-3 | section-sun-soul-block-section-sun-soul-6-item-0 | — |
| WAY_OF_THE_SUN_SOUL | searing-arc-strike-6 | section-sun-soul-block-section-sun-soul-6-item-1 | — |
| WAY_OF_THE_SUN_SOUL | searing-sunburst-11 | section-sun-soul-block-section-sun-soul-6-item-2 | — |
| WAY_OF_THE_SUN_SOUL | sun-shield-17 | section-sun-soul-block-section-sun-soul-6-item-3 | rating-monk-subclasses-2014-093 |
| WAY_OF_SHADOW | shadow-arts-3 | section-shadow-block-section-shadow-3-item-0 | rating-monk-subclasses-2014-009 |
| WAY_OF_SHADOW | shadow-step-6 | section-shadow-block-section-shadow-3-item-5 | rating-monk-subclasses-2014-014 |
| WAY_OF_SHADOW | cloak-of-shadows-way-of-shadow-11 | section-shadow-block-section-shadow-3-item-6 | rating-monk-subclasses-2014-015 |
| WAY_OF_SHADOW | opportunist-17 | section-shadow-block-section-shadow-3-item-7 | rating-monk-subclasses-2014-016 |
| WAY_OF_THE_FOUR_ELEMENTS | disciple-of-the-elements-3 | section-four-elements-block-section-four-elements-3-item-0 | rating-monk-subclasses-2014-050 |
| WAY_OF_THE_FOUR_ELEMENTS | elemental-attunement-3 | section-four-elements-block-section-four-elements-3-item-2 | rating-monk-subclasses-2014-051 |

## Непаровані пункти

- WAY_OF_THE_ASTRAL_SELF: section-astral-self-block-section-astral-self-7-item-2: Астральний зір{{Astral Sight}}
- WAY_OF_THE_ASTRAL_SELF: section-astral-self-block-section-astral-self-7-item-3: {{Мудрість духу|Wisdom of the Spirit}}
- WAY_OF_THE_ASTRAL_SELF: section-astral-self-block-section-astral-self-7-item-4: {{Слово духу|Word of the Spirit}}
- WAY_OF_THE_ASTRAL_SELF: section-astral-self-block-section-astral-self-7-item-6: Відбиття енергії{{Deflect Energy}}
- WAY_OF_THE_ASTRAL_SELF: section-astral-self-block-section-astral-self-7-item-7: Посилені руки{{Empowered Arms}}
- WAY_OF_THE_ASCENDANT_DRAGON: section-ascendant-dragon-block-section-ascendant-dragon-2-item-1: Драконяча присутність{{Draconic Presence}}
- WAY_OF_THE_ASCENDANT_DRAGON: section-ascendant-dragon-block-section-ascendant-dragon-2-item-2: Драконячий удар{{Draconic Strike}}
- WAY_OF_THE_ASCENDANT_DRAGON: section-ascendant-dragon-block-section-ascendant-dragon-2-item-3: {{Мова драконів|Tongue of the Dragon}}
- WAY_OF_THE_ASCENDANT_DRAGON: section-ascendant-dragon-block-section-ascendant-dragon-2-item-7: Жахлива присутність{{Frightful Presence}}
- WAY_OF_THE_ASCENDANT_DRAGON: section-ascendant-dragon-block-section-ascendant-dragon-2-item-8: Опір{{Resistance}}
- WAY_OF_THE_ASCENDANT_DRAGON: section-ascendant-dragon-block-section-ascendant-dragon-2-item-10: Посилений подих{{Augment Breath}}
- WAY_OF_THE_ASCENDANT_DRAGON: section-ascendant-dragon-block-section-ascendant-dragon-2-item-11: Сліпозір{{Blindsight}}
- WAY_OF_THE_ASCENDANT_DRAGON: section-ascendant-dragon-block-section-ascendant-dragon-2-item-12: Вибухова лють{{Explosive Fury}}
- WAY_OF_THE_KENSEI: section-kensei-block-section-kensei-7-item-1: Зброя кенсея{{Kensei Weapons}}
- WAY_OF_THE_KENSEI: section-kensei-block-section-kensei-7-item-2: Спритне парирування{{Agile Parry}}
- WAY_OF_THE_KENSEI: section-kensei-block-section-kensei-7-item-3: Постріл кенсея{{Kensei’s Shot}}
- WAY_OF_THE_KENSEI: section-kensei-block-section-kensei-7-item-4: {{Шлях пензля|Way of the Brush}}
- WAY_OF_THE_KENSEI: section-kensei-block-section-kensei-7-item-6: Магічна зброя кенсея{{Magic Kensei Weapons}}
- WAY_OF_THE_KENSEI: section-kensei-block-section-kensei-7-item-7: Вправний удар{{Deft Strike}}
- WAY_OF_THE_DRUNKEN_MASTER: section-drunken-master-block-section-drunken-master-3-item-3: {{Підскок на ноги|Leap to Your Feet}}
- WAY_OF_THE_DRUNKEN_MASTER: section-drunken-master-block-section-drunken-master-3-item-4: Перенаправлення атаки{{Redirect Attack}}
- WAY_OF_THE_SUN_SOUL: section-sun-soul-block-section-sun-soul-4-item-0: Промінь сонячного світла
- WAY_OF_THE_SUN_SOUL: section-sun-soul-block-section-sun-soul-4-item-1: Пекучий дуговий удар
- WAY_OF_THE_SUN_SOUL: section-sun-soul-block-section-sun-soul-4-item-2: Пекучий сонячний вибух
- WAY_OF_SHADOW: section-shadow-block-section-shadow-3-item-1: Темрява [Darkness]
- WAY_OF_SHADOW: section-shadow-block-section-shadow-3-item-2: Темний зір [Darkvision]
- WAY_OF_SHADOW: section-shadow-block-section-shadow-3-item-3: Переміщення без сліду [Pass without Trace]
- WAY_OF_SHADOW: section-shadow-block-section-shadow-3-item-4: Тиша [Silence]
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-1: Стихійні дисципліни
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-3: {{Ікла вогняної змії|Fangs of the Fire Snake}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-4: {{Кулак чотирьох громів|Fist of the Four Thunders}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-5: {{Кулак непорушного повітря|Fist of Unbroken Air}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-6: {{Натиск духів бурі|Rush of the Gale Spirits}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-7: {{Надання форми плинній ріці|Shape of the Flowing River}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-8: Розмашистий попелястий удар{{Sweeping Cinder Strike}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-9: Водяний батіг{{Water Whip}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-10: Стихійні дисципліни
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-11: {{Хватка північного вітру|Clench of the North}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-12: {{Гонг вершини|Gong of the Summit}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-13: Стихійні дисципліни
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-14: {{Полумʼя фенікса|Flames of the Phoenix}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-15: Стійка туману{{Mist Stance}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-16: {{Осідлати вітер|Ride the Wind}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-17: Стихійні дисципліни
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-18: {{Подих зими|Breath of Winter}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-19: Захист вічної гори{{Eternal Mountain Defense}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-20: {{Ріка голодного полумʼя|River of Hungry Flame}}
- WAY_OF_THE_FOUR_ELEMENTS: section-four-elements-block-section-four-elements-3-item-21: {{Хвиля рухомої землі|Wave of Rolling Earth}}
