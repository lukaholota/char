# P2-elf-wizard — Ельф (Високий ельф) / Мудрець 2024 / Чарівник 2024

Лінза: персона в браузері на http://127.0.0.1:3100, база `spells_test`, користувач
`P2-elf-wizard@holota.family` (user_id 3). Персонаж створений у конструкторі 2024
(`/2024/char`) → **pers_id 8**, лист `/char/8`.

Робочі файли: `scratchpad/audit/work/P2-elf-wizard/` (скрипти `01`–`10`, логи `*.log`),
скріншоти `scratchpad/audit/shots/P2-elf-wizard-*.png`.

## Що каже книга (оракули в репо)

- `data/2024/srd/character-origins.md:180-230` — Ельф: Darkvision 60, **Elven Lineage** (High Elf:
  «You know the Prestidigitation cantrip… When you reach character levels 3 and 5, you learn a
  higher-level spell… You always have that spell prepared. You can cast it once without a spell
  slot… Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast
  with this trait»), Fey Ancestry, Keen Senses (Insight/Perception/Survival), Trance.
- `data/2024/srd/character-origins.md:49-55` — Sage: «**Ability Scores:** Constitution,
  Intelligence, Wisdom / **Feat:** Magic Initiate (Wizard) / **Skill Proficiencies:** Arcana and
  History / **Tool Proficiency:** Calligrapher's Supplies / **Equipment:** Choose A or B».
- `data/2024/srd/classes.md:9818` — Core Wizard Traits: «**Skill Proficiencies** — Choose 2:
  Arcana, History, Insight, Investigation, Medicine, Nature, or Religion».
- `data/2024/srd/classes.md:9851-9965` — таблиця Чарівника: рів. 1 — 3 замовляння, 4 підготовлених,
  2 слоти; рів. 2 — 5 підготовлених, 3 слоти, Scholar; рів. 3 — 6 підготовлених, слоти 4/2,
  підклас; рів. 4 — 4 замовляння, 7 підготовлених; рів. 5 — 9 підготовлених, слоти 4/3/2.
- `data/2024/srd/classes.md:10219` — «The book … starts with **six** level 1 Wizard spells of your
  choice»; `:10233` — «Intelligence is your spellcasting ability for your Wizard spells».
- `data/2024/srd/feats.md:31-43` — Magic Initiate: «You learn **two cantrips** of your choice from
  the Cleric, Druid, or Wizard spell list. **Intelligence, Wisdom, or Charisma** is your
  spellcasting ability for this feat's spells (choose when you select this feat). … Choose a
  **level 1 spell** from the same list. You always have that spell prepared».

Очікувані числа для цієї персони на 1-му рівні: ІНТ 15+2 = **17** (+3), СТА 14+1 = **15** (+2),
КС заклинань 8+2+3 = **13**, атака заклинанням **+5**, HP 6+2 = **8**, слоти **2**, книга **6**
заклинань 1-го рівня, підготовлено **4**, замовлянь **3** (+ Prestidigitation від виду поза
лімітом + 2 замовляння від Magic Initiate), навички: Arcana + History (походження), одна з
Insight/Perception/Survival (вид), **+2 на вибір від класу**.

---

## Знахідки

### P2-elf-wizard-01 (P0) — персонаж із конструктора 2024 зберігається як `RULES_2014`

**Доказ.** Пройдено `/2024/char` до кінця (скрипт `07-create.mjs`, скріншоти `07a`–`07f`).
Запит до `spells_test`:

```
PERS: { "pers_id": 8, "class_id": 350, "background_id": 163, "race_id": 1871,
        "ruleset": "RULES_2014" }
META: [{"k":"race","n":"ELF_2024","r":"RULES_2024"},
       {"k":"class","n":"WIZARD_2024","r":"RULES_2024"},
       {"k":"bg","n":"SAGE_2024","r":"RULES_2024"}]
```

Увесь контент — 2024, а `pers.ruleset` — 2014.

**Причина (доведена по коду).**
- `src/app/2024/char/page.tsx:42` передає `initialRuleset="RULES_2024"`.
- `src/lib/components/characterCreator/MultiStepForm.tsx:64,90` використовує `initialRuleset`
  **лише** для `currentRuleset` (UI) і для ключа чернетки; у `formData` поле `ruleset` не
  записується ніде (grep по `ruleset:` у MultiStepForm — жодного присвоєння).
- `MultiStepForm.tsx:153` — `await createCharacter(currentData)`; `currentData.ruleset` завжди
  `undefined`.
- `src/lib/zod/schemas/persCreateSchema.ts:294` —
  `ruleset: z.enum([...]).default("RULES_2014").optional()` → після парсингу
  `validData.ruleset === "RULES_2014"`.
- `src/server/db/character-creation.ts:180` —
  `const ruleset = (validData.ruleset ?? characterClass.ruleset ?? "RULES_2014")`; `??` ніколи не
  доходить до `characterClass.ruleset`, бо zod-дефолт уже підставив значення.

**Чому цього не ловлять тести.** `tests/helpers/build-2024-character.ts:103` передає
`ruleset: "RULES_2024"` явно, тому вся приймальна десятка йде повз дефект. У `spells_test`:
персонажі 3 і 5 (з фікстур) мають `RULES_2024`, персонаж 8 (з браузера) — `RULES_2014`.

**Наслідки** — знахідки 02–05 нижче; кожна перевірена окремо.

**Fix hint.** Або прибрати `.default("RULES_2014")` зі схеми (лишити `.optional()`), або
записувати `ruleset` у `formData` в `MultiStepForm` з `initialRuleset`. Мінімум — і те, і те,
плюс тест, що ганяє **той самий** payload, який шле форма (без явного `ruleset`).

---

### P2-elf-wizard-02 (P0) — такого персонажа неможливо підняти в рівні: «Клас не знайдено»

**Репро.** `/char/8/levelup` → «Підняти рівень наявного класу» → обрати картку класу →
«Підвищити рівень». Скрипт `10-levelup.mjs`, лог `10b.log`, скріншот
`P2-elf-wizard-10c-final-8.png`.

**Є.** На сторінці зʼявляється текст **«Клас не знайдено»**, рівень у базі лишається 1
(`select level from pers where pers_id=8` → 1) навіть після восьми натискань.
Картка класу підписана **«КЛАС #350»** замість «Чарівник».

**Причина.** `src/server/db/levelup-content.ts:49-50`:

```ts
const ruleset = pers?.ruleset ?? DEFAULT_RULESET;
const { classes, feats, infusions, weapons } = findCharacterCreatorOptions(ruleset);
```

При `ruleset = RULES_2014` повертається список класів 2014, у якому немає `classId 350`
(WIZARD_2024) → `src/server/db/levelup-persistence.ts:185-186`
`const selectedClass = classes.find(...); if (!selectedClass) return { error: "Клас не знайдено" };`.
Той самий фільтр дає й підпис-заглушку `src/lib/components/levelUp/LevelUpWizard.tsx:1781`
`if (!cls) return \`Клас #${classId}\``.

**Наслідок для лінзи.** Усі кроки завдання починаючи з рівня 2 (Scholar/експертиза, +2 заклинання
в книгу, підклас Evoker на 3-му, риса на 4-му, слоти 3-го рівня й Misty Step на 5-му) недосяжні
через інтерфейс. Перевірити їх у браузері неможливо, доки не полагоджено 01.

---

### P2-elf-wizard-03 (P1) — ASI походження мовчки губиться: ІНТ 15 замість 17, КС 12 замість 13

**Репро.** Крок «Характеристики» → «Бонуси походження «Мудрець 2024»» → +2 Інтелект, +1 Статура.
Плашка-підсумок на самому кроці показує правильно: `Статура +1 Інтелект +2 Мудрість +0`
(скріншот `P2-elf-wizard-06a-asi-done.png`).

**Є.** Уже наступний екран («Імʼя», блок «Фінальні характеристики», скріншот
`P2-elf-wizard-07e-name-filled.png`) показує **СТА 14, ІНТ 15**. У базі те саме:
`{"str":8,"dex":13,"con":14,"int":15,"wis":12,"cha":10}`. На листі `/char/8`:
**«БОНУС АТАКИ ЗАКЛИНАННЯМИ +4», «СК (СКЛАДНІСТЬ РЯТКИДКА) 12»**, Магія +4, Історія +4.

**Має бути.** СТА 15, ІНТ 17; КС 8+2+3 = **13**, атака **+5**, Магія/Історія **+5**.

**Причина.** `src/rules/background-asi.ts:32` — `if (ruleset !== "RULES_2024") return null;`
у поєднанні зі знахідкою 01. Вибір гравця приймається формою й тихо викидається сервером —
жодної помилки не показано.

---

### P2-elf-wizard-04 (P1) — замовляння виду (Prestidigitation) не видається; персонаж узагалі без заклинань

**Є.** `select * from pers_spell where pers_id=8` → **0 рядків**; `_PersToSpell` для 8 — **0
рядків**. Лист: «ЗАКЛИНАННЯ … **Заклинання відсутні**» (скріншот `P2-elf-wizard-09a-magic-8.png`).

**Має бути.** `character-origins.md:216` — High Elf «You know the Prestidigitation cantrip» —
завжди підготовлене, поза лімітом замовлянь класу.

**Дані для цього правильні** (тобто це не дефіцит контенту): фіча 49374
`Elven Lineage: High Elf (2024)` має `_FeatureToSpell → Prestidigitation`, а
`race_choice_option_spell` для опції 130 містить `Detect Magic` (character_level 3) і
`Misty Step` (character_level 5).

**Причина.** `src/rules/spell-sources.ts:95` — `if (input.ruleset !== "RULES_2024") return [];`;
`saveGrantedSpells` (`src/server/db/character-creation.ts:350-369`) отримує `ruleset` зі знахідки 01
і не пише нічого.

**Окремо (не перевірено через 02):** безкоштовне застосування родоводу раз на довгий відпочинок
і рівневі Detect Magic / Misty Step — недосяжні, бо рівні 3 і 5 не беруться.

---

### P2-elf-wizard-05 (P1, ruleset-isolation) — діалог додавання заклинань пропонує список чарівника **2014**

**Репро.** `/char/8` → вкладка «Магія» → «Додати» → «Так, з фільтрами». Скрипт `09-magic.mjs`,
скріншот `P2-elf-wizard-09d-add-spell-list-8.png`.

**Є.** Заголовок групи — **«Замовляння (31)»**; перший запис — «Влада над вогнем
[Control Flames] … Класи: Друїд, Чарівник, Чародій» (XGtE 2014). Лічильник у шапці —
«Заклинань: 0 / 4 · Замовлянь: 0 / 3» (числа 2024 правильні).

**Має бути.** Список чарівника 2024 — **20** замовлянь. Запит до `spells_test`:

| ruleset | замовлянь чарівника |
|---|---|
| RULES_2014 | 31 |
| RULES_2024 | 20 (Acid Splash, Blade Ward, Chill Touch, Dancing Lights, Elementalism, Fire Bolt, Friends, Light, Mage Hand, Mending, Message, Mind Sliver, Minor Illusion, Poison Spray, Prestidigitation, Ray of Frost, Shocking Grasp, Thunderclap, Toll the Dead, True Strike) |

`Control Flames` у списку 2024 відсутній.

**Причина.** Та сама — `pers.ruleset`. Файли самого діалогу (`AddSpellDialog.tsx`,
`spell-actions.ts`) я не чіпав: вони в переліку паралельної сесії; корінь тут не в них.

---

### P2-elf-wizard-06 (P1, data) — жоден клас 2024 не дає стартових навичок на вибір

**Правило.** `data/2024/srd/classes.md:9818` — Wizard: «Skill Proficiencies — **Choose 2**: Arcana,
History, Insight, Investigation, Medicine, Nature, or Religion».

**Є.** Крок «Навички» показує лише фіксовані (Магія, Історія від походження; Уважність від виду)
і **«ЗАЛИШОК: 0»** (скріншот `P2-elf-wizard-06b-skills.png`). У базі персонажа рівно три навички:
ARCANA, HISTORY, PERCEPTION.

**Джерело дефекту — контент, не код.** Запит по всій таблиці `class`:

```
RULES_2014 | WIZARD_2014 | {"options":["ARCANA","HISTORY","INSIGHT","INVESTIGATION",
                            "MEDICINE","RELIGION"],"choiceCount":2}
RULES_2024 | WIZARD_2024 | null      ← і так у всіх 13 класів 2024
```

`SkillsForm` читає саме `selectedClass.skillProficiencies`
(`src/lib/components/characterCreator/SkillsForm.tsx:34-67`), тож `null` = нуль виборів.
У джерельному файлі `data/2024/normalized/classes.json` поля взагалі немає (ключі запису Wizard:
`ruleset, engName, weaponMasteryProgression, name, flavorTextEng, subclassLevel,
abilityScoreImprovementLevels, epicBoonLevel, isPhbCore, note, source, featuresEng, features,
translationStatus`).

**Наслідок.** Кожен персонаж 2024 недоотримує від 2 до 4 володінь навичками. Це **не** та сама
дірка, що BUG-006/о27 §3 (ті — про мультиклас); тут гублять і початковий клас.

---

### P2-elf-wizard-07 (P1) — риса походження чіпляється без жодного вибору: Magic Initiate без списку, замовлянь і заклинання

**Правило.** `character-origins.md:51` — Sage несе `Magic Initiate (Wizard)`; `feats.md:37-41` —
два замовляння на вибір, характеристика INT/WIS/CHA на вибір, одне заклинання 1-го рівня, завжди
підготовлене, одне безкоштовне застосування на довгий відпочинок.

**Є.** У конструкторі кроків «Риса походження» / «Опції риси походження» **не існує** — набір
кроків для цієї персони: Раса → Опції раси → Клас → Передісторія → Характеристики → Навички →
Мови → Спорядження → Імʼя (лог `07.log`). Риса все одно чіпляється на сервері:

```
PERS_FEAT: [{"pers_feat_id":7,"feat_id":3029,"eng_name":"Magic Initiate"}]
PERS_FEAT_CHOICE для pers_feat_id 7: жодного рядка
```

На листі картка «Посвячений у магію / РИСА» показує повний текст правила — і жодного обраного
замовляння (скріншот `P2-elf-wizard-09b-features-8.png`).

**Причина.** `MultiStepForm.tsx:275` — `hasBackgroundFeatChoice = (bg?.gainsFeats?.length ?? 0) > 0`,
а `gainsFeats` у `src/lib/generated/creator-content-2024.json` порожній для **всіх 16** походжень
2024 (звʼязок `_BackgroundToFeat` має 19 рядків, усі `RULES_2014`). Риса 2024 приходить іншим
полем — `background.originFeatId` — яке читає лише сервер
(`src/server/db/character-creation.ts:854`: `validData.backgroundFeatId ?? background.originFeatId`)
і яке `MultiStepForm` не переносить у `formData.backgroundFeatId`; тому й
`hasBackgroundFeatChoices` (`:277`) ніколи не істинний.

**Масштаб.** З 16 походжень 2024 шість несуть риси з виборами:
`MAGIC_INITIATE` (3 опції списку) — Sage, Acolyte, Guide; `SKILLED` (18 опцій) — Charlatan, Noble,
Scribe. Решта десять рис виборів не мають, тому там дефект невидимий.

**Fix hint.** У 2024-гілці конструктора підставляти `formData.backgroundFeatId = bg.originFeatId`
одразу після вибору походження — тоді крок «Опції риси походження» зʼявиться сам,
`FeatChoiceOptionsForm` уже вміє все інше.

---

### P2-elf-wizard-08 (P2, data) — Magic Initiate 2024: характеристика прибита до списку, книга дає вибір

**Правило.** `feats.md:37` — «**Intelligence, Wisdom, or Charisma** is your spellcasting ability
for this feat's spells (choose when you select this feat)».

**Є.** `choice_option` для риси 3029 — три опції **лише списку** заклинань, і кожна несе жорстку
характеристику: `Клірик → WIS`, `Друїд → WIS`, `Чарівник → INT`. Групи «Базова характеристика
заклинань» (як у ельфійського родоводу) для риси немає.

**Наслідок.** Чарівник, що хоче Magic Initiate (Cleric) на INT — легальний вибір за книгою —
його зробити не може. Для цієї персони збігу немає (Wizard → INT і так правильний), тож P2.

---

### P2-elf-wizard-09 (P3, ux) — підсумок спорядження показує сирі `option_id` замість назв

**Є.** Крок «Імʼя», блок «СПОРЯДЖЕННЯ»: `Опція 1: Кинджал x2 • 204 • 205 • 206 • Вчений набір • 208`
(скріншот `P2-elf-wizard-07d-name.png`).

**Має бути.** `Кинджал x2 • Містичне фокусування (палиця) • Мантія • Книга заклять • Вчений набір • 5 зм`
— саме ці рядки лежать у `class_starting_equipment_option.item` для option_id 204/205/206/208.

**Причина.** `src/lib/components/characterCreator/NameForm.tsx:361-378` — збирає підпис із
`description`, `weapon`, `armor`, `equipmentPack`, але **не читає колонку `item`**, у якій
записане все вільнотекстове спорядження 2024; далі `return label ? ... : String(optionId)`.

**Записалося правильно** — `pers.custom_equipment` містить усі назви; це суто дефект підсумку.

---

### P2-elf-wizard-10 (P3, ux) — у виборі мов пропонується «Загальна», яку персонаж уже має

**Є.** Крок «Мови»: «Ви можете обрати ще 2 з 2 мов» і в переліку першою стоїть **Загальна**
(скріншот `P2-elf-wizard-07a-languages.png`). Після створення
`pers.custom_languages_known = "Загальна\nЕльфійська\nДраконяча"` — Common додано автоматично.

**Має бути.** Мову, що вже надана, у списку вибору не показувати (інакше гравець може «витратити»
вибір на дублікат).

---

## Перевірено й правильно

- **Крок «Опції раси»** для ельфа 2024 показує рівно три групи книги: Ельфійський родовід
  (Дроу / Високий ельф / Лісовий ельф з правильними текстами), Гострі чуття
  (Аналіз поведінки / Уважність / Виживання), Базова характеристика заклинань (Інтелект /
  Мудрість / Харизма). Це точний зліпок `character-origins.md:190-230`.
- **Вибори виду зберігаються**: `_PersToRaceChoiceOption` для pers 8 містить опції 130
  («Високий ельф»), 133 («Уважність»), 146 («Інтелект», `spellcasting_ability = INT`).
- **Дані родоводу коректні**: `race_choice_option_spell` для High Elf — `Detect Magic` на
  character_level 3 і `Misty Step` на 5; фіча `Elven Lineage: High Elf (2024)` вказує на
  `Prestidigitation`. Дефект 04 — у видачі, не в контенті.
- **Підклас на 1-му рівні не пропонується** — правильно: `classes.md:10251` дає Wizard Subclass
  на 3-му. Кроку «Підклас» у наборі немає.
- **Ряткидки** INT +4 / WIS +3 на листі — `additional_save_proficiencies = {INT,WIS}`, збігається
  з Core Wizard Traits.
- **Слоти 1-го рівня 2/2** на 1-му рівні — рядок таблиці Чарівника.
- **HP 8**, хіт-дайси `1/1 d6` — d6 + мод. СТА; збігається з `Hit Point Die: D6 per Wizard level`
  (число випадково правильне й без ASI походження: 14 і 15 дають однаковий +2).
- **КЗ 11** (10 + СПР), ініціатива +1, швидкість 30 — правильно.
- **Володіння** `custom_proficiencies = "Каліграфічний набір\nПроста зброя"` — Calligrapher's
  Supplies від Мудреця + Simple weapons від класу; обладунків Чарівник 2024 не має — правильно.
- **Спорядження A/B** показує обидва набори (класовий і походження) з правильним вмістом за
  `classes.md:9830` і `character-origins.md:55`; вибір записався в `custom_equipment`, 13 зм
  (5 зм класу + 8 зм пакунка) у гаманці.
- **ASI-крок**: «+2 і +1» / «+1 до всіх трьох» і дозволені характеристики СТА/ІНТ/МУД —
  точно за Sage. Дефект 03 — у застосуванні, не в пропозиції.
- **Лічильник у діалозі заклинань** — «Заклинань: 0 / 4 · Замовлянь: 0 / 3» — це числа рядка 1
  таблиці Чарівника 2024 (Prepared 4, Cantrips 3), тобто підготовка рахується від редакції класу,
  а не від `pers.ruleset`.
- **Фічі 1-го рівня видані повністю**: `pers_feature` = Darkvision, Elven Lineage, High Elf,
  Fey Ancestry, Keen Senses, Trance, Wizard: Spellcasting, Ritual Adept, Arcane Recovery.

## Не перевірено (через P2-elf-wizard-02)

Усе, що потребує рівнів 2–5: Scholar і його експертиза, +2 заклинання в книгу на рівень, підклас
Evoker і його два безкоштовні заклинання Evocation, ASI/риса на 4-му (War Caster), слоти 3-го рівня
й Misty Step на 5-му, заміна замовляння родоводу після довгого відпочинку, Memorize Spell,
лічильники uses (Arcane Recovery, безкоштовне застосування родоводу й Magic Initiate),
кастинг зі списанням слота, концентрація, довгий відпочинок. Підняти рівень через інтерфейс
неможливо, а програмна збірка іншого персонажа обходила б саме той шлях, який зламано.

Окремо не перевірено: чи показує лист блок «книга vs підготовлені» для персонажа з правильним
`ruleset = RULES_2024` — на pers 8 там заглушка «КІЛЬКІСТЬ ВІДОМИХ / ПІДГОТОВЛЕНИХ — Залежить від
рівня класу та модифікатора».
