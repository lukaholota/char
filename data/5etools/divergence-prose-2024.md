# Розбіжності прози 2024 проти XPHB

Згенеровано `npx tsx scripts/5etools/compare-spell-prose.ts`.
Джерело — пінута ревізія `e5f3e77b303a92df10487207857200245e71957c`. Каталог — `data/2024/normalized/spells.json`.

Звіряються ознаки, що переживають переклад: числа з одиницями, кубики, стани, типи дій,
характеристика ряткидка, типи шкоди. Це **не** доводить, що переклад правильний — лише
що в тексті ті самі величини, що в оригіналі, і немає зайвих.

- У каталозі: **391**
- Звірено: **391**
- Розійшлося щонайменше в одній ознаці: **125**
- Розбіжних ознак усього: **251**
- Без відповідника в XPHB: **0**

## За ознаками

| Ознака | Розбіжностей |
|---|---:|
| `action` — тільки в XPHB | 55 |
| `measure` — тільки в XPHB | 50 |
| `measure` — тільки в нас | 44 |
| `condition` — тільки в XPHB | 36 |
| `damageType` — тільки в XPHB | 22 |
| `condition` — тільки в нас | 21 |
| `save` — тільки в нас | 9 |
| `save` — тільки в XPHB | 7 |
| `damageType` — тільки в нас | 4 |
| `action` — тільки в нас | 3 |

## Терміни XPHB, яких словник ще не називає

Їхні ознаки не звіряються з жодного боку — інакше вони давали б розбіжність, якої
перекладач не може закрити, не вигадавши термін.

| Термін | Чому |
|---|---|
| `attack` | дія Attack: словник має «Кидок атаки» (rules.attackRoll), але не саму дію — питання до власника, docs/o17-spells-canon/questions.md |

## Поіменно

| Заклинання | Ознака | Значення | Бік |
|---|---|---|---|
| `Druidcraft` | `measure` | 1 round | тільки в XPHB |
|  | `measure` | 24 hour | тільки в XPHB |
|  | `measure` | 5 foot | тільки в XPHB |
| `Light` | `measure` | 10 foot | тільки в нас |
|  | `save` | Dexterity | тільки в нас |
| `Mage Hand` | `action` | Magic | тільки в XPHB |
| `Minor Illusion` | `action` | Study | тільки в XPHB |
| `Prestidigitation` | `measure` | 1 hour | тільки в XPHB |
| `Shocking Grasp` | `action` | Opportunity Attack | тільки в XPHB |
|  | `action` | Reaction | тільки в нас |
| `Thaumaturgy` | `measure` | 1 minute | тільки в XPHB |
| `Alarm` | `measure` | 20 foot | тільки в XPHB |
| `Charm Person` | `measure` | 30 foot | тільки в нас |
| `Chromatic Orb` | `measure` | 30 foot | тільки в XPHB |
|  | `measure` | 4 inch | тільки в нас |
| `Disguise Self` | `action` | Study | тільки в XPHB |
|  | `condition` | Restrained | тільки в нас |
|  | `save` | Intelligence | тільки в нас |
| `Dissonant Whispers` | `condition` | Deafened | тільки в нас |
| `Ensnaring Strike` | `condition` | Restrained | тільки в XPHB |
| `Entangle` | `condition` | Restrained | тільки в XPHB |
| `Expeditious Retreat` | `measure` | 10 minute | тільки в нас |
| `Faerie Fire` | `measure` | 1 minute | тільки в нас |
|  | `measure` | 60 foot | тільки в нас |
| `Find Familiar` | `action` | Bonus Action | тільки в XPHB |
|  | `action` | Magic | тільки в XPHB |
|  | `condition` | Blinded | тільки в нас |
|  | `condition` | Deafened | тільки в нас |
| `Fog Cloud` | `measure` | 10 mile | тільки в нас |
| `Grease` | `condition` | Prone | тільки в XPHB |
| `Hunter's Mark` | `damageType` | Force | тільки в XPHB |
| `Ray of Sickness` | `save` | Constitution | тільки в нас |
| `Shield` | `condition` | Invisible | тільки в нас |
| `Silent Image` | `action` | Magic | тільки в XPHB |
|  | `action` | Study | тільки в XPHB |
| `Speak with Animals` | `action` | Influence | тільки в XPHB |
| `Tasha's Hideous Laughter` | `condition` | Prone | тільки в XPHB |
| `Alter Self` | `action` | Magic | тільки в XPHB |
| `Animal Messenger` | `measure` | 24 hour | тільки в XPHB |
|  | `save` | Charisma | тільки в XPHB |
| `Arcane Lock` | `measure` | 10 minute | тільки в нас |
| `Beast Sense` | `condition` | Blinded | тільки в нас |
|  | `condition` | Deafened | тільки в нас |
| `Cloud of Daggers` | `action` | Magic | тільки в XPHB |
|  | `damageType` | Slashing | тільки в XPHB |
|  | `measure` | 30 foot | тільки в XPHB |
| `Continual Flame` | `measure` | 20 foot | тільки в XPHB |
| `Crown of Madness` | `action` | Magic | тільки в XPHB |
| `Darkvision` | `measure` | 150 foot | тільки в XPHB |
|  | `measure` | 60 foot | тільки в нас |
| `Detect Thoughts` | `action` | Magic | тільки в XPHB |
|  | `measure` | 1 foot | тільки в XPHB |
|  | `measure` | 1 inch | тільки в XPHB |
|  | `measure` | 2 foot | тільки в нас |
|  | `measure` | 2 inch | тільки в нас |
| `Hold Person` | `measure` | 30 foot | тільки в нас |
| `Levitate` | `action` | Magic | тільки в XPHB |
| `Locate Object` | `measure` | 000 foot | тільки в XPHB |
|  | `measure` | 1000 foot | тільки в нас |
| `Moonbeam` | `action` | Magic | тільки в XPHB |
| `Rope Trick` | `measure` | 3 foot | тільки в XPHB |
|  | `measure` | 60 foot | тільки в нас |
| `Spike Growth` | `action` | Search | тільки в XPHB |
|  | `condition` | Restrained | тільки в нас |
| `Suggestion` | `condition` | Charmed | тільки в XPHB |
| `Summon Beast` | `action` | Dodge | тільки в XPHB |
| `Web` | `condition` | Restrained | тільки в XPHB |
| `Animate Dead` | `action` | Dodge | тільки в XPHB |
| `Call Lightning` | `action` | Magic | тільки в XPHB |
|  | `measure` | 100 foot | тільки в нас |
| `Clairvoyance` | `action` | Bonus Action | тільки в XPHB |
| `Counterspell` | `action` | Bonus Action | тільки в XPHB |
|  | `action` | Reaction | тільки в XPHB |
|  | `save` | Constitution | тільки в XPHB |
| `Elemental Weapon` | `damageType` | Acid | тільки в XPHB |
|  | `damageType` | Cold | тільки в XPHB |
|  | `damageType` | Fire | тільки в XPHB |
|  | `damageType` | Lightning | тільки в XPHB |
|  | `damageType` | Thunder | тільки в XPHB |
| `Feign Death` | `damageType` | Psychic | тільки в XPHB |
| `Gaseous Form` | `action` | Magic | тільки в XPHB |
|  | `condition` | Incapacitated | тільки в нас |
|  | `condition` | Prone | тільки в XPHB |
|  | `damageType` | Bludgeoning | тільки в XPHB |
|  | `damageType` | Piercing | тільки в XPHB |
|  | `damageType` | Slashing | тільки в XPHB |
|  | `save` | Constitution | тільки в XPHB |
|  | `save` | Strength | тільки в нас |
| `Haste` | `action` | Utilize | тільки в XPHB |
|  | `condition` | Incapacitated | тільки в XPHB |
| `Magic Circle` | `condition` | Charmed | тільки в XPHB |
|  | `condition` | Frightened | тільки в XPHB |
|  | `save` | Charisma | тільки в XPHB |
| `Major Image` | `action` | Magic | тільки в XPHB |
|  | `action` | Study | тільки в XPHB |
|  | `damageType` | Thunder | тільки в нас |
| `Meld Into Stone` | `condition` | Prone | тільки в XPHB |
|  | `damageType` | Bludgeoning | тільки в нас |
|  | `damageType` | Force | тільки в XPHB |
|  | `measure` | 5 foot | тільки в XPHB |
| `Phantom Steed` | `measure` | 10 mile | тільки в нас |
| `Plant Growth` | `measure` | 1 foot | тільки в XPHB |
|  | `measure` | 1 year | тільки в нас |
|  | `measure` | 365 day | тільки в XPHB |
|  | `measure` | 8 hour | тільки в нас |
| `Sleet Storm` | `condition` | Prone | тільки в XPHB |
|  | `save` | Constitution | тільки в нас |
| `Stinking Cloud` | `action` | Bonus Action | тільки в XPHB |
|  | `condition` | Poisoned | тільки в XPHB |
|  | `measure` | 1 round | тільки в нас |
|  | `measure` | 10 mile | тільки в нас |
|  | `measure` | 20 mile | тільки в нас |
|  | `measure` | 4 round | тільки в нас |
| `Summon Fey` | `action` | Dodge | тільки в XPHB |
| `Vampiric Touch` | `action` | Magic | тільки в XPHB |
| `Water Walk` | `action` | Bonus Action | тільки в XPHB |
|  | `measure` | 60 foot | тільки в нас |
| `Arcane Eye` | `action` | Bonus Action | тільки в XPHB |
| `Charm Monster` | `measure` | 30 foot | тільки в нас |
| `Control Water` | `action` | Magic | тільки в XPHB |
| `Evard's Black Tentacles` | `condition` | Restrained | тільки в XPHB |
|  | `save` | Dexterity | тільки в нас |
|  | `save` | Strength | тільки в XPHB |
| `Fabricate` | `measure` | 10 minute | тільки в нас |
|  | `measure` | 120 foot | тільки в нас |
| `Freedom of Movement` | `condition` | Grappled | тільки в XPHB |
|  | `condition` | Paralyzed | тільки в XPHB |
|  | `condition` | Restrained | тільки в XPHB |
| `Hallucinatory Terrain` | `action` | Study | тільки в XPHB |
| `Leomund's Secret Chest` | `measure` | 3 foot | тільки в XPHB |
| `Locate Creature` | `measure` | 000 foot | тільки в XPHB |
|  | `measure` | 10 foot | тільки в нас |
|  | `measure` | 1000 foot | тільки в нас |
| `Mordenkainen's Faithful Hound` | `action` | Magic | тільки в XPHB |
|  | `condition` | Invisible | тільки в нас |
|  | `damageType` | Force | тільки в XPHB |
|  | `damageType` | Piercing | тільки в нас |
|  | `measure` | 100 foot | тільки в нас |
|  | `measure` | 300 foot | тільки в XPHB |
|  | `save` | Dexterity | тільки в XPHB |
| `Mordenkainen's Private Sanctum` | `measure` | 200 foot | тільки в нас |
|  | `measure` | 365 day | тільки в XPHB |
|  | `measure` | 5 foot | тільки в XPHB |
| `Phantasmal Killer` | `condition` | Frightened | тільки в нас |
| `Polymorph` | `condition` | Unconscious | тільки в нас |
| `Summon Aberration` | `action` | Dodge | тільки в XPHB |
| `Summon Construct` | `action` | Dodge | тільки в XPHB |
| `Summon Elemental` | `action` | Dodge | тільки в XPHB |
| `Conjure Volley` | `damageType` | Force | тільки в XPHB |
| `Creation` | `measure` | 1 hour | тільки в XPHB |
|  | `measure` | 1 minute | тільки в XPHB |
|  | `measure` | 10 minute | тільки в XPHB |
|  | `measure` | 12 hour | тільки в XPHB |
|  | `measure` | 24 hour | тільки в XPHB |
| `Dispel Evil and Good` | `action` | Magic | тільки в XPHB |
|  | `measure` | 5 foot | тільки в XPHB |
| `Geas` | `measure` | 1 year | тільки в нас |
|  | `measure` | 365 day | тільки в XPHB |
| `Greater Restoration` | `condition` | Charmed | тільки в XPHB |
|  | `condition` | Petrified | тільки в XPHB |
| `Hold Monster` | `measure` | 30 foot | тільки в нас |
| `Mislead` | `action` | Bonus Action | тільки в нас |
|  | `action` | Magic | тільки в XPHB |
|  | `condition` | Blinded | тільки в нас |
|  | `condition` | Deafened | тільки в нас |
| `Modify Memory` | `measure` | 1 year | тільки в нас |
|  | `measure` | 365 day | тільки в XPHB |
| `Planar Binding` | `measure` | 366 day | тільки в XPHB |
| `Seeming` | `action` | Study | тільки в XPHB |
|  | `condition` | Restrained | тільки в нас |
| `Summon Celestial` | `action` | Dodge | тільки в XPHB |
| `Telekinesis` | `action` | Magic | тільки в XPHB |
|  | `condition` | Restrained | тільки в XPHB |
|  | `measure` | 1000 pound | тільки в нас |
|  | `save` | Strength | тільки в XPHB |
| `Teleportation Circle` | `measure` | 10 foot | тільки в нас |
|  | `measure` | 365 day | тільки в XPHB |
| `Wall of Stone` | `damageType` | Poison | тільки в XPHB |
|  | `damageType` | Psychic | тільки в XPHB |
| `Arcane Gate` | `action` | Bonus Action | тільки в XPHB |
|  | `measure` | 500 foot | тільки в нас |
| `Blade Barrier` | `damageType` | Force | тільки в XPHB |
|  | `damageType` | Slashing | тільки в нас |
| `Create Undead` | `action` | Dodge | тільки в XPHB |
| `Drawmij's Instant Summons` | `action` | Magic | тільки в XPHB |
| `Eyebite` | `action` | Magic | тільки в XPHB |
|  | `condition` | Poisoned | тільки в XPHB |
|  | `measure` | 1 minute | тільки в нас |
| `Flesh to Stone` | `condition` | Petrified | тільки в XPHB |
|  | `condition` | Restrained | тільки в XPHB |
| `Harm` | `measure` | 1 hour | тільки в нас |
| `Magic Jar` | `action` | Magic | тільки в XPHB |
|  | `condition` | Incapacitated | тільки в XPHB |
| `Mass Suggestion` | `condition` | Charmed | тільки в XPHB |
|  | `measure` | 366 day | тільки в XPHB |
| `Otiluke's Freezing Sphere` | `condition` | Restrained | тільки в XPHB |
| `Programmed Illusion` | `action` | Study | тільки в XPHB |
| `Summon Fiend` | `action` | Dodge | тільки в XPHB |
| `Sunbeam` | `action` | Magic | тільки в XPHB |
| `Wall of Ice` | `damageType` | Poison | тільки в XPHB |
|  | `damageType` | Psychic | тільки в XPHB |
| `Wall of Thorns` | `measure` | 1 foot | тільки в XPHB |
| `Wind Walk` | `action` | Magic | тільки в XPHB |
|  | `condition` | Incapacitated | тільки в нас |
|  | `condition` | Prone | тільки в XPHB |
|  | `condition` | Stunned | тільки в XPHB |
|  | `damageType` | Bludgeoning | тільки в XPHB |
|  | `damageType` | Piercing | тільки в XPHB |
|  | `damageType` | Slashing | тільки в XPHB |
| `Divine Word` | `condition` | Blinded | тільки в XPHB |
|  | `condition` | Deafened | тільки в XPHB |
|  | `condition` | Stunned | тільки в XPHB |
|  | `measure` | 1 hour | тільки в XPHB |
|  | `measure` | 1 minute | тільки в XPHB |
|  | `measure` | 10 minute | тільки в XPHB |
| `Mirage Arcane` | `measure` | 1 mile | тільки в XPHB |
| `Mordenkainen's Magnificent Mansion` | `condition` | Invisible | тільки в нас |
| `Plane Shift` | `save` | Charisma | тільки в нас |
| `Project Image` | `action` | Bonus Action | тільки в нас |
|  | `action` | Magic | тільки в XPHB |
|  | `action` | Study | тільки в XPHB |
|  | `condition` | Blinded | тільки в нас |
|  | `condition` | Deafened | тільки в нас |
|  | `measure` | 60 foot | тільки в XPHB |
| `Resurrection` | `measure` | 365 day | тільки в XPHB |
| `Sequester` | `condition` | Unconscious | тільки в XPHB |
|  | `measure` | 000 year | тільки в XPHB |
|  | `measure` | 1000 year | тільки в нас |
| `Simulacrum` | `measure` | 10 foot | тільки в XPHB |
|  | `measure` | 5 foot | тільки в XPHB |
| `Symbol` | `save` | Charisma | тільки в нас |
|  | `save` | Intelligence | тільки в нас |
| `Antipathy/Sympathy` | `condition` | Charmed | тільки в XPHB |
|  | `measure` | 120 foot | тільки в XPHB |
|  | `measure` | 200 foot | тільки в нас |
|  | `measure` | 24 hour | тільки в нас |
|  | `measure` | 5 foot | тільки в XPHB |
|  | `measure` | 60 foot | тільки в нас |
| `Demiplane` | `condition` | Prone | тільки в XPHB |
| `Incendiary Cloud` | `measure` | 10 mile | тільки в нас |
| `Maze` | `action` | Study | тільки в XPHB |
| `Imprisonment` | `condition` | Restrained | тільки в XPHB |
|  | `condition` | Unconscious | тільки в XPHB |
|  | `measure` | 24 hour | тільки в XPHB |
| `Shapechange` | `action` | Magic | тільки в XPHB |
|  | `condition` | Unconscious | тільки в нас |
| `Time Stop` | `measure` | 000 foot | тільки в XPHB |
|  | `measure` | 1000 foot | тільки в нас |
| `True Polymorph` | `condition` | Unconscious | тільки в нас |
| `Wish` | `measure` | 300 foot | тільки в XPHB |
|  | `measure` | 8 hour | тільки в XPHB |

**Без відповідника в XPHB:** жодного.
