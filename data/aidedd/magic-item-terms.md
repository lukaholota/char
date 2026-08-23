# Реєстр термінів магічних предметів — зібраний машинно зі сторінок aidedd

> **Згенеровано** `npx tsx scripts/aidedd/build-item-terms-registry.ts` з 473 кешованих сторінок `data/aidedd/raw/magic-items-2014/`.
> Руками не редагувати — правити генератор або словник і перегенерувати.

**Це стоп-гейт [KR14.3](../../docs/o14-magic-items-aidedd/kr14.3-terms-registry.md).** Доки
власник не затвердив переклад для кожного ❓, жодна партія предметів не перекладається.
Затверджене йде в `src/lib/refs/dictionary.json`, а не в паралельний словник.

Позначки: ✅ — англійський термін уже має ключ у `dictionary.json` або `translation.ts`
(для заклинань — затверджену назву з `SPELLS`); ❓ — рішення власника потрібне.

**Разом термінів поза словником: 173.**

## Типи предметів

_Як зібрано: перше слово рядка типу (`div.type`) — воно ж колонка `item_type`. Усього 9, з них нових 0._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ✅ | WONDROUS_ITEM | 253 | `absorbing-tattoo` | — (є у словнику) |
| ✅ | WEAPON | 75 | `adze-of-annam` | — (є у словнику) |
| ✅ | ARMOR | 41 | `adamantine-armor` | — (є у словнику) |
| ✅ | RING | 27 | `ring-of-amity` | — (є у словнику) |
| ✅ | POTION | 26 | `elixir-of-health` | — (є у словнику) |
| ✅ | STAFF | 20 | `blackstaff` | — (є у словнику) |
| ✅ | WAND | 19 | `spindle-of-fate` | — (є у словнику) |
| ✅ | ROD | 10 | `immovable-rod` | — (є у словнику) |
| ✅ | SCROLL | 2 | `scroll-of-protection` | — (є у словнику) |

## Рідкості

_Як зібрано: усі рідкості, перелічені в рядку типу; «rarity varies» — окремим рядком. Усього 8, з них нових 2._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ✅ | RARE | 142 | `alchemical-compendium` | — (є у словнику) |
| ✅ | UNCOMMON | 117 | `adamantine-armor` | — (є у словнику) |
| ✅ | VERY_RARE | 97 | `absorbing-tattoo` | — (є у словнику) |
| ✅ | LEGENDARY | 59 | `apparatus-of-kwalish` | — (є у словнику) |
| ✅ | COMMON | 52 | `armor-of-gleaming` | — (є у словнику) |
| ✅ | ARTIFACT | 22 | `adze-of-annam` | — (є у словнику) |
| ❓ | rarity varies | 11 | `barrier-tattoo` |  |
| ❓ | Wondrous item, rarity by figurine | 2 | `figurine-of-wondrous-power` |  |

## Підтипи в дужках

_Як зібрано: дужковий уточнювач після типу: `Weapon (any sword)`, `Armor (medium or heavy)`. Усього 49, з них нових 16._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ❓ | any sword | 16 | `bloodshed-blade` |  |
| ✅ | shield | 12 | `animated-shield` | — (є у словнику) |
| ❓ | tattoo | 11 | `absorbing-tattoo` |  |
| ❓ | light medium or heavy | 8 | `antimagic-armor` |  |
| ✅ | plate | 6 | `armor-of-invulnerability` | — (є у словнику) |
| ❓ | any ammunition | 5 | `ammunition-1-2-or-3` |  |
| ✅ | any | 4 | `smoldering-armor` | — (є у словнику) |
| ❓ | any bow | 4 | `bow-of-conflagration` |  |
| ✅ | dagger | 3 | `baleful-talon` | — (є у словнику) |
| ✅ | flail | 3 | `devotee-s-censer` | — (є у словнику) |
| ✅ | longsword | 3 | `sun-blade` | — (є у словнику) |
| ✅ | mace | 3 | `mace-of-disruption` | — (є у словнику) |
| ✅ | trident | 3 | `tidecaller-trident` | — (є у словнику) |
| ✅ | warhammer | 3 | `dwarven-thrower` | — (є у словнику) |
| ❓ | any sword that deals slashing damage | 2 | `sword-of-sharpness` |  |
| ❓ | arrow | 2 | `arrow-of-slaying` |  |
| ✅ | greataxe | 2 | `adze-of-annam` | — (є у словнику) |
| ✅ | heavy | 2 | `armor-of-safeguarding` | — (є у словнику) |
| ✅ | longbow | 2 | `longbow-of-the-healing-hearth` | — (є у словнику) |
| ❓ | medium or heavy | 2 | `armor-of-gleaming` |  |
| ❓ | medium or heavy but not hide | 2 | `adamantine-armor` |  |
| ✅ | studded leather | 2 | `glamoured-studded-leather` | — (є у словнику) |
| ✅ | whip | 2 | `grasping-whip` | — (є у словнику) |
| ❓ | any axe | 1 | `berserker-axe` |  |
| ❓ | any axe or sword | 1 | `giant-slayer` |  |
| ❓ | any crossbow | 1 | `starshot-crossbow` |  |
| ❓ | any martial weapon | 1 | `weapon-of-throne-s-command` |  |
| ❓ | any weapon that deals bludgeoning damage | 1 | `forcebreaker-weapon` |  |
| ✅ | battleaxe | 1 | `axe-of-the-dwarvish-lords` | — (є у словнику) |
| ✅ | breastplate | 1 | `stonebreaker-s-breastplate` | — (є у словнику) |
| ✅ | chain mail | 1 | `efreeti-chain` | — (є у словнику) |
| ✅ | chain shirt | 1 | `elven-chain` | — (є у словнику) |
| ❓ | firearm | 1 | `topaz-annihilator` |  |
| ✅ | greats word | 1 | `blackrazor` | — (є у словнику) |
| ✅ | holy symbol | 1 | `guardian-emblem` | — (є у словнику) |
| ✅ | javelin | 1 | `javelin-of-lightning` | — (є у словнику) |
| ❓ | lance or pike | 1 | `dragonlance` |  |
| ✅ | light | 1 | `zephyr-armor` | — (є у словнику) |
| ✅ | longs word | 1 | `moonblade` | — (є у словнику) |
| ✅ | maul | 1 | `hammer-of-thunderbolts` | — (є у словнику) |
| ✅ | medium | 1 | `armor-of-fungal-spores` | — (є у словнику) |
| ✅ | morningstar | 1 | `reaper-s-scream` | — (є у словнику) |
| ✅ | musket | 1 | `lucent-destroyer` | — (є у словнику) |
| ✅ | pistol | 1 | `thunderbuss` | — (є у словнику) |
| ✅ | scale mail | 1 | `dragon-scale-mail` | — (є у словнику) |
| ✅ | scimitar | 1 | `scimitar-of-speed` | — (є у словнику) |
| ✅ | sickle | 1 | `moon-sickle` | — (є у словнику) |
| ✅ | sling | 1 | `sling-of-giant-felling` | — (є у словнику) |
| ✅ | war pick | 1 | `stonemaker-war-pick` | — (є у словнику) |

## Умови налаштування

_Як зібрано: хвіст `(requires attunement …)` — саме той рядок, який UI показує окремим полем. Усього 31, з них нових 31._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ❓ | by a spellcaster | 15 | `iggwilv-s-cauldron` |  |
| ❓ | by a wizard | 13 | `alchemical-compendium` |  |
| ❓ | by a sorcerer | 7 | `astral-shard` |  |
| ❓ | by a bard | 4 | `instrument-of-the-bards` |  |
| ❓ | by a cleric or paladin | 4 | `amulet-of-the-devout` |  |
| ❓ | by a sorcerer, warlock, or wizard | 4 | `robe-of-the-archmagi` |  |
| ❓ | by a cleric, druid, or warlock | 3 | `staff-of-the-adder` |  |
| ❓ | by a bard, cleric, druid, sorcerer, warlock, or wizard | 2 | `staff-of-charming` |  |
| ❓ | by a cleric, druid, or paladin | 2 | `necklace-of-prayer-beads` |  |
| ❓ | by a creature of good alignment | 2 | `book-of-exalted-deeds` |  |
| ❓ | by a druid or ranger | 2 | `moon-sickle` |  |
| ❓ | by a druid or warlock | 2 | `bell-branch` |  |
| ❓ | by a druid, sorcerer, warlock, or wizard | 2 | `staff-of-fire` |  |
| ❓ | by a dwarf | 2 | `dwarven-thrower` |  |
| ❓ | by a warlock | 2 | `dark-shard-amulet` |  |
| ❓ | by a bard, cleric, or druid | 1 | `staff-of-healing` |  |
| ❓ | by a bard, sorcerer, or warlock | 1 | `jester-s-mask` |  |
| ❓ | by a cleric, druid, or wizard | 1 | `sun-staff` |  |
| ❓ | by a creature of evil alignment | 1 | `talisman-of-ultimate-evil` |  |
| ❓ | by a creature of non-lawful alignment | 1 | `blackrazor` |  |
| ❓ | by a creature that worships a god of the sea | 1 | `wave` |  |
| ❓ | by a creature the sword deems worthy | 1 | `sword-of-zariel` |  |
| ❓ | by a creature with an Intelligence score of 3 or higher | 1 | `psi-crystal` |  |
| ❓ | by a creature with the same alignment as the sword | 1 | `sword-of-answering` |  |
| ❓ | by a druid | 1 | `staff-of-the-woodlands` |  |
| ❓ | by a monk | 1 | `dragonhide-belt` |  |
| ❓ | by a paladin | 1 | `holy-avenger` |  |
| ❓ | by an artificer | 1 | `all-purpose-tool` |  |
| ❓ | by an elf or half-elf of neutral good alignment | 1 | `moonblade` |  |
| ❓ | by the Blackstaff heir, who must be a wizard | 1 | `blackstaff` |  |
| ❓ | outdoors at night | 1 | `ring-of-shooting-stars` |  |

## Формули опису

_Як зібрано: фрази-шаблони: заряди, командне слово, тригери носіння, бонуси, прокляття, відпочинок. Усього 38, з них нових 35._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ❓ | you can use an action to | 103 | `amulet-of-the-planes` |  |
| ❓ | while wearing | 62 | `amulet-of-proof-against-detection-and-location` |  |
| ❓ | within N feet of you | 47 | `amulet-of-the-planes` |  |
| ❓ | while you hold / while holding | 45 | `animated-shield` |  |
| ❓ | daily at dawn | 43 | `cube-of-force` |  |
| ❓ | has N charges | 43 | `cubic-gate` |  |
| ❓ | cast the … spell (from it) | 41 | `amulet-of-the-planes` |  |
| ❓ | regains Nd? expended charges daily at dawn | 39 | `cube-of-force` |  |
| ❓ | command word | 37 | `animated-shield` |  |
| ✅ | hit points (regain/lose) | 37 | `apparatus-of-kwalish` | — (є у словнику) |
| ❓ | until the next dawn | 36 | `alchemy-jug` |  |
| ❓ | +N bonus to attack and damage rolls | 31 | `axe-of-the-dwarvish-lords` |  |
| ❓ | while you wear (this\|these) | 27 | `amulet-of-health` |  |
| ❓ | advantage on … saving throws | 26 | `antimagic-armor` |  |
| ❓ | expend(s) N charge(s) | 26 | `cubic-gate` |  |
| ❓ | resistance to … damage | 20 | `armor-of-invulnerability` |  |
| ❓ | last charge → roll a d20 → item is destroyed | 19 | `staff-of-charming` |  |
| ❓ | disadvantage on … | 17 | `berserker-axe` |  |
| ❓ | spell save DC | 14 | `instrument-of-the-bards` |  |
| ❓ | +N bonus to AC | 13 | `arrow-catching-shield` |  |
| ✅ | as a bonus action | 13 | `animated-shield` | — (є у словнику) |
| ❓ | while you are attuned / while attuned | 13 | `belt-of-dwarvenkind` |  |
| ❓ | curse / cursed | 11 | `armor-of-vulnerability` |  |
| ❓ | you can use a reaction | 11 | `arrow-catching-shield` |  |
| ❓ | immunity to … damage | 8 | `armor-of-invulnerability` |  |
| ❓ | the spell is cast at Nth level | 7 | `orb-of-dragonkind` |  |
| ❓ | your spell save DC / spellcasting ability | 7 | `instrument-of-the-bards` |  |
| ❓ | DC N ability check | 6 | `apparatus-of-kwalish` |  |
| ✅ | difficult terrain | 6 | `boots-of-the-winterlands` | — (є у словнику) |
| ❓ | sentience / personality | 6 | `blackrazor` |  |
| ❓ | short rest / long rest | 5 | `boots-of-speed` |  |
| ❓ | +N bonus to spell attack rolls | 4 | `staff-of-the-magi` |  |
| ❓ | a creature of your choice | 4 | `dancing-sword` |  |
| ❓ | attunement ends only if … | 4 | `armor-of-vulnerability` |  |
| ❓ | while you carry / while carrying | 3 | `book-of-vile-darkness` |  |
| ❓ | +N bonus to saving throws | 2 | `luck-blade` |  |
| ❓ | once per day / N times per day | 1 | `blackrazor` |  |
| ❓ | requires no material components | 1 | `spellwrought-tattoo` |  |

## Заклинання, названі в описах

_Як зібрано: посилання `sorts.php?vo=` у тілі сторінки; український відповідник береться з `dictionary.json → SPELLS` дослівно і наново не перекладається. Усього 99, з них нових 0._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ✅ | fireball | 8 | `helm-of-brilliance` | Вогнекуля [Fireball] |
| ✅ | wish | 8 | `blackrazor` | Бажання [Wish] |
| ✅ | conjure-elemental | 6 | `bowl-of-commanding-water-elementals` | З'ява стихійника [Conjure Elemental] |
| ✅ | detect-magic | 5 | `orb-of-dragonkind` | Виявлення магії [Detect Magic] |
| ✅ | detect-thoughts | 5 | `crystal-ball` | Виявлення думок [Detect Thoughts] |
| ✅ | wall-of-fire | 5 | `cube-of-force` | Стіна вогню [Wall of Fire] |
| ✅ | daylight | 4 | `driftglobe` | Денне світло [Daylight] |
| ✅ | enlarge-reduce | 4 | `potion-of-diminution` | Збільшення/Зменшення [Enlarge/Reduce] |
| ✅ | identify | 4 | `armor-of-vulnerability` | Розпізнавання [Identify] |
| ✅ | light | 4 | `driftglobe` | Світло [Light] |
| ✅ | lightning-bolt | 4 | `staff-of-power` | Заряд блискавки [Lightning Bolt] |
| ✅ | magic-missile | 4 | `brooch-of-shielding` | Магічний дротик [Magic missile] |
| ✅ | animal-friendship | 3 | `potion-of-animal-friendship` | Дружба з тваринами [Animal friendship] |
| ✅ | cure-wounds | 3 | `necklace-of-prayer-beads` | Лікування ран [Cure Wounds] |
| ✅ | detect-evil-and-good | 3 | `candle-of-invocation` | Виявлення зла та добра [Detect evil and good] |
| ✅ | gate | 3 | `candle-of-invocation` | Брама [Gate] |
| ✅ | ice-storm | 3 | `ring-of-elemental-command` | Крижаний шторм [Ice Storm] |
| ✅ | lesser-restoration | 3 | `dust-of-sneezing-and-choking` | Мале відновлення [Lesser Restoration] |
| ✅ | plane-shift | 3 | `amulet-of-the-planes` | Планарний перехід [Plane Shift] |
| ✅ | remove-curse | 3 | `armor-of-vulnerability` | Зняття проклять [Remove Curse] |
| ✅ | speak-with-animals | 3 | `ring-of-animal-influence` | Розмова з тваринами [Speak with Animals] |
| ✅ | suggestion | 3 | `crystal-ball` | Навіювання [Suggestion] |
| ✅ | web | 3 | `cloak-of-arachnida` | Павутиння [Web] |
| ✅ | bless | 2 | `necklace-of-prayer-beads` | Благословення [Bless] |
| ✅ | burning-hands | 2 | `ring-of-elemental-command` | Палючі долоні [Burning Hands] |
| ✅ | charm-person | 2 | `eyes-of-charming` | Причарування особи [Charm Person] |
| ✅ | command | 2 | `staff-of-charming` | Наказ [Command] |
| ✅ | comprehend-languages | 2 | `helm-of-comprehending-languages` | Розуміння мов [Comprehend Languages] |
| ✅ | cone-of-cold | 2 | `staff-of-frost` | Конус холоду [Cone of Cold] |
| ✅ | disintegrate | 2 | `cube-of-force` | Розщеплення [Disintegrate] |
| ✅ | etherealness | 2 | `oil-of-etherealness` | Етерність [Etherealness] |
| ✅ | faerie-fire | 2 | `ring-of-shooting-stars` | Вогники фей [Faerie fire] |
| ✅ | greater-restoration | 2 | `necklace-of-prayer-beads` | Більше відновлення [Greater Restoration] |
| ✅ | gust-of-wind | 2 | `ring-of-elemental-command` | Порив вітру [Gust of Wind] |
| ✅ | haste | 2 | `blackrazor` | Прискорення [Haste] |
| ✅ | hold-monster | 2 | `staff-of-power` | Стримування монстра [Hold Monster] |
| ✅ | invisibility | 2 | `staff-of-the-magi` | Невидимість [Invisibility] |
| ✅ | knock | 2 | `daern-s-instant-fortress` | Стукіт [Knock] |
| ✅ | levitate | 2 | `boots-of-levitation` | Левітація [Levitate] |
| ✅ | passwall | 2 | `cube-of-force` | Створити прохід [Passwall] |
| ✅ | polymorph | 2 | `cloak-of-the-bat` | Перевтілення [Polymorph] |
| ✅ | prismatic-spray | 2 | `cube-of-force` | Веселкові бризки [Prismatic Spray] |
| ✅ | scrying | 2 | `crystal-ball` | Стеження [Scrying] |
| ✅ | stinking-cloud | 2 | `necklace-of-adaptation` | Смердюча хмара [Stinking Cloud] |
| ✅ | telekinesis | 2 | `ring-of-telekinesis` | Телекінез [Telekinesis] |
| ✅ | wall-of-ice | 2 | `ring-of-elemental-command` | Стіна льоду [Wall of Ice] |
| ✅ | animal-messenger | 1 | `figurine-of-wondrous-power` | Тварина-посланець [Animal messenger] |
| ✅ | arcane-lock | 1 | `staff-of-the-magi` | Арканний замок [Arcane Lock] |
| ✅ | awaken | 1 | `staff-of-the-woodlands` | Пробудження [Awaken] |
| ✅ | banishment | 1 | `sword-of-vengeance` | Вигнання [Banishment] |
| ✅ | barkskin | 1 | `staff-of-the-woodlands` | Дубова шкіра [Barkskin] |
| ✅ | branding-smite | 1 | `necklace-of-prayer-beads` | Таврувальна кара [Branding Smite] |
| ✅ | chain-lightning | 1 | `ring-of-elemental-command` | Ланцюгова блискавка [Chain Lightning] |
| ✅ | clairvoyance | 1 | `potion-of-clairvoyance` | Підглядання [Clairvoyance] |
| ✅ | cloudkill | 1 | `necklace-of-adaptation` | Вбивча хмара [Cloudkill] |
| ✅ | control-water | 1 | `ring-of-elemental-command` | Контроль води [Control Water] |
| ✅ | create-or-destroy-water | 1 | `ring-of-elemental-command` | Створення чи знищення води [Create or Destroy Water] |
| ✅ | dancing-lights | 1 | `ring-of-shooting-stars` | Мерехтливі вогники [Dancing Lights] |
| ✅ | darkness | 1 | `wand-of-wonder` | Темрява [Darkness] |
| ✅ | death-ward | 1 | `orb-of-dragonkind` | Захист від смерті [Death Ward] |
| ✅ | detect-poison-and-disease | 1 | `rod-of-alertness` | Виявлення отрут і хвороб [Detect Poison and Disease] |
| ✅ | dimension-door | 1 | `cape-of-the-mountebank` | Двері між вимірами [Dimension Door] |
| ✅ | disguise-self | 1 | `hat-of-disguise` | Маскування [Disguise Self] |
| ✅ | dispel-magic | 1 | `staff-of-the-magi` | Розвіювання магії [Dispel Magic] |
| ✅ | dominate-beast | 1 | `trident-of-fish-command` | Підкорення звіра [Dominate Beast] |
| ✅ | dominate-monster | 1 | `ring-of-elemental-command` | Підкорення монстра [Dominate Monster] |
| ✅ | fear | 1 | `ring-of-animal-influence` | Страх [Fear] |
| ✅ | flaming-sphere | 1 | `staff-of-the-magi` | Палюча сфера [Flaming Sphere] |
| ✅ | fog-cloud | 1 | `staff-of-frost` | Туманна хмара [Fog Cloud] |
| ✅ | freedom-of-movement | 1 | `oil-of-slipperiness` | Свобода рухів [Freedom of Movement] |
| ✅ | gaseous-form | 1 | `potion-of-gaseous-form` | Газоподібна форма [Gaseous Form] |
| ✅ | giant-insect | 1 | `staff-of-swarming-insects` | Гігантська комаха [Giant Insect] |
| ✅ | globe-of-invulnerability | 1 | `staff-of-power` | Сфера невразливості [Globe of Invulnerability] |
| ✅ | grease | 1 | `oil-of-slipperiness` | Смалець [Grease] |
| ✅ | heal | 1 | `rod-of-resurrection` | Зцілення [Heal] |
| ✅ | hold-person | 1 | `wand-of-binding` | Стримування особи [Hold Person] |
| ✅ | insect-plague | 1 | `staff-of-swarming-insects` | Нашестя комах [Insect Plague] |
| ✅ | jump | 1 | `ring-of-jumping` | Стрибок [Jump] |
| ✅ | locate-animals-or-plants | 1 | `staff-of-the-woodlands` | Пошук тварин або рослин [Locate Animals or Plants] |
| ✅ | locate-object | 1 | `whelm` | Пошук предмета [Locate Object] |
| ✅ | mage-hand | 1 | `staff-of-the-magi` | Магічна рука [Mage Hand] |
| ✅ | mass-cure-wounds | 1 | `staff-of-healing` | Масове лікування ран [Mass Cure Wounds] |
| ✅ | pass-without-trace | 1 | `staff-of-the-woodlands` | Переміщення без сліду [Pass without Trace] |
| ✅ | planar-ally | 1 | `necklace-of-prayer-beads` | Планарний союзник [Planar Ally] |
| ✅ | protection-from-evil-and-good | 1 | `staff-of-the-magi` | Захист від зла й добра [Protection from Evil and Good] |
| ✅ | ray-of-enfeeblement | 1 | `staff-of-power` | Промінь ослаблення [Ray of Enfeeblement] |
| ✅ | resurrection | 1 | `rod-of-resurrection` | Воскресіння [Resurrection] |
| ✅ | scorching-ray | 1 | `circlet-of-blasting` | Розпечений промінь [Scorching Ray] |
| ✅ | see-invisibility | 1 | `rod-of-alertness` | Бачення невидимого [See Invisibility] |
| ✅ | sending | 1 | `sending-stones` | Послання [Sending] |
| ✅ | speak-with-plants | 1 | `staff-of-the-woodlands` | Розмова з рослинами [Speak with Plants] |
| ✅ | stone-shape | 1 | `ring-of-elemental-command` | Форма каменю [Stone Shape] |
| ✅ | stoneskin | 1 | `ring-of-elemental-command` | Кам'яна шкіра [Stoneskin] |
| ✅ | teleport | 1 | `helm-of-teleportation` | Телепорт [Teleport] |
| ✅ | wall-of-force | 1 | `staff-of-power` | Стіна енергії [Wall of Force] |
| ✅ | wall-of-stone | 1 | `ring-of-elemental-command` | Стіна з каменю [Wall of Stone] |
| ✅ | wall-of-thorns | 1 | `staff-of-the-woodlands` | Стіна шипів [Wall of Thorns] |
| ✅ | wind-walk | 1 | `necklace-of-prayer-beads` | Прогулянка з вітром [Wind Walk] |
| ✅ | wind-wall | 1 | `ring-of-elemental-command` | Стіна вітрів [Wind Wall] |

## Перехресні посилання на інші предмети

_Як зібрано: посилання `om.php?vo=` у тілі опису (самопосилання зі службової шапки виключені) — назва такого предмета має збігатися з його власним записом у каталозі. Усього 13, з них нових 13._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ❓ | portable-hole | 3 | `bag-of-holding` |  |
| ❓ | bag-of-holding | 2 | `bag-of-devouring` |  |
| ❓ | belt-of-giant-strength | 1 | `hammer-of-thunderbolts` |  |
| ❓ | cap-of-water-breathing | 1 | `wave` |  |
| ❓ | cube-of-force | 1 | `wave` |  |
| ❓ | flame-tongue | 1 | `rod-of-lordly-might` |  |
| ❓ | gauntlets-of-ogre-power | 1 | `hammer-of-thunderbolts` |  |
| ❓ | ring-of-spell-storing | 1 | `moonblade` |  |
| ❓ | sphere-of-annihilation | 1 | `talisman-of-the-sphere` |  |
| ❓ | trident-of-fish-command | 1 | `wave` |  |
| ❓ | wave | 1 | `blackrazor` |  |
| ❓ | weapon-of-warning | 1 | `wave` |  |
| ❓ | whelm | 1 | `blackrazor` |  |

## Типи ушкоджень

_Як зібрано: усе, що вжито як «<Тип> damage». Усього 29, з них нових 15._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ✅ | necrotic | 18 | `baleful-talon` | — (є у словнику) |
| ✅ | force | 17 | `bag-of-beans` | — (є у словнику) |
| ✅ | fire | 16 | `bag-of-beans` | — (є у словнику) |
| ✅ | radiant | 13 | `book-of-exalted-deeds` | — (є у словнику) |
| ❓ | much | 10 | `bag-of-beans` |  |
| ✅ | slashing | 10 | `boomerang-shield` | — (є у словнику) |
| ✅ | poison | 9 | `axe-of-the-dwarvish-lords` | — (є у словнику) |
| ✅ | bludgeoning | 8 | `apparatus-of-kwalish` | — (є у словнику) |
| ✅ | cold | 7 | `boots-of-the-winterlands` | — (є у словнику) |
| ✅ | psychic | 7 | `book-of-vile-darkness` | — (є у словнику) |
| ❓ | to | 7 | `bloodshed-blade` |  |
| ✅ | thunder | 5 | `bow-of-melodies` | — (є у словнику) |
| ✅ | lightning | 4 | `javelin-of-lightning` | — (є у словнику) |
| ✅ | piercing | 4 | `arrow-of-slaying` | — (є у словнику) |
| ❓ | take | 2 | `cloak-of-displacement` |  |
| ✅ | acid | 1 | `ring-of-elemental-command` | — (є у словнику) |
| ❓ | avoid | 1 | `jester-s-mask` |  |
| ❓ | dealing | 1 | `grasping-whip` |  |
| ❓ | following | 1 | `armor-of-vulnerability` |  |
| ❓ | halving | 1 | `shadowfell-brand-tattoo` |  |
| ❓ | max | 1 | `rod-of-hellish-flames` |  |
| ❓ | mod | 1 | `bloodshed-blade` |  |
| ❓ | most | 1 | `orb-of-dragonkind` |  |
| ❓ | nonmagical | 1 | `armor-of-invulnerability` |  |
| ❓ | other | 1 | `daern-s-instant-fortress` |  |
| ❓ | s | 1 | `sword-of-wounding` |  |
| ❓ | three | 1 | `armor-of-vulnerability` |  |
| ❓ | total | 1 | `wand-of-wonder` |  |
| ✅ | weapon | 1 | `sword-of-sharpness` | — (є у словнику) |

## Стани

_Як зібрано: усе, що вжито як «<стан> condition» або як назва стану в дужках. Усього 6, з них нових 2._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ❓ | a | 1 | `outer-essence-shard` |  |
| ❓ | certain | 1 | `shield-of-the-blazing-dreadnought` |  |
| ✅ | deafened | 1 | `ear-horn-of-hearing` | — (є у словнику) |
| ✅ | invisible | 1 | `starshot-crossbow` | — (є у словнику) |
| ✅ | poisoned | 1 | `periapt-of-proof-against-poison` | — (є у словнику) |
| ✅ | prone | 1 | `sling-of-giant-felling` | — (є у словнику) |

## Заголовки таблиць

_Як зібрано: шапки `<table>` у описах — 34 сторінки мають таблиці. Усього 59, з них нових 44._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ✅ | d100 | 10 | `bag-of-beans` | — (є у словнику) |
| ❓ | Rarity | 5 | `belt-of-giant-strength` |  |
| ❓ | Effect | 4 | `bag-of-beans` |  |
| ✅ | d10 | 3 | `armor-of-resistance` | — (є у словнику) |
| ✅ | d20 | 3 | `candle-of-invocation` | — (є у словнику) |
| ❓ | Damage Type | 3 | `armor-of-resistance` |  |
| ✅ | Gem | 3 | `elemental-gem` | — (є у словнику) |
| ✅ | Alignment | 2 | `candle-of-invocation` | — (є у словнику) |
| ✅ | Damage | 2 | `staff-of-power` | — (є у словнику) |
| ❓ | Distance from Origin | 2 | `staff-of-power` |  |
| ❓ | Playing Card | 2 | `deck-of-illusions` |  |
| ✅ | Strength | 2 | `belt-of-giant-strength` | — (є у словнику) |
| ❓ | Attack Bonus | 1 | `spell-scroll` |  |
| ❓ | Bead of ... | 1 | `necklace-of-prayer-beads` |  |
| ❓ | Berserkers Summoned | 1 | `horn-of-valhalla` |  |
| ❓ | Capacity | 1 | `carpet-of-flying` |  |
| ❓ | Card | 1 | `deck-of-many-things` |  |
| ✅ | Charges | 1 | `cube-of-force` | — (є у словнику) |
| ❓ | Charges Lost | 1 | `cube-of-force` |  |
| ❓ | Contents | 1 | `iron-flask` |  |
| ❓ | Cost | 1 | `manual-of-golems` |  |
| ❓ | Creature | 1 | `bag-of-tricks` |  |
| ✅ | d8 | 1 | `bag-of-tricks` | — (є у словнику) |
| ❓ | Down | 1 | `apparatus-of-kwalish` |  |
| ✅ | Dragon | 1 | `dragon-scale-mail` | — (є у словнику) |
| ❓ | Face | 1 | `cube-of-force` |  |
| ❓ | Feather Token | 1 | `quaal-s-feather-token` |  |
| ❓ | Flying Speed | 1 | `carpet-of-flying` |  |
| ❓ | Golem | 1 | `manual-of-golems` |  |
| ❓ | Horn Type | 1 | `horn-of-valhalla` |  |
| ❓ | HP Regained | 1 | `potion-of-healing` |  |
| ✅ | Illusion | 1 | `deck-of-illusions` | — (є у словнику) |
| ❓ | Instrument | 1 | `instrument-of-the-bards` |  |
| ❓ | Intelligence Score | 1 | `psi-crystal` |  |
| ❓ | Lever | 1 | `apparatus-of-kwalish` |  |
| ❓ | Light Intensity | 1 | `psi-crystal` |  |
| ❓ | Lightning Damage | 1 | `ring-of-shooting-stars` |  |
| ❓ | Liquid | 1 | `alchemy-jug` |  |
| ❓ | Max Amount | 1 | `alchemy-jug` |  |
| ✅ | Name | 1 | `sword-of-answering` | — (є у словнику) |
| ❓ | Patch | 1 | `robe-of-useful-items` |  |
| ❓ | Potion of ... | 1 | `potion-of-healing` |  |
| ❓ | Property | 1 | `moonblade` |  |
| ❓ | Range of Telepathy | 1 | `psi-crystal` |  |
| ❓ | Requirement | 1 | `horn-of-valhalla` |  |
| ✅ | Resistance | 1 | `dragon-scale-mail` | — (є у словнику) |
| ❓ | Result | 1 | `sphere-of-annihilation` |  |
| ❓ | Save DC | 1 | `spell-scroll` |  |
| ❓ | Size | 1 | `carpet-of-flying` |  |
| ✅ | Spell | 1 | `necklace-of-prayer-beads` | — (є у словнику) |
| ❓ | Spell Level | 1 | `spell-scroll` |  |
| ❓ | Spell or Item | 1 | `cube-of-force` |  |
| ✅ | Spells | 1 | `instrument-of-the-bards` | — (є у словнику) |
| ❓ | Spheres | 1 | `ring-of-shooting-stars` |  |
| ❓ | Summoned Elemental | 1 | `elemental-gem` |  |
| ❓ | Time | 1 | `manual-of-golems` |  |
| ❓ | Type | 1 | `belt-of-giant-strength` |  |
| ❓ | Type of Giant | 1 | `potion-of-giant-strength` |  |
| ❓ | Up | 1 | `apparatus-of-kwalish` |  |

## Джерела

_Як зібрано: рядок `div.source`; у колонках `MagicItem` джерела немає, це довідка для звірки. Усього 15, з них нових 15._

| | Термін | Сторінок | Приклад | Український відповідник |
|---|---|---:|---|---|
| ❓ | Dungeon Master´s Guide (SRD) | 240 | `adamantine-armor` |  |
| ❓ | The Book of Many Things | 54 | `antimagic-armor` |  |
| ❓ | Xanathar´s Guide to Everything | 48 | `armor-of-gleaming` |  |
| ❓ | Tasha´s Cauldron of Everything | 47 | `absorbing-tattoo` |  |
| ❓ | Glory of the Giants | 27 | `adze-of-annam` |  |
| ❓ | Dungeon Master´s Guide | 24 | `axe-of-the-dwarvish-lords` |  |
| ❓ | Fizban´s Treasury of Dragons | 13 | `amethyst-lodestone` |  |
| ❓ | Dungeon Master´s Guide (BR) | 11 | `alchemy-jug` |  |
| ❓ | Adventures (Tomb of Annihilation) | 2 | `ring-of-the-winter` |  |
| ❓ | Adventures (Descent into Avernus) | 1 | `sword-of-zariel` |  |
| ❓ | Adventures (Dragon Heist) | 1 | `stone-of-golorr` |  |
| ❓ | Adventures (Rime of the Frostmaiden) | 1 | `psi-crystal` |  |
| ❓ | Adventures (Storm King's Thunder) | 1 | `wyrmskull-throne` |  |
| ❓ | Adventures (The Wild Beyond The Witchlight) | 1 | `iggwilv-s-cauldron` |  |
| ❓ | Adventures (Waterdeep: Dragon Heist) | 1 | `blackstaff` |  |

