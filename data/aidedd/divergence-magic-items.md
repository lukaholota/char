# Розбіжності: наш каталог проти aidedd (magic-items-2014)

> Згенеровано `npx tsx scripts/aidedd/build-magic-items-divergence.ts`. Руками не редагувати.

«Наш каталог» тут — корпус, який кладе в базу сід: `prisma/seed/magic-items/baseline.json`
плюс партії перекладу. Не `src/lib/generated/magicItems.json` — той не в git і відстає.

| | Скільки |
|---|---:|
| Сторінок aidedd | 473 |
| Записів у нашому каталозі | 475 |
| Збіг за назвою | 313 |
| З них сторінка aidedd має **лише резюме** (не OGL) | 44 |
| Сторінок aidedd, яких у нас немає | 160 |
| З них лише резюме | 147 |
| Наших записів, покритих сторінкою-бандлом | 107 на 20 сторінок |
| Наших записів без сторінки й без бандла | 57 |
| З них — той самий предмет уже є під назвою 2014 | 3 |
| Збігів, де тип, рідкість чи налаштування розійшлися з джерелом | 15 |
| З них ще не розвʼязано | 6 |

Числа сходяться в обидва боки, і це варто перевіряти щоразу:

- сторінки: 313 збігів + 160 нових = **473**;
- наші записи: 313 зі сторінкою + 107 у бандлі − 2 на два боки (Potion of Healing, Ring of Resistance) + 57 без нічого = **475**.

## 1. Збіг, але джерело дає тільки резюме

aidedd не публікує текст правил для не-OGL предметів — замість опису там рядок
«Description not available (not OGL)» і один рядок переказу. Для цих предметів імпорт із
джерела **не дає тексту**: наш наявний опис довший і змістовніший, тож переклад заново тут
означав би втрату правил. Вони позначені `deferred` у маніфесті й не входять у жодну партію.

**Рішення: свідомо не беремо** — наш опис лишається.

| Предмет | Наш опис, символів | aidedd, символів |
|---|---:|---:|
| Demonomicon of Iggwilv | 3995 | 0 |
| Cauldron of Rebirth | 1068 | 79 |
| Hat of Wizardry | 732 | 65 |
| Dark Shard Amulet | 722 | 66 |
| Staff of Birdcalls | 600 | 34 |
| Instrument of Scribing | 585 | 63 |
| Staff of Flowers | 548 | 39 |
| Wand of Pyrotechnics | 545 | 59 |
| Talking Doll | 537 | 73 |
| Hat of Vermin | 475 | 60 |
| Instrument of Illusions | 463 | 80 |
| Staff of Adornment | 452 | 37 |
| Wand of Conducting | 446 | 37 |
| Ruby of the War Mage | 393 | 95 |
| Clockwork Amulet | 375 | 83 |
| Heward's Handy Spice Pouch | 363 | 56 |
| Pot of Awakening | 362 | 94 |
| Rope of Mending | 328 | 55 |
| Nature's Mantle | 318 | 50 |
| Cloak of Many Fashions | 301 | 47 |
| Lock of Trickery | 290 | 56 |
| Pole of Collapsing | 290 | 56 |
| Ersatz Eye | 287 | 65 |
| Prosthetic Limb | 278 | 20 |
| Pipe of Smoke Monsters | 258 | 86 |
| Horn of Silent Alarm | 247 | 67 |
| Tankard of Sobriety | 231 | 63 |
| Orb of Direction | 214 | 44 |
| Bead of Refreshment | 193 | 74 |
| Veteran's Cane | 192 | 51 |
| Mystery Key | 161 | 50 |
| Pole of Angling | 159 | 50 |
| Clothes of Mending | 145 | 91 |
| Moon-touched Sword | 136 | 88 |
| Boots of False Tracks | 132 | 70 |
| Enduring Spellbook | 126 | 55 |
| Candle of the Deep | 113 | 55 |
| Bead of Nourishment | 112 | 59 |
| Shield of Expression | 112 | 77 |
| Walloping Ammunition | 109 | 69 |
| Cloak of Billowing | 93 | 35 |
| Ear Horn of Hearing | 82 | 66 |
| Orb of Time | 81 | 89 |
| Armor of Gleaming | 36 | 28 |

## 2. Сторінки aidedd, яких у нас немає

160 предметів. З них 147 — тільки резюме, тобто доімпортувати їх з aidedd означає завести запис із однорядковим описом.
Реально придатних до імпорту: **13**.
Брати їх чи ні — відкрите питання 3 O14.

| Предмет | Джерело | Рішення |
|---|---|---|
| Absorbing Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Adze of Annam | Glory of the Giants | свідомо не беремо — лише резюме |
| Alchemical Compendium | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| All-Purpose Tool | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Amethyst Lodestone | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Ammunition +1, +2, or +3 | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| Amulet of the Devout | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Antimagic Armor | The Book of Many Things | свідомо не беремо — лише резюме |
| Arcane Grimoire | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Armor +1, +2, or +3 | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| Armor of Fungal Spores | The Book of Many Things | свідомо не беремо — лише резюме |
| Armor of Safeguarding | Glory of the Giants | свідомо не беремо — лише резюме |
| Armor of the Fallen | The Book of Many Things | свідомо не беремо — лише резюме |
| Armor of Weightlessness | The Book of Many Things | свідомо не беремо — лише резюме |
| Astral Shard | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Astromancy Archive | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Atlas of Endless Horizons | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Baba Yaga's Mortar and Pestle | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Baleful Talon | The Book of Many Things | свідомо не беремо — лише резюме |
| Barrier Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Bell Branch | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Belt of Giant Strength | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| Bigby's Beneficent Bracelet | Glory of the Giants | свідомо не беремо — лише резюме |
| Blackstaff | Adventures (Waterdeep: Dragon Heist) | свідомо не беремо — лише резюме |
| Blasted Goggles | The Book of Many Things | свідомо не беремо — лише резюме |
| Blood Fury Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Bloodrage Greataxe | The Book of Many Things | свідомо не беремо — лише резюме |
| Bloodseeker Ammunition | The Book of Many Things | свідомо не беремо — лише резюме |
| Bloodshed Blade | Glory of the Giants | свідомо не беремо — лише резюме |
| Bloodwell Vial | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Boomerang Shield | The Book of Many Things | свідомо не беремо — лише резюме |
| Bow of Conflagration | The Book of Many Things | свідомо не беремо — лише резюме |
| Bow of Melodies | The Book of Many Things | свідомо не беремо — лише резюме |
| Card Sharp's Deck | The Book of Many Things | свідомо не беремо — лише резюме |
| Clockwork Armor | The Book of Many Things | свідомо не беремо — лише резюме |
| Coiling Grasp Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Crook of Rao | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Crown of the Wrath Bringer | Glory of the Giants | свідомо не беремо — лише резюме |
| Crown of Whirling Comets | The Book of Many Things | свідомо не беремо — лише резюме |
| Crystal Blade | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Crystalline Chronicle | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Deck of Dimensions | The Book of Many Things | свідомо не беремо — лише резюме |
| Deck of Oracles | The Book of Many Things | свідомо не беремо — лише резюме |
| Deck of Wonder | The Book of Many Things | свідомо не беремо — лише резюме |
| Delver's Claws | Glory of the Giants | свідомо не беремо — лише резюме |
| Devotee's Censer | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Donjon's Sundering Sphere | The Book of Many Things | свідомо не беремо — лише резюме |
| Dragon Wing Bow | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Dragonhide Belt | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Dragonlance | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Dried Leech | The Book of Many Things | свідомо не беремо — лише резюме |
| Duplicitous Manuscript | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Eldritch Claw Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Elemental Essence Shard | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Emerald Pen | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Euryale's Aegis | The Book of Many Things | свідомо не беремо — лише резюме |
| Fabulist Gem | The Book of Many Things | свідомо не беремо — лише резюме |
| Far Realm Shard | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Fate Cutter Shears | The Book of Many Things | свідомо не беремо — лише резюме |
| Fate Dealer's Deck | The Book of Many Things | свідомо не беремо — лише резюме |
| Feywild Shard | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Feywrought Armor | The Book of Many Things | свідомо не беремо — лише резюме |
| Figurine of Wondrous Power, Gold Canary | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Flail of Tiamat | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Fool's Blade | The Book of Many Things | свідомо не беремо — лише резюме |
| Forcebreaker Weapon | The Book of Many Things | свідомо не беремо — лише резюме |
| Fulminating Treatise | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Ghost Step Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Glimmering Moonbow | The Book of Many Things | свідомо не беремо — лише резюме |
| Gloomwrought Armor | The Book of Many Things | свідомо не беремо — лише резюме |
| Glowrune Pigment | Glory of the Giants | свідомо не беремо — лише резюме |
| Grasping Whip | The Book of Many Things | свідомо не беремо — лише резюме |
| Guardian Emblem | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Hammer of Runic Focus | The Book of Many Things | свідомо не беремо — лише резюме |
| Harp of Gilded Plenty | Glory of the Giants | свідомо не беремо — лише резюме |
| Heart Weaver's Primer | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Helm of Perfect Potential | Glory of the Giants | свідомо не беремо — лише резюме |
| House of Cards | The Book of Many Things | свідомо не беремо — лише резюме |
| Iggwilv's Cauldron | Adventures (The Wild Beyond The Witchlight) | свідомо не беремо — лише резюме |
| Illuminator's Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Instrument of the Bards | Dungeon Master´s Guide | придатний, чекає рішення 3 |
| Ioun Stone | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| Jester's Mask | The Book of Many Things | свідомо не беремо — лише резюме |
| Lash of Immolation | Glory of the Giants | свідомо не беремо — лише резюме |
| Libram of Souls and Flesh | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Lifewell Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Longbow of the Healing Hearth | Glory of the Giants | свідомо не беремо — лише резюме |
| Luba's Tarokka of Souls | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Lucent Destroyer | Glory of the Giants | свідомо не беремо — лише резюме |
| Lyre of Building | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Masquerade Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Mighty Servant of Leuk-o | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Mistral Mantle | Glory of the Giants | свідомо не беремо — лише резюме |
| Moon Sickle | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Nimbus Coronet | Glory of the Giants | свідомо не беремо — лише резюме |
| Orb of Skoraeus | Glory of the Giants | свідомо не беремо — лише резюме |
| Outer Essence Shard | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Perfume of Bwitching | Xanathar´s Guide to Everything | свідомо не беремо — лише резюме |
| Planecaller's Codex | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Plate of Knight's Fellowship | The Book of Many Things | свідомо не беремо — лише резюме |
| Platinum Scarf | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Potion of Dragon's Majesty | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Potion of Giant Strength | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| Prehistoric Figurines of Wondrous Power | Glory of the Giants | свідомо не беремо — лише резюме |
| Protective Verses | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Quaal's Feather Token | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| Reaper's Scream | Glory of the Giants | свідомо не беремо — лише резюме |
| Reveler's Concertina | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Rhythm-Maker's Drum | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Ring of Amity | Glory of the Giants | свідомо не беремо — лише резюме |
| Ring of Poison Resistance | Dungeon Master´s Guide (BR) | придатний, чекає рішення 3 |
| Ring of Puzzler's Wit | The Book of Many Things | свідомо не беремо — лише резюме |
| Ring of the Winter | Adventures (Tomb of Annihilation) | свідомо не беремо — лише резюме |
| Rod of Hellish Flames | The Book of Many Things | свідомо не беремо — лише резюме |
| Rod of the Pact Keeper | Dungeon Master´s Guide | придатний, чекає рішення 3 |
| Rogue's Mantle | The Book of Many Things | свідомо не беремо — лише резюме |
| Ruby Weave Gem | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Ruinous Flail | The Book of Many Things | свідомо не беремо — лише резюме |
| Sage's Signet | The Book of Many Things | свідомо не беремо — лише резюме |
| Sanctum Amulet | Glory of the Giants | свідомо не беремо — лише резюме |
| Sapphire Buckler | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Shadowfell Brand Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Shadowfell Shard | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Shield, +1, +2, or +3 | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| Shield of the Blazing Dreadnought | Glory of the Giants | свідомо не беремо — лише резюме |
| Shield of the Tortoise | The Book of Many Things | свідомо не беремо — лише резюме |
| Shrieking Greaves | The Book of Many Things | свідомо не беремо — лише резюме |
| Skull Helm | The Book of Many Things | свідомо не беремо — лише резюме |
| Sling of Giant Felling | The Book of Many Things | свідомо не беремо — лише резюме |
| Spell Scroll | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| Spellwrought Tattoo | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Spindle of Fate | The Book of Many Things | свідомо не беремо — лише резюме |
| Staff of the Forgotten One | Adventures (Tomb of Annihilation) | свідомо не беремо — лише резюме |
| Staff of the Rooted Hills | Glory of the Giants | свідомо не беремо — лише резюме |
| Starshot Crossbow | The Book of Many Things | свідомо не беремо — лише резюме |
| Stone of Golorr | Adventures (Dragon Heist) | свідомо не беремо — лише резюме |
| Stonebreaker's Breastplate | Glory of the Giants | свідомо не беремо — лише резюме |
| Stonemaker War Pick | The Book of Many Things | свідомо не беремо — лише резюме |
| Sun Staff | The Book of Many Things | свідомо не беремо — лише резюме |
| Sword of the Planes | The Book of Many Things | свідомо не беремо — лише резюме |
| Sword of Zariel | Adventures (Descent into Avernus) | свідомо не беремо — лише резюме |
| Teeth of Dahlver-Nar | Tasha´s Cauldron of Everything | свідомо не беремо — лише резюме |
| Telescopic Transporter | The Book of Many Things | свідомо не беремо — лише резюме |
| Thunderbuss | Glory of the Giants | свідомо не беремо — лише резюме |
| Tidecaller Trident | The Book of Many Things | свідомо не беремо — лише резюме |
| Topaz Annihilator | Fizban´s Treasury of Dragons | свідомо не беремо — лише резюме |
| Voidwalker Armor | The Book of Many Things | свідомо не беремо — лише резюме |
| Wand of Scowls | Xanathar´s Guide to Everything | свідомо не беремо — лише резюме |
| Wand of Smiles | Xanathar´s Guide to Everything | свідомо не беремо — лише резюме |
| Wand of the War Mage +1, +2, or +3 | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| War Horn of Valor | Glory of the Giants | свідомо не беремо — лише резюме |
| Warrior's Passkey | The Book of Many Things | свідомо не беремо — лише резюме |
| Wayfarer's Boots | Glory of the Giants | свідомо не беремо — лише резюме |
| Weapon +1, +2, or +3 | Dungeon Master´s Guide (SRD) | придатний, чекає рішення 3 |
| Weapon of Throne's Command | The Book of Many Things | свідомо не беремо — лише резюме |
| Winged Ammunition | The Book of Many Things | свідомо не беремо — лише резюме |
| Wraps of Unarmed Prowess | The Book of Many Things | свідомо не беремо — лише резюме |
| Wyrmreaver Gauntlets | Glory of the Giants | свідомо не беремо — лише резюме |
| Wyrmskull Throne | Adventures (Storm King's Thunder) | свідомо не беремо — лише резюме |
| Zephyr Armor | Glory of the Giants | свідомо не беремо — лише резюме |

## 3. Наш розпил бандлів

Одна сторінка aidedd — кілька наших записів. Політика розпилу — відкрите питання 2 O14.
Джерело покриття: `м` — маніфест (сторінку розписано в партії), `к` —
`COVERED_BY_EXISTING_ENTRIES` (сторінку пропущено, текст уже стоїть на варіантах).

| Сторінка aidedd | Джерело | Наших записів | Які саме |
|---|---|---:|---|
| Ammunition +1, +2, or +3 | к | 3 | Ammunition +1, Ammunition +2, Ammunition +3 |
| Armor +1, +2, or +3 | к | 3 | Armor +1, Armor +2, Armor +3 |
| Bag of Tricks | м | 3 | Tan Bag of Tricks, Rust Bag of Tricks, Gray Bag of Tricks |
| Belt of Giant Strength | м+к | 6 | Belt of Fire Giant Strength, Belt of Stone Giant Strength, Belt of Frost Giant Strength, Belt of Hill Giant Strength, Belt of Cloud Giant Strength, Belt of Storm Giant Strength |
| Crystal Ball | м | 3 | Crystal Ball of True Seeing, Crystal Ball of Telepathy, Crystal Ball of Mind Reading |
| Figurine of Wondrous Power | м | 9 | Figurine of Wondrous Power (Bronze Griffon), Figurine of Wondrous Power (Ebony Fly), Figurine of Wondrous Power (Serpentine Owl), Figurine of Wondrous Power (Golden Lions), Figurine of Wondrous Power (Marble Elephant), Figurine of Wondrous Power (Obsidian Steed), Figurine of Wondrous Power (Onyx Dog), Figurine of Wondrous Power (Ivory Goats), Figurine of Wondrous Power (Silver Raven) |
| Horn of Valhalla | м | 4 | Horn of Valhalla (Bronze), Horn of Valhalla (Iron), Horn of Valhalla (Brass), Horn of Valhalla (Silver) |
| Instrument of the Bards | м+к | 7 | Instrument of the Bards (Anstruth Harp), Instrument of the Bards (Ollamh Harp), Instrument of the Bards (Fochlucan Bandore), Instrument of the Bards (Cli Lyre), Instrument of the Bards (Doss Lute), Instrument of the Bards (Canaith Mandolin), Instrument of the Bards (Mac-Fuirmidh Cittern) |
| Ioun Stone | м+к | 14 | Ioun Stone (Greater Absorption), Ioun Stone (Protection), Ioun Stone (Intellect), Ioun Stone (Leadership), Ioun Stone (Mastery), Ioun Stone (Absorption), Ioun Stone (Insight), Ioun Stone (Regeneration), Ioun Stone (Reserve), Ioun Stone (Strength), Ioun Stone (Agility), Ioun Stone (Fortitude), Ioun Stone (Awareness), Ioun Stone (Sustenance) |
| Potion of Giant Strength | м+к | 12 | Potion of Fire Giant Strength, Potion of Giant Strength (Fire Giant), Potion of Giant Strength (Stone Giant), Potion of Stone Giant Strength, Potion of Frost Giant Strength, Potion of Giant Strength (Frost Giant), Potion of Giant Strength (Hill), Potion of Hill Giant Strength, Potion of Cloud Giant Strength, Potion of Giant Strength (Cloud Giant), Potion of Giant Strength (Storm Giant), Potion of Storm Giant Strength |
| Potion of Healing | м+к | 4 | Potion of Greater Healing, Potion of Superior Healing, Potion of Supreme Healing, Potion of Healing |
| Potion of Invisibility | м | 1 | Potion of Greater Invisibility |
| Potion of Resistance | м | 9 | Potion of Resistance (Lightning), Potion of Resistance (Radiant), Potion of Resistance (Fire), Potion of Resistance (Thunder), Potion of Resistance (Acid), Potion of Resistance (Necrotic), Potion of Resistance (Psychic), Potion of Resistance (Force), Potion of Resistance (Cold) |
| Quaal's Feather Token | м+к | 6 | Quaal's Feather Token (Whip), Quaal's Feather Token (Fan), Quaal's Feather Token (Tree), Quaal's Feather Token (Bird), Quaal's Feather Token (Swan Boat), Quaal's Feather Token (Anchor) |
| Ring of Poison Resistance | к | 1 | Ring of Resistance |
| Rod of the Pact Keeper | м+к | 3 | Rod of the Pact Keeper +2, Rod of the Pact Keeper +3, Rod of the Pact Keeper +1 |
| Shield, +1, +2, or +3 | к | 3 | Shield +1, Shield +2, Shield +3 |
| Spell Scroll | м+к | 10 | Spell Scroll (Level 1), Spell Scroll (Level 2), Spell Scroll (Level 3), Spell Scroll (Level 4), Spell Scroll (Level 5), Spell Scroll (Level 6), Spell Scroll (Level 7), Spell Scroll (Level 8), Spell Scroll (Level 9), Spell Scroll (Cantrip) |
| Wand of the War Mage +1, +2, or +3 | к | 3 | Wand of the War Mage +1, Wand of the War Mage +2, Wand of the War Mage +3 |
| Weapon +1, +2, or +3 | к | 3 | Weapon +1, Weapon +2, Weapon +3 |

## 4. Наші записи без сторінки aidedd і без бандла

57 записів, і кожен має причину.

| Предмет | id | Рідкість | Чому немає сторінки |
|---|---:|---|---|
| Adamantine Weapon | 1001 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Ammunition of Slaying | 1002 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Apparatus of the Crab | 568 | LEGENDARY | дубль — той самий предмет уже є під назвою 2014, розділ 5 |
| Arcane Propulsion Arm | 43 | VERY_RARE | немає ні серед 473 сторінок aidedd, ні в 2024-пулі — потребує погляду власника |
| Baba Yaga's Dancing Broom | 1012 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Cleansing Stone | 87 | COMMON | немає ні серед 473 сторінок aidedd, ні в 2024-пулі — потребує погляду власника |
| Cube of Summoning | 1035 | RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Efficient Quiver | 119 | UNCOMMON | дубль — той самий предмет уже є під назвою 2014, розділ 5 |
| Energy Bow | 1055 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Armor (Cantrip) | 1056 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Armor (Level 1) | 1057 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Armor (Level 2) | 1058 | RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Armor (Level 3) | 1059 | RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Armor (Level 4) | 1060 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Armor (Level 5) | 1061 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Armor (Level 6) | 1062 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Armor (Level 7) | 1063 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Armor (Level 8) | 1064 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Staff (Cantrip) | 1065 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Staff (Level 1) | 1066 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Staff (Level 2) | 1067 | RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Staff (Level 3) | 1068 | RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Staff (Level 4) | 1069 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Staff (Level 5) | 1070 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Staff (Level 6) | 1071 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Staff (Level 7) | 1072 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Staff (Level 8) | 1073 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Weapon (Cantrip) | 1074 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Weapon (Level 1) | 1075 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Weapon (Level 2) | 1076 | RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Weapon (Level 3) | 1077 | RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Weapon (Level 4) | 1078 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Weapon (Level 5) | 1079 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Weapon (Level 6) | 1080 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Weapon (Level 7) | 1081 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Enspelled Weapon (Level 8) | 1082 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Executioner's Axe | 1084 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Hag Eye | 1090 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Hat of Many Spells | 1092 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Lute of Thunderous Thumping | 1108 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Marvelous Pigments | 130 | VERY_RARE | дубль — той самий предмет уже є під назвою 2014, розділ 5 |
| Perfume of Bewitching | 1120 | COMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Potion of Comprehension | 1130 | COMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Potion of Pugilism | 1140 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Quarterstaff of the Acrobat | 1151 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Rival Coin | 1159 | COMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Scroll of Titan Summoning | 1170 | LEGENDARY | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Shield of the Cavalier | 1174 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Silvered Weapon | 1175 | COMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Spirit Board | 1189 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Staff of Defense | 89 | RARE | немає ні серед 473 сторінок aidedd, ні в 2024-пулі — потребує погляду власника |
| Sylvan Talon | 1203 | COMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Thunderous Greatclub | 1210 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Ventilating Lungs | 40 | RARE | немає ні серед 473 сторінок aidedd, ні в 2024-пулі — потребує погляду власника |
| Wraps of Unarmed Power +1 | 1222 | UNCOMMON | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Wraps of Unarmed Power +2 | 1223 | RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |
| Wraps of Unarmed Power +3 | 1224 | VERY_RARE | є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає |

## 5. Той самий предмет двома назвами

2024 перейменувала ці предмети, і в каталозі опинилися **обидва** записи: наш власний під
назвою 2024 і завезений партією під назвою 2014. Обидва id — публічні адреси
`/magic-items/NNNN`, тому звіт їх називає, а не зшиває: злиття означає прибрати одну адресу,
а це рішення власника (питання 2).

| Сторінка aidedd (назва 2014) | id | Наш дубль (назва 2024) | id |
|---|---:|---|---:|
| Apparatus of Kwalish | 1004 | Apparatus of the Crab | 568 |
| Nolzur's Marvelous Pigments | 1116 | Marvelous Pigments | 130 |
| Quiver of Ehlonna | 36 | Efficient Quiver | 119 |

## 6. Поля збігів: тип, рідкість, налаштування

Розділи 1–5 звіряють назви. Цей звіряє **механічну класифікацію** тих предметів, у яких
сторінка aidedd і наш каталог зійшлися за назвою: `itemType`, `rarity`, `requiresAttunement`
поле-в-поле. Порівнюються три стани: **базовий корпус** (`baseline.json` — те, що було до
O14), **aidedd** (розпарсена сторінка) і **сід зараз** (базовий корпус плюс партії).

Зіставилося за назвою з базовим корпусом: **310**. Розійшлися: **15**. Ще не розвʼязано: **6**.

| Предмет | Поле | Базовий корпус | aidedd | Сід зараз | Маніфест | Що це |
|---|---|---|---|---|---|---|
| Blackrazor | рідкість | ARTIFACT | LEGENDARY | LEGENDARY | translated | виправлено партією за джерелом |
| Boots of False Tracks | налаштування | true | false | true | deferred | не розвʼязано — сторінка лише резюме, у партію не входить |
| Daern's Instant Fortress | налаштування | true | false | false | translated | виправлено партією за джерелом |
| Ersatz Eye | налаштування | false | true | false | deferred | не розвʼязано — сторінка лише резюме, у партію не входить |
| Hammer of Thunderbolts | налаштування | true | false | false | translated | виправлено партією за джерелом |
| Helm of Brilliance | рідкість | LEGENDARY | VERY_RARE | VERY_RARE | translated | виправлено партією за джерелом |
| Instrument of Illusions | налаштування | false | true | false | deferred | не розвʼязано — сторінка лише резюме, у партію не входить |
| Instrument of Scribing | налаштування | false | true | false | deferred | не розвʼязано — сторінка лише резюме, у партію не входить |
| Nature's Mantle | налаштування | false | true | false | deferred | не розвʼязано — сторінка лише резюме, у партію не входить |
| Prosthetic Limb | налаштування | true | false | true | deferred | не розвʼязано — сторінка лише резюме, у партію не входить |
| Ring of Resistance | налаштування | false | true | true | translated | виправлено партією за джерелом |
| Sword of Kas | тип | WEAPON | WONDROUS_ITEM | WEAPON | translated | дефект джерела — рядок типу заперечує текст тієї самої сторінки, `SOURCE_ITEM_TYPE_OVERRIDES` |
| Vicious Weapon | рідкість | UNCOMMON | RARE | RARE | translated | виправлено партією за джерелом |
| Wave | рідкість | ARTIFACT | LEGENDARY | LEGENDARY | translated | виправлено партією за джерелом |
| Whelm | рідкість | ARTIFACT | LEGENDARY | LEGENDARY | translated | виправлено партією за джерелом |

Розбіжність вважається розвʼязаною, коли партія перекладу вже переписала поле значенням
джерела, або коли значення джерела свідомо відхилене в `SOURCE_ITEM_TYPE_OVERRIDES`.
Нерозвʼязані — це предмети зі сторінкою «лише резюме»: рядок типу на такій сторінці є, а
тексту правил немає, тому предмет позначено `deferred` і в жодну партію він не входить —
виправити поле нема кому. Це відкрите питання власника, а не дефект конвеєра.
