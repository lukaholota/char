# Референс: якою має стати редакція 2024

**Джерело:** нотатка власника `char.holota.family/human only/2024 prep/готовність 2024.md`
(Obsidian, second_brain). Перенесена сюди 2026-08-27 як **цільова картина**, а не як опис
поточного стану.

**Статус документа:** це north star для [O18](README.md) і [O19](../o19-bastions/README.md).
Він лишається відкритим, поки не зроблено все, що тут описано — повний каталог бастіонів із
5etools і повний флоу створення персонажа 2024. Виміряна відстань між цим текстом і кодом —
у [README.md](README.md) цієї цілі.

**Правило читання:** тут описані правила **2024**. Основне правило проєкту з
[CLAUDE.md](../../CLAUDE.md) — «за замовчуванням 2014» — не скасовується: 2024 живе як окремий
вимір даних (`ruleset`), а не як заміна.

---


Так. Якщо звести весь 2024 ruleset до однієї думки для людини, яка добре знає 2014:

> **2024 — це не нова D&D, а дуже великий refactor 5e.** Більшість фундаменту та сама, але ownership багатьох механік переїхав між сутностями.

До речі, D&D Beyond із березня 2026 позначає старі правила як **5e**, а ревізію 2024 як **5.5e**. Це саме нове маркування, а не ще одна редакція поверх 2024.

---

# 1. Що найбільше змінилося у створенні персонажа

Найпростіша mental model така:

||2014|2024|
|---|---|---|
|Race / Species|ASI + расові traits|**без ASI**, тільки species traits|
|Background|skills/tools/languages + слабка narrative feature|**ASI + Origin Feat + skills + tool + equipment**|
|Feat на lvl 1|зазвичай ні|**завжди через Background**|
|Human|Variant Human був окремою опцією|звичайний Human отримує **ще один Origin Feat**|
|Subclass|lvl 1 / 2 / 3 залежно від класу|**всі класи на lvl 3**|
|Ability Score Increase|class feature, можна було замінити feat|фактично **Feat — Ability Score Improvement**|
|Feat system|просто feats|Origin / General / Fighting Style / Epic Boon|
|Weapon specialization|майже немає|**Weapon Mastery**|
|Languages|багато залежало від race/background|під час Origin: **Common + 2 Standard languages**|
|Species progression|переважно все на lvl 1|багато species traits відкриваються на **character lvl 3/5**|
|Base building|нічого стандартного|**Bastions від lvl 5**|

Офіційний 2024 flow буквально такий: **Choose a Class → Determine Origin → Determine Ability Scores → Choose Alignment → Fill in Details**. Origin включає Background, Species і languages.

І це важливо для твого UI: **background тепер треба обирати до остаточного розрахунку ability scores**, бо саме він визначає, куди дозволено поставити бонуси.

---

# 2. Background — тепер дуже жирна сутність

Оце, мабуть, найбільша зміна для твого Character Builder.

У 2014:

```
Race
└─ +2 Dex
└─ +1 Wis

Background
└─ 2 skills
└─ tools/languages
└─ умовна "я знаю людей у монастирі"
```

У 2024:

```
Species
└─ species traits

Background
├─ 3 дозволені Ability Scores
├─ розподіл +2/+1 АБО +1/+1/+1
├─ конкретний Origin Feat
├─ 2 Skill Proficiencies
├─ 1 Tool Proficiency
└─ starting equipment / 50 GP
```

Наприклад, **Soldier** дає вибір між STR, DEX і CON для ASI, `Savage Attacker`, Athletics, Intimidation, tool proficiency та equipment.

І є дуже важлива валідація:

```
background abilities: STR / DEX / CON

VALID:
STR +2, CON +1
DEX +2, STR +1
STR +1, DEX +1, CON +1

INVALID:
STR +2, WIS +1
```

Тобто в data model я б точно не робив:

```
abilityBonus: {
  strength: 2,
  constitution: 1
}
```

Бо це **choice**, а не фіксовані числа.

Швидше щось концептуально типу:

```
abilityScoreOptions: ['strength', 'dexterity', 'constitution']
abilityScoreDistribution: 'TWO_ONE_OR_THREE_ONES'
```

---

# 3. Species замість Race

Термін тепер **Species**.

Головна зміна:

### Species більше НЕ визначає Ability Scores

High Elf Wizard і High Elf Barbarian можуть абсолютно нормально отримати свої +2/+1 відповідно до background.

Офіційно ASI переїхали в Background.

Але species стали цікавішими в іншому аспекті: у них дохріна **nested choices та level-gated traits**.

Наприклад:

### Dragonborn

Ти вибираєш Draconic Ancestry:

- Black → Acid
- Blue → Lightning
- Brass → Fire
- Bronze → Lightning
- Copper → Acid
- Gold → Fire
- Green → Poison
- Red → Fire
- Silver → Cold
- White → Cold

Це впливає на Breath Weapon і Resistance.

А на **character level 5** він отримує `Draconic Flight`.

Отже твоя модель не може бути просто:

```
species.features = [...]
```

Потрібно підтримувати:

```
Species
└── Choice: Draconic Ancestry
    └── selected: Red
        ├── Resistance: Fire
        └── Breath Weapon: Fire

Level 5
└── Draconic Flight
```

### Elf

Ще цікавіше.

```
Elf
├── Keen Senses
│   └── choose Insight / Perception / Survival
│
└── Elven Lineage
    ├── Drow
    ├── High Elf
    └── Wood Elf
```

Lineage може давати spell на lvl 1, а потім додаткові spells на **character lvl 3 та 5**, плюс вибір spellcasting ability.

Тобто це чудовий stress-test твого builder'а.

---

# 4. Дуже важливо: CHARACTER LEVEL ≠ CLASS LEVEL

Для мультікласів це стане критичним.

Наприклад:

```
Wizard 2 / Fighter 3
```

має:

```
Character Level = 5
Wizard Level = 2
Fighter Level = 3
```

Тому:

```
Dragonborn Draconic Flight
→ characterLevel >= 5
→ YES

Wizard subclass
→ wizardLevel >= 3
→ NO

Fighter subclass
→ fighterLevel >= 3
→ YES
```

Я б прямо на рівні rule engine мав два різних predicates:

```
characterLevelAtLeast(5)
classLevelAtLeast('fighter', 3)
```

Не один універсальний `level >= 5`.

---

# 5. Subclass тепер завжди на lvl 3

Це ще одна охуєнна для builder'а стандартизація.

У 2014:

```
Cleric → subclass lvl 1
Sorcerer → lvl 1
Warlock → lvl 1

Druid → lvl 2
Wizard → lvl 2

Fighter → lvl 3
Rogue → lvl 3
...
```

У 2024:

> **ВСІ 12 classes отримують subclass на class level 3.**

Тому якщо твій wizard зараз на першому екрані питає School of Evocation — для 2024 це неправильно.

Для персонажа lvl 1:

```
Class: Wizard

Subclass:
[locked until Wizard 3]
```

---

# 6. Feats тепер треба моделювати нормально, а не як один список

2024 офіційно ділить їх на категорії:

```
Origin Feat
General Feat
Fighting Style Feat
Epic Boon Feat
```

## Origin

Переважно отримуєш із Background.

Наприклад:

```
Soldier → Savage Attacker
Criminal → Alert
Sage → Magic Initiate (Wizard)
Farmer → Tough
Entertainer → Musician
```

Human додатково отримує **Origin Feat на вибір**, тобто Human уже на lvl 1 має два feats:

```
Background feat
+
Human feat
```

І це хороший тест на те, чи немає в тебе тупого:

```
character.featId
```

замість:

```
character.feats[]
```

---

## General Feats

Зазвичай мають prerequisite:

```
Level 4+
```

і часто додатковий prerequisite.

Наприклад Grappler:

```
Level 4+
STR 13+ OR DEX 13+
```

і сам дає +1 STR або DEX плюс свої бойові ефекти.

Отже feat у БД бажано описувати не:

```
prerequisite: "Level 4, Strength or Dexterity 13+"
```

а rule expression'ом.

---

## Ability Score Improvement

У 2024 це буквально **General Feat**:

```
Ability Score Improvement
Prerequisite: Level 4+

+2 to one ability
OR
+1 to two abilities

Repeatable
```

Для builder'а це означає, що на lvl 4 краще концептуально робити:

```
Choose Feat
├── Ability Score Improvement
├── Grappler
├── War Caster
├── ...
```

а не:

```
ASI?
[yes/no]

If no:
Choose feat
```

Хоча UX можеш лишити старий — rule engine краще мати єдиний.

---

# 7. Fighting Style теж тепер Feat

`Archery`, `Defense`, `Great Weapon Fighting`, `Two-Weapon Fighting` тощо — це **Fighting Style Feats**.

Prerequisite:

```
Fighting Style feature
```

Тобто:

```
Fighter class feature
→ grants choice from Feat category Fighting Style
```

Це ще один аргумент робити generic `grantChoice()` систему.

---

# 8. Weapon Mastery — нова велика штука

Оце тобі як 2014 DM треба реально знати.

У 2024 зброя має **Mastery Property**:

```
Cleave
Graze
Nick
Push
Sap
Slow
Topple
Vex
```

Наприклад умовно:

```
Longsword → Sap
Greatsword → Graze
Shortsword → Vex
Scimitar → Nick
```

Але сам факт, що в зброї є mastery property, ще не означає, що персонаж може її використовувати.

Class дає:

```
Weapon Mastery
→ choose N weapons
→ mastery property цих weapons активна
```

Наприклад Fighter починає з трьох mastered weapons, а на Fighter 5 уже знає чотири; Barbarian, Paladin, Ranger, Rogue теж мають Weapon Mastery у своїх class tables.

І ще прикол:

> вибрані Masteries можна міняти після Long Rest.

Тому я б не трактував це як незмінне рішення character creation.

Краще:

```
weaponMasteries: {
  capacity: 4,
  current: [...]
}
```

---

# 9. А тепер — що за єбучі Bastions

Ось тут насправді все простіше, ніж звучить.

**Bastion — це офіційна персональна база персонажа.**

Не клас.

Не background.

Не stronghold subclass.

Не обов'язкова частина lvl-1 character creation.

Це окрема downtime / campaign-management система з **2024 Dungeon Master's Guide**, яка починається для персонажа на **5 рівні**.

Уяви:

```
BG3 Camp
+
твоя фортеця з Pillars of Eternity
+
downtime activities
+
маленька economic/base-building система
```

Персонаж може сказати:

> У мене є стара магічна башта на околиці Waterdeep.

І це його Bastion.

Або:

- замок;
- храм;
- таверна;
- підземне лігво;
- wizard tower;
- guild house;
- корабельний порт;
- комплекс печер.

Форма майже повністю fluff.

---

# 10. Що ти отримуєш на lvl 5

На п'ятому рівні Bastion стартує з:

**2 Basic Facilities:**

```
1 Cramped
1 Roomy
```

і:

**2 Special Facilities**, prerequisites яких твій персонаж задовольняє.

Basic Facility — це типу:

```
Bedroom
Kitchen
Dining Hall
Courtyard
Bathroom
Storage Room
```

Але mechanical benefits вони не дають.

Special Facility — оце вже механіка.

Наприклад:

```
Library
Garden
Armory
Barrack
Arcane Study
Sanctuary
Smithy
Workshop
```

---

# 11. Bastion progression

Кількість **Special Facilities** росте так:

|Character level|Special Facilities|
|---|---|
|5|2|
|9|4|
|13|5|
|17|6|

Під час level-up ти також можеш замінювати Special Facilities.

Тому Bastion теж повинен реагувати саме на **character level**, а не class level.

---

# 12. Весь каталог Special Facilities

Для твого майбутнього каталогу він чудово ділиться по `minimumLevel`.

### Level 5

```
Arcane Study
Armory
Barrack
Garden
Library
Sanctuary
Smithy
Storehouse
Workshop
```

### Level 9

```
Gaming Hall
Greenhouse
Laboratory
Sacristy
Scriptorium
Stable
Teleportation Circle
Theater
Training Area
Trophy Room
```

### Level 13

```
Archive
Meditation Chamber
Menagerie
Observatory
Pub
Reliquary
```

### Level 17

```
Demiplane
Guildhall
Sanctum
War Room
```

Разом **29 Special Facilities**.

І вони можуть мати prerequisites.

Наприклад:

```
Arcane Study
→ can use Arcane Focus OR a tool as Spellcasting Focus

Sanctuary
→ can use Holy Symbol or Druidic Focus as Spellcasting Focus

Guildhall
→ has Expertise in a skill

War Room
→ has Fighting Style OR Unarmored Defense
```

Оце для твого rule engine дуже цікаво.

Не роби:

```
allowedClasses: ['fighter', 'paladin']
```

Роби:

```
prerequisite:
  OR(
    hasFeature('Fighting Style'),
    hasFeature('Unarmored Defense')
  )
```

Бо Monk/Fighter multiclass, feat interactions і майбутні sourcebooks інакше тебе з'їдять.

---

# 13. Що Bastion робить протягом гри

Приблизно раз на **7 днів ігрового часу** відбувається **Bastion Turn**.

Ти кажеш своїм facilities, чим займатися.

Є основні Orders:

```
Craft
Empower
Harvest
Maintain
Recruit
Research
Trade
```

Наприклад:

```
Garden
→ Harvest

Library
→ Research

Smithy
→ Craft

Storehouse
→ Trade
```

Тобто:

```
Adventure
    ↓
проходить ~7 game days
    ↓
Bastion Turn
    ↓
[Garden] Harvest
[Library] Research
    ↓
отримуєш результати
```

Причому **персонаж не мусить фізично сидіти в Bastion**. Там є hirelings, які його обслуговують.

Є також Bastion Events — випадкові події типу проблем, нападів, відкриттів тощо.

Тому я б Bastions архітектурно взагалі не пхав у character creator.

Скоріше:

```
Character
├── Sheet
├── Inventory
├── Spells
├── Features
├── Actions
└── Bastion     ← unlock at Character Level 5
```

І Bastion уже має власний state:

```
Bastion
├── Basic Facilities
├── Special Facilities
├── Hirelings
├── Defenders
├── Current Orders
└── Bastion Turns
```

---

# 14. А тепер найкорисніше: яким має бути твій 2024 Character Creation Flow

Я б використовував ось такий reference flow.

### ① Rules

```
Ruleset
○ 2014 / 5e
● 2024 / 5.5e
```

Це дуже важливо.

**Не overwrite'ити** старий Fireball новим Fireball.

```
Spell
├── Fireball / 2014
└── Fireball / 2024
```

Те саме:

```
Class
Subclass
Species
Background
Feat
Spell
Equipment
Monster
```

Бо офіційно 2024 задумана backward-compatible з 2014 content, і D&D Beyond дозволяє користувачам із відповідним доступом міксувати content обох rulesets.

---

### ② Character Level / Classes

Наприклад:

```
Level: 5

Classes:
Fighter 3
Wizard 2
```

Звідси rule engine уже знає:

```
characterLevel = 5
fighterLevel = 3
wizardLevel = 2
```

---

### ③ Class choices

Залежно від рівня:

```
Proficiencies
Skills
Weapon Masteries
Fighting Styles
Spellcasting choices
Expertise
Eldritch Invocations
Subclass @ class level 3
etc.
```

---

### ④ Background

```
Background
↓
Ability Score eligible set
Origin Feat
Skills
Tool
Equipment
```

---

### ⑤ Species

```
Species
↓
species choices
↓
sub-lineage / ancestry
↓
casting ability choices
↓
level-gated species features
```

---

### ⑥ Languages

```
Common
+
Standard Language
+
Standard Language
```

плюс усе, що дають інші sources.

---

### ⑦ Base Ability Scores

Standard Array / Point Buy / Rolls / Manual.

Потім:

```
base scores
+
background bonuses
+
feat bonuses
=
final scores
```

---

### ⑧ Level progression

Оце я вважаю дуже важливим.

Не просто:

```
I'm level 8
generate everything
```

А логічно:

```
Level 1
→ choices

Level 2
→ choices

Level 3
→ subclass
→ choices

Level 4
→ feat

Level 5
→ class features
→ species features
```

Бо інакше interactions і prerequisites дуже легко проїбати.

---

# 15. Тепер 10 персонажів для fucking integration test

Я спеціально зробив їх **5 рівня**.

Чому 5?

Бо один персонаж одразу тестує:

- background ASI;
- Origin feat;
- subclass;
- lvl 4 feat;
- species lvl 3/5 progression;
- class lvl 5 feature;
- Weapon Mastery, де є;
- Bastion unlock.

Для ability scores беру standard array.

---

## 1. Red Dragonborn Fighter 5 — Soldier

**Subclass:** Champion  
**Background:** Soldier  
**Origin Feat:** Savage Attacker

Base:

```
STR 15
DEX 14
CON 13
INT 8
WIS 10
CHA 12
```

Soldier:

```
STR +2
CON +1
```

Level 4:

```
Ability Score Improvement
STR +2
```

Final:

```
STR 19
DEX 14
CON 14
INT 8
WIS 10
CHA 12
```

Builder має правильно отримати:

```
Red Draconic Ancestry
Fire Resistance
Fire Breath Weapon
Draconic Flight @ character lvl 5

Savage Attacker

Fighter subclass @ Fighter 3
Fighting Style
Weapon Mastery
4 mastered weapons @ Fighter 5
Extra Attack
```

**Навіщо цей тест:** species ancestry + mastery + lvl-5 species unlock.

---

## 2. Dwarf Cleric 5 — Farmer

**Subclass:** Life Domain  
**Background:** Farmer  
**Origin Feat:** Tough

Base:

```
STR 14
DEX 8
CON 13
INT 10
WIS 15
CHA 12
```

Background:

```
WIS +2
CON +1
```

Lvl 4 ASI:

```
WIS +2
```

Final:

```
STR 14
DEX 8
CON 14
INT 10
WIS 19
CHA 12
```

Особливо перевір:

```
Dwarven Toughness
+
Tough feat
+
Cleric HP
```

Обидва джерела повинні stack'атися у derived max HP.

Також:

```
Cleric subclass
Channel Divinity
Spellcasting
prepared spells
```

І на lvl 5 він уже може мати Bastion із **Sanctuary**, бо відповідає focus prerequisite.

**Навіщо:** stacking derived stats із різних source'ів.

---

## 3. High Elf Wizard 5 — Sage

**Subclass:** Evoker  
**Background:** Sage  
**Origin Feat:** Magic Initiate (Wizard)

Final abilities:

```
STR 8
DEX 12
CON 14
INT 19
WIS 14
CHA 10
```

Тут твій builder має пережити просто spellcasting gangbang:

```
Wizard spells
+
Magic Initiate spells
+
High Elf lineage spells
```

Причому High Elf повинен мати:

```
lineage choice
casting ability choice
lvl-3 lineage spell
lvl-5 lineage spell
```

і вони не повинні магічно змішатися зі spellbook'ом Wizard.

Bastion:

```
Arcane Study
```

**Навіщо:** кілька незалежних spell sources.

---

## 4. Rock Gnome Rogue 5 — Criminal

**Subclass:** Thief  
**Background:** Criminal  
**Origin Feat:** Alert

Final:

```
STR 12
DEX 19
CON 14
INT 14
WIS 10
CHA 8
```

Expected:

```
Rock Gnome magic
Alert
Expertise
Weapon Mastery ×2
Cunning Action
Thief
Cunning Strike @ Rogue 5
```

Ось це дуже хороший тест:

> персонаж **не є spellcaster class**, але все одно має magical abilities від species.

Твій UI не повинен думати:

```
if (!class.spellcasting) hideSpellsTab()
```

бо це більше не працює.

---

## 5. Stone Goliath Barbarian 5 — Guard

**Subclass:** Berserker  
**Background:** Guard  
**Origin Feat:** Alert

Final:

```
STR 19
DEX 13
CON 14
INT 10
WIS 13
CHA 8
```

Expected:

```
Giant Ancestry → Stone
Stone's Endurance
Large Form @ character lvl 5

Rage
Weapon Mastery
Berserker
ASI
Extra Attack
```

**Навіщо:** species choice → feature + species feature, що відкривається пізніше.

---

## 6. Halfling Bard 5 — Entertainer

**Subclass:** College of Lore  
**Background:** Entertainer  
**Origin Feat:** Musician

Final:

```
STR 8
DEX 15
CON 12
INT 13
WIS 10
CHA 19
```

Expected:

```
Halfling traits
Musician
Bardic Inspiration
Spellcasting
Expertise
College of Lore
lvl-4 feat/ASI
```

Це хороший тест на:

```
skill proficiency
+
expertise
+
background skills
+
subclass skills
```

Тобто система має розрізняти:

```
not proficient
proficient
expertise
```

а не просто boolean.

---

## 7. Human Paladin 5 — Noble

**Subclass:** Oath of Devotion  
**Background:** Noble  
**Background feat:** Skilled  
**Human feat:** Tough

Оце **дуже важливий тест**.

Final:

```
STR 18
DEX 10
CON 13
INT 8
WIS 12
CHA 16
```

Він отримує:

```
Noble → Skilled
Human → second Origin Feat → Tough
Human → additional Skill Proficiency

Paladin Weapon Mastery
Fighting Style Feat
Spellcasting
Subclass
Extra Attack
```

Отже на lvl 1 у тебе вже:

```
feat source #1: Background
feat source #2: Species
```

а Skilled ще породжує **три додаткові proficiency choices**.

Це чудовий тест на recursive choice system.

---

# 8. Orc Ranger 5 — Guide

**Subclass:** Hunter  
**Background:** Guide  
**Origin Feat:** Magic Initiate (Druid)

Final:

```
STR 12
DEX 18
CON 13
INT 8
WIS 16
CHA 10
```

Expected:

```
Orc traits
Adrenaline Rush

Magic Initiate (Druid)
→ cantrips
→ level-1 spell
→ casting ability

Ranger spells
Weapon Mastery
Fighting Style
Hunter
Extra Attack
```

Знову:

```
Magic Initiate spells !== Ranger spells
```

навіть якщо обидва використовують Wisdom.

**Навіщо:** overlapping spellcasting systems.

---

# 9. Chthonic Tiefling Warlock 5 — Charlatan

**Subclass:** Fiend Patron  
**Background:** Charlatan  
**Origin Feat:** Skilled

Final:

```
STR 8
DEX 14
CON 14
INT 12
WIS 10
CHA 19
```

Tiefling:

```
Fiendish Legacy → Chthonic
resistance
cantrip
spell @ character lvl 3
spell @ character lvl 5
```

Warlock:

```
Patron @ Warlock 3
Pact Magic
Eldritch Invocations
invocation prerequisites
```

На lvl 5 Warlock уже має кілька Invocation slots, тому тут можна навмисно вибрати invocation, яка має prerequisite від іншої choice, і перевірити dependency graph.

**Навіщо:** prerequisites між features.

---

# 10. Aasimar Monk 5 — Hermit

**Subclass:** Warrior of the Open Hand  
**Background:** Hermit  
**Origin Feat:** Healer

Base після background:

```
STR 12
DEX 15
CON 14
INT 10
WIS 16
CHA 8
```

На lvl 4 беремо **Grappler**:

```
Prerequisite:
Level 4+
DEX 13+

DEX +1
```

Final:

```
STR 12
DEX 16
CON 14
INT 10
WIS 16
CHA 8
```

Expected:

```
Healer

Aasimar Celestial Revelation @ character lvl 3
→ transformation choice when activated

Monk
→ Focus Points
→ Unarmored Defense
→ subclass
→ Grappler
→ Extra Attack
→ Stunning Strike
```

І принципово:

```
Weapon Mastery: NONE
```

Тобто builder не повинен показувати Weapon Mastery абсолютно всім martial characters.

Aasimar's Celestial Revelation справді відкривається на 3 рівні й має вибір прояву.

---

# 16. Якщо всі ці 10 персонажів створюються — що твоя система вже вміє

Оце я б реально використав як acceptance criteria для 2024 migration:

```
✓ ruleset versioning

✓ character level ≠ class level

✓ background ability-score restrictions

✓ +2/+1 vs +1/+1/+1 distributions

✓ feats from multiple sources

✓ feat categories

✓ feat prerequisites

✓ feats that themselves grant choices

✓ feats that modify ability scores

✓ species nested choices

✓ species features unlocked by character level

✓ class features unlocked by class level

✓ subclass universally at class level 3

✓ proficiency / expertise stacking

✓ multiple independent spell sources

✓ spellcasting ability per source

✓ always-prepared / granted spells

✓ Weapon Mastery capacity + selections

✓ Fighting Style as feat choice

✓ derived-stat modifiers from multiple sources

✓ equipment from background

✓ tools from background

✓ languages from Origin

✓ recalculation after changing upstream choice

✓ Bastion unlock at character lvl 5

✓ Bastion facility prerequisites based on capabilities
```

І найголовніше архітектурно я б сформулював так:

> **2024 Character Builder — це вже не форма з 7 екранів. Це dependency graph із sources, grants, choices, prerequisites і level-based effects.**

Тобто хороша модель виглядає не як:

```
Race page
Background page
Class page
Feat page
```

а як:

```
Source
    ↓
grants Feature
    ↓
Feature may grant Choice
    ↓
Choice selects Option
    ↓
Option may grant another Feature
    ↓
Feature may modify Character State
    ↓
Feature may become active at Character/Class Level N
    ↓
Feature may satisfy prerequisite elsewhere
```

І оце якраз дозволяє без спеціального `if (human)` / `if (highElf)` / `if (warlock)` лайна реалізувати і **2014, і 2024, і майбутні книги**.

Якщо дивитися конкретно на Bastions, я б їх узагалі робив **окремим модулем після character sheet**, а не етапом Character Creator: до 5 рівня там буквально нема що створювати, а після 5-го це вже persistent campaign state із facilities, orders, hirelings і Bastion Turns.