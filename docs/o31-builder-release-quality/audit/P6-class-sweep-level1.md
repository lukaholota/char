# P6-class-sweep-level1 — прохід 13 класів 2024 по конструктору, рівень 1

**Лінза:** ПЕРСОНА-сканер у браузері (http://127.0.0.1:3100), фіксовано вид **Людина (HUMAN_2024)**,
походження **Фермер**, риса походження **Пильний**. Для кожного з 13 класів пройдено `/2024/char`
до кінця; знято список кроків `[data-step-id]`, текст кожного кроку і скріншот.

**Оракул:** `data/2024/srd/classes.md` (Core * Traits + Features tables), `data/2024/srd/character-origins.md`.
**База:** `spells_test` (читання через `node + pg`).
**Артефакти:** скрипти — `scratchpad/audit/work/P6-class-sweep-level1/`, скріншоти —
`scratchpad/audit/shots/P6-*.png`, сирі записи кроків — `work/P6-class-sweep-level1/drive-*.json`.

---

## Зведена таблиця кроків (усі 13 класів)

| Клас | Кроки конструктора |
|---|---|
| BARBARIAN | race > raceChoices > class > **weaponMastery** > background > asi > skills > languages > equipment > name |
| BARD | race > raceChoices > class > background > asi > skills > languages > equipment > name |
| CLERIC | race > raceChoices > class > background > asi > skills > languages > equipment > name |
| DRUID | race > raceChoices > class > background > asi > skills > languages > equipment > name |
| FIGHTER | race > raceChoices > class > **classChoices** > **weaponMastery** > background > asi > skills > languages > equipment > name |
| MONK | race > raceChoices > class > background > asi > skills > languages > equipment > name |
| PALADIN | race > raceChoices > class > **weaponMastery** > background > asi > skills > languages > equipment > name |
| RANGER | race > raceChoices > class > **weaponMastery** > background > asi > skills > languages > equipment > name |
| ROGUE | race > raceChoices > class > **weaponMastery** > background > asi > skills > languages > equipment > name |
| SORCERER | race > raceChoices > class > background > asi > skills > languages > equipment > name |
| WARLOCK | race > raceChoices > class > **classChoices** > background > asi > skills > languages > equipment > name |
| WIZARD | race > raceChoices > class > background > asi > skills > languages > equipment > name |
| ARTIFICER | race > raceChoices > class > background > asi > skills > languages > equipment > name |

Кроків `classChoices` для Клірика (Божественний орден) і Друїда (Первісний орден) немає.
Кроку `expertise` немає в жодного класу. Кроку вибору **замовлянь/заклинань** немає взагалі.
Кроку вибору **інструментів** немає взагалі.

---

## Знахідки

### P6-class-sweep-level1-01 — персонаж, створений у конструкторі 2024, зберігається як `RULES_2014` і зникає зі списку 2024 (P0)

**Доказ.** Створено клірика через `/2024/char` (скрипт `work/P6-class-sweep-level1/drive2.mjs`), запит до бази:

```
### {"pers_id":141,"name":"Евелін Сивохіп","level":1,"cls":"CLERIC_2024","ruleset":"RULES_2014"}
```

Наслідок перевірено в браузері (`work/P6-class-sweep-level1/home-check.mjs`):

```
2024 home -> http://127.0.0.1:3100/2024/char      ← редирект, персонажа не видно
2014 home -> http://127.0.0.1:3100/char/home | has char: 1   ← персонаж 2024 у списку 2014
```

`src/app/2024/char/home/page.tsx:11` фільтрує `getUserPersHomeData({ ruleset: "RULES_2024" })`, а
`:13–15` при порожньому списку робить `redirect("/2024/char")` — гравець після створення
персонажа знову опиняється в конструкторі.

`pers.ruleset` читають 33 місця, зокрема `src/server/db/levelup-persistence.ts:89`
(`getRulesStrategy(pers.ruleset ?? "RULES_2014")`), `spell-sources.ts:44`,
`generateCharacterPdf.ts:224`, `FeaturesSlide.tsx:160`. Тобто персонаж 2024 підвищує рівень і
рахує заклинання за стратегією 2014.

**Очікується:** `pers.ruleset = RULES_2024`; персонаж у `/2024/char/home`.
**Є:** `RULES_2014`, персонаж у списку 2014.
**Де копати:** `src/server/db/character-creation.ts:180` і `:427` —
`const ruleset = (validData.ruleset ?? characterClass.ruleset ?? "RULES_2014")`. Форма не пише
`ruleset` у `formData` взагалі (`MultiStepForm.tsx:90` рахує `currentRuleset` лише для рендера,
у `createCharacter(currentData)` на рядку 153 воно не потрапляє), а
`src/lib/zod/schemas/persCreateSchema.ts:294`
(`z.enum([...]).default("RULES_2014").optional()`) або `characterClass.ruleset` дає 2014.
Скріншоти: `shots/P6-2024home-redirect.png`, `shots/P6-2014home-has-2024char.png`.

---

### P6-class-sweep-level1-02 — жоден клас 2024 не дає володінь навичками (P1)

**Правило.** `data/2024/srd/classes.md:23` (Barbarian): «Skill Proficiencies — Choose 2: Animal
Handling, Athletics, Intimidation, Nature, Perception, or Survival». Аналогічно всі 12 класів
(Бард — будь-які 3, Пройдисвіт — 4, Слідопит — 3).

**Доказ (база).**

```
RULES_2014 BARBARIAN_2014 | skills: {"options":[...6...],"choiceCount":2}
RULES_2024 BARBARIAN_2024 | skills: null
… усі 13 класів RULES_2024: skill_proficiencies = null
```

**Доказ (браузер).** Крок «Навички» ідентичний для всіх 12 класів і містить лише фіксовані навички
походження:

```
НАВИЧКИ / Правила Таші / Фіксовані навички / Поводження з тваринами / Природа /
«Ці навички вже отримані з інших джерел і не змінюються на цьому кроці»
```

Кнопка «Далі» на цьому кроці **вже активна до будь-якого вибору** (`skills next:enabled->enabled`
у всіх 13 прогонах) — крок нічого не вимагає. У базі створеного клірика 141:
`skills: NATURE, ANIMAL_HANDLING` (тільки з походження).

**Де копати:** `src/lib/components/characterCreator/SkillsForm.tsx:303`
`const classCount = getSkillProficienciesCount(selectedClass.skillProficiencies)` → 0.
Джерело — стовпець `class.skill_proficiencies` для `ruleset='RULES_2024'`.
Скріншот: `shots/P6-BARBARIAN_2024-06-skills.png`.

---

### P6-class-sweep-level1-03 — жоден клас 2024 не дає володінь інструментами (P1)

**Правило.** `classes.md`: Друїд — «Tool Proficiencies: Herbalism Kit»; Пройдисвіт — «Thieves'
Tools»; Бард — «Choose 3 Musical Instruments»; Монах — «Choose one type of Artisan's Tools or
Musical Instrument».

**Доказ (база).** Усі 13 класів `RULES_2024`: `tool_proficiencies = '{}'`,
`tool_to_choose_count = null`. Для порівняння `DRUID_2014 → {HERBALISM_KIT}`,
`ROGUE_2014 → {THIEVES_TOOLS}`, `BARD_2014 → toolChoose: 3`, `MONK_2014 → toolChoose: 1`.

**Доказ (браузер).** У жодному з 13 прогонів немає кроку вибору інструментів.
Побічний наслідок видно в спорядженні Монаха: варіант A містить рядок-заглушку
«Інструменти ремісника або Музичний інструмент» замість конкретного предмета
(`creator-content-2024.json`, MONK optionId 157, `item: "Інструменти ремісника або Музичний інструмент"`).

---

### P6-class-sweep-level1-04 — усі 187 класових фіч 2024 не мають жодної механіки: ні застосувань, ні експертизи, ні кількості інвокацій (P1)

**Доказ (база).**

```
2024 class_feature rows total: 187
2024 class_feature rows with mechanic_metadata: 0     (усі mechanic_type = PASSIVE)
```

і в самій таблиці `feature`:

```
RULES_2024 | Barbarian: Rage (2024)        | uses: null | per: null | special: null | pool: null
RULES_2024 | Fighter: Second Wind (2024)   | uses: null | per: null | special: null | pool: null
RULES_2024 | Bard: Bardic Inspiration (2024)| uses: null | per: null | special: null | pool: null
RULES_2024 | Paladin: Lay On Hands (2024)  | uses: null | per: null | special: null | pool: null
RULES_2024 | Sorcerer: Innate Sorcery (2024)| uses: null | per: null | special: null | pool: null
RULES_2024 | Wizard: Arcane Recovery (2024)| uses: null | per: null | special: null | pool: null
RULES_2024 | Cleric: Channel Divinity (2024)| uses: null | per: null | special: null | pool: null
```

проти 2014, де ті самі фічі несуть формули:

```
RULES_2014 | Bardic Inspiration | per: LONG_REST | special: {base:0,stat:'CHA',type:'FORMULA',group:'STAT_BASED',minimum:1,operation:'ADD'} | pool: BARDIC_INSPIRATION
RULES_2014 | Lay on Hands       | per: LONG_REST | special: {type:'FORMULA',group:'LEVEL_BASED',operation:'MULTIPLY',multiplier:5}
RULES_2014 | Channel Divinity   | uses: 1 | per: SHORT_REST | pool: CHANNEL_DIVINITY
```

**Правило (оракул).** `classes.md`, таблиці Features: Barbarian L1 Rages **2**; Fighter Second Wind
**2** застосування; Bard «Bardic Inspiration die … number of times equal to your Charisma modifier
(minimum once)»; Paladin Lay on Hands — пул **5 × рівень**; Sorcerer Innate Sorcery **2**/довгий
відпочинок; Wizard Arcane Recovery **1**/день.

**Наслідок.** У створеного персонажа 141 `pers_resource_pool` порожній. Жоден лічильник рівня 1
(Лють 2, Друге дихання 2, Натхнення барда = мод. ХАР, Накладання рук 5, Вроджене чаклунство 2,
Відновлення магії 1) на листі не існує.

---

### P6-class-sweep-level1-05 — Божественний орден (Клірик) і Первісний орден (Друїд) не пропонують вибору (P1)

**Правило.** `classes.md`, Cleric L1: «Divine Order — you have dedicated yourself to one of the
following sacred roles of your choice: **Protector** (Martial weapons + Heavy armor training) /
**Thaumaturge** (one extra Cleric cantrip + бонус до перевірок ІНТ (Магія/Релігія) = мод. МУД,
мінімум +1)». Druid L1 — «Primal Order: **Magician** / **Warden**».

**Доказ.** У `creator-content-2024.json` обидві фічі — звичайний пасивний текст:
`Cleric: Divine Order (2024)` має `classChoiceOptions: []`, `classOptionalFeatures: []`,
`mechanicType: "PASSIVE"`, `mechanicMetadata: null`. Пошук по `src/` за
`Divine Order|DIVINE_ORDER|Primal Order|Божественний орден` дає збіги **лише** у згенерованих
даних (`src/lib/generated/classes.json`, `creator-content-2024.json`) — жодного рядка коду.
У прогоні браузера кроку `classChoices` у Клірика й Друїда немає взагалі.

**Наслідок.** Клірик-Захисник не отримує бойової зброї й важких обладунків; Клірик-Дивотворець —
третього… четвертого замовляння й бонусу; Друїд-Магік не отримує додаткового замовляння,
Друїд-Вартовий — бойової зброї й середніх обладунків.
Скріншоти: `shots/P6-CLERIC_2024-02-class.png`, `shots/P6-DRUID_2024-02-class.png`.

---

### P6-class-sweep-level1-06 — Пройдисвіт не отримує Експертизи на 1-му рівні (P1)

**Правило.** `classes.md:6913` Rogue L1: «Expertise, Sneak Attack, Thieves' Cant, Weapon Mastery».
Expertise на 1-му рівні — **дві** навички.

**Доказ.** `feature.skill_expertises` для `Rogue: Expertise (2024)` — `null` (для
`RULES_2014 | Expertise` — `{"count":2,"chooseFromCurrentProficiencies":true}`).
`MultiStepForm.tsx:521` `hasExpertiseChoice` читає саме `f.skillExpertises`, тож крок `expertise`
не додається: у прогоні ROGUE_2024 кроки — `race > raceChoices > class > weaponMastery >
background > asi > skills > languages > equipment > name`.

Те саме стосується `Bard: Expertise (2024)` і `Ranger: Expertise (2024)` (обидва `null`) —
на вищих рівнях буде та сама діра.

---

### P6-class-sweep-level1-07 — жоден заклинач 2024 не обирає замовлянь і заклинань під час створення (P1)

**Правило (оракул).** Bard L1 — 2 замовляння, 4 підготовлені; Cleric — 3 і 4; Druid — 2 і 4;
Sorcerer — 4 і 2; Wizard — 3 і 4 (+книга з 6 заклинань 1-го рівня); Warlock — 2 і 2 (1 чарунка);
Paladin — 2 підготовлені; Ranger — 2 підготовлені.

**Доказ.** `src/lib/components/characterCreator/creation-step-resolver.ts:33–43` — повний список
кроків не містить кроку заклинань. У всіх 8 прогонах заклиначів кроку `spells`/`cantrips` немає.
У створеного клірика 141 `persSpell: 0`.

**Примітка.** Для 2014 це, схоже, свідома конструкція (заклинання додаються на листі). Але
2024 — редакція «підготовлених заклинань» з фіксованим числом; питання власнику нижче.

---

### P6-class-sweep-level1-08 — Слідопит не отримує Hunter's Mark як завжди підготовлене (P1)

**Правило.** `classes.md`, Ranger L1 Favored Enemy: «You always have the *Hunter's Mark* spell
prepared» + «you can cast it twice without expending a spell slot, and you regain all expended
uses when you finish a Long Rest».

**Доказ.** У базі `_FeatureToSpell` для `ruleset='RULES_2024'` містить **лише** видові фічі:

```
Elven Lineage: Drow/High Elf/Wood Elf, Fiendish Legacy: Abyssal/Chthonic/Infernal,
Gnome: Forest/Rock, Tiefling: Otherworldly Presence
```

`Ranger: Favored Enemy (2024)` не дає жодного заклинання. Крім того
`src/server/db/character-creation.ts:350–369` `saveGrantedSpells` бере джерела тільки з
`content.raceTraitFeatures` і `content.raceChoiceOptions` — класові фічі туди не потрапляють
навіть якби звʼязок був. Безкоштовних застосувань (2/довгий відпочинок) немає — див. знахідку 04.

---

### P6-class-sweep-level1-09 — риса Людини «Skillful» не дає навички (P1)

**Правило.** `data/2024/srd/character-origins.md:305`: «_Skillful._ You gain proficiency in one
skill of your choice.»

**Доказ.** `creator-content-2024.json`, HUMAN_2024:
`Human: Skillful (2024) | skillProfs: null`. Крок «Навички» у всіх 13 прогонах не пропонує вибору
(див. знахідку 02) — тобто ця навичка теж губиться. У створеного клірика 141 у `pers_skill` лише
дві навички походження.

---

### P6-class-sweep-level1-10 — картки Потойбічних викликів підписані описом ефекту, а не назвою виклику (P2)

**Доказ.** Крок `classChoices` Чорнокнижника (скріншот `shots/P6-WARLOCK_2024-03-classChoices.png`)
показує:

```
+модифікатор ХАР до шкоди атаки заклинанням
+модифікатор ХАР до шкоди атаки заклинанням
Накладання Mage Armor на себе без витрати чарунок
…
Speak with Animals необмежено без чарунок
```

У даних:

```
{"name":"+модифікатор ХАР до шкоди атаки заклинанням","eng":"Agonizing Blast (2024)",
 "group":"Потойбічні виклики","feat":["Мучливий вибух"]}
```

Тобто `choice_option.option_name` містить механічний рядок, а українська назва («Мучливий вибух»)
лежить у звʼязаній фічі й у UI не показується. Плюс назви заклинань усередині — англійською
(`Mage Armor`, `Levitate`, `Speak with Animals`, `Eldritch Blast`), без маркера `{{English}}`
([Р20](../../../../docs/DECISIONS.md)). Гравець не може знайти виклик за назвою з книги, і кожна
картка виглядає задубльованою (назва == опис).

**Правильно при цьому:** кількість — «Обрано: 1/1», що відповідає Warlock L1 (1 виклик), і
`levelsGranted` [1,2,5,7,9,12,15,18].

---

### P6-class-sweep-level1-11 — у конструкторі 2024 показано перемикач «Правила Таші» (P3)

**Доказ.** Крок «Навички» в усіх 13 прогонах починається з рядка «Правила Таші»
(`shots/P6-CLERIC_2024-05-skills.png`). Таша (Tasha's Cauldron of Everything, «Custom Origin») —
опційне правило **2014**; у 2024 його зміст вбудований у правила походження, і окремого
перемикача бути не повинно.

---

## Перевірено й правильно

- **Майстерність зброї.** Крок `weaponMastery` зʼявляється рівно в 5 класів (Варвар, Воїн,
  Паладин, Слідопит, Пройдисвіт) — саме тих, чия `weapon_mastery_progression[0] > 0. Кількість
  збігається з книгою: Воїн «Оберіть 3 види зброї», Варвар/Паладин/Слідопит/Пройдисвіт — «Оберіть
  2». Кроку немає в Барда, Клірика, Друїда, Монаха, Чародія, Чорнокнижника, Чарівника,
  Винахідника — правильно.
- **Бойовий стиль.** Воїн — на 1-му рівні (`levelsGranted [1]`, крок `classChoices` є); Паладин і
  Слідопит — `[2]`, кроку на 1-му рівні немає. Це точно за 2024 (у 2014 Паладин/Слідопит теж
  на 2-му, але Воїн 2024 — єдиний з бойовим стилем на 1-му).
- **Підклас на 3-му рівні.** `subclassLevel = 3` в усіх 13 класів; кроку `subclass` на 1-му рівні
  немає в жодного — за 2024 правильно.
- **Ряткидки, обладунки, зброя.** Звірено з Core Traits для всіх 13: збігається, включно з
  тонкими місцями — Монах `weaponProficienciesSpecial {specific:[SCIMITAR, SHORTSWORD,
  HAND_CROSSBOW]}` («Martial weapons that have the Light property»), Пройдисвіт `{specific:
  [RAPIER, SCIMITAR, SHORTSWORD, WHIP, HAND_CROSSBOW]}` («Finesse or Light»), Чародій/Чарівник/
  Монах — `armorProficiencies: []`.
- **Кубик здоровʼя.** d12/d8/d8/d8/d10/d8/d10/d10/d8/d6/d8/d6 + Винахідник d8 — за книгою.
- **Спорядження A/B/C і монети.** Варіанти й золото збігаються з Core Traits: Варвар (A) Велика
  сокира + 4 ручні сокири + набір мандрівника + 15 зм / (B) 75 зм; Воїн має три варіанти A/B/C.
- **Мови.** `languagesToChooseCount = 0` у всіх класів 2024 — правильно (у 2024 мови дає
  походження, і крок `languages` справді зʼявляється з двома виборами).
- **Прогресія ASI.** `abilityScoreUpLevels [4,8,12,16]` + `epicBoonLevel 19` — за 2024
  (у 2014 було [4,8,12,16,19]).
- **Винахідник (ARTIFICER_2024) у конструкторі — не баг, а рішення власника** від 2026-08-21,
  `docs/o13-2024-completeness/README.md:78–79`: «імпортуємо разом із PHB 2024 — обсяг KR13.2 став
  13 класів і 187 фіч». Джерело в даних чесно позначене
  `EBERRON_FORGE_OF_THE_ARTIFICER_2024_UNOFFICIAL`, `isPhbCore: false`. Клас проходить конструктор
  до кінця нарівні з іншими; його рівень 1 (Spellcasting, Tinker's Magic) відповідає власному
  джерелу.
- **Console errors.** У прогонах не зафіксовано жодного `pageerror` чи `console.error` зі
  застосунку. Єдині помилки в консолі — `Module not found: Can't resolve '@/rules/ability-score-ceiling'`
  з `src/rules/levelup.ts`, `LevelUpWizard.tsx`, `LevelUpHPStep.tsx`: це **незавершений стан
  дерева паралельної сесії**, не дефект продукту (гілка підвищення рівня зараз не збирається на
  :3100).
- **Сирих ключів** («_2024», «UNARMORED_DEFENSE») у видимому тексті кроків не знайдено — усі
  назви фіч і виборів локалізовані.

## Що не перевірено

- Лист персонажа для всіх 13 класів: `spells_test` під час прогону кілька разів витиралася
  `TRUNCATE`-ом паралельного інтеграційного запуску (`tests/rules-2024/multiclass-fifteen.test.ts`),
  тож персонажі 27–29 і решта зникали одразу після створення. Доведено на одному персонажі
  (клірик 141) плюс на даних, що живлять лист.
- Знімки/копії: побічно видно, що level-снапшоти мультикласових фікстур мають
  `ruleset = RULES_2014` при базовому `RULES_2024` (pers 15 vs 16–18) — це поле іншої лінзи, тут
  лише зафіксовано.
