# P3-multiclass-wizard-cleric — Людина, Чарівник 4 / Клірик 4 (сценарій №21)

Персона в браузері на http://127.0.0.1:3100, користувач `P3-multiclass@holota.family`,
персонаж **pers_id 23** «Аудит Мультиклас» (Людина 2024 · Чарівник 2024 · Послушник).
Оракул сценарію — `docs/o27-multiclass-2024/reference-fifteen.md` §21 і фікстура
`tests/fixtures/2024-multiclass/21-human-wizard4-cleric4.json`.

> Розбіжність у завданні: промпт каже «Провидець/Evoker» і «Life Domain», фікстура репо каже
> `DIVINER` + `LIGHT_DOMAIN`. Я вів за фікстурою (оракул у репо).

## Головне

Сценарій **не вдалося довести до Чарівник 4 / Клірик 4**, і не через брак часу: персонаж,
створений конструктором 2024 у браузері, зберігається як **`RULES_2014`**. Через це вже на
1-му рівні губиться розподіл характеристик походження, а майстер підвищення рівня пропонує
мультиклас у **класи 2014**, а не 2024. Усе, що мало перевірятися далі (пакет володінь клірика,
Divine Order, підготовка за таблицею клірика, слоти заклинача 8, «Fireball не можна»),
на цьому персонажі перевірити неможливо — він не 2024.

---

## Знахідки

### P3-multiclass-wizard-cleric-01 · P0 · ruleset-isolation · bug
**Персонаж, створений конструктором 2024, лягає в базу як `RULES_2014`.**

Доказ (код): `src/lib/zod/schemas/persCreateSchema.ts:294`
```ts
ruleset: z.enum(["RULES_2014", "RULES_2024"]).default("RULES_2014").optional(),
```
У zod 4 (у репо 4.3.6) `.default(x).optional()` для **відсутнього** ключа повертає `x`, а не
`undefined`:
```
$ node -e "const {z}=require('zod'); console.log(JSON.stringify(
    z.object({ruleset:z.enum(['RULES_2014','RULES_2024']).default('RULES_2014').optional()}).parse({})))"
{"ruleset":"RULES_2014"}
```
Стор конструктора `src/lib/stores/persFormStore.ts` поля `ruleset` не має взагалі
(`grep -n ruleset` дає лише `activateCreatorDraftStorage`), а `MultiStepForm.tsx:90` тримає
редакцію тільки в локальній змінній `currentRuleset` і **не кладе її у formData**, яка й іде в
`createCharacter(currentData)` (`MultiStepForm.tsx:153`). Тому запасний шлях
`src/server/db/character-creation.ts:427`
```ts
const ruleset = (validData.ruleset ?? cls.ruleset ?? "RULES_2014") as Ruleset;
```
ніколи не доходить до `cls.ruleset` — `validData.ruleset` завжди `"RULES_2014"`.

Доказ (база), запит до `spells_test`:
```
pers 23 «Аудит Мультиклас»  pers.ruleset=RULES_2014  class=WIZARD_2024 (class.ruleset=RULES_2024)
pers  8 «Аудит Ельф Чарівник» (P2)  RULES_2014  / WIZARD_2024
pers 16 «Гартан Клинок» (P1)        RULES_2014  / FIGHTER_2024
pers 14,15,17,18,19,20 (P5, знімки й копія) RULES_2014 / DRUID_2024
```
Тобто **кожен** персонаж, створений у браузері через `/2024/char`, — 2014. Персонажі 3–6
(зібрані програмно хелперами) мають правильний `RULES_2024`, тож інтеграційні тести цього не
ловлять.

Наслідки, зафіксовані окремо: персонаж **не показується** в `/2024/char/home` (сторінка
віддала порожній стан і відрендерила конструктор — `shots/P3-05-home2024.png`), натомість він у
`/char/home`; розподіл походження зникає (знахідка 02); мультиклас пропонує класи 2014
(знахідка 05).

Відтворення: `/2024/char` → Людина → Риса походження «Посвячений у магію» → список Друїд →
Чарівник → Послушник → характеристики → … → Створити → `select ruleset from pers where pers_id=<новий>`.

Де лагодити: або класти `ruleset` у formData конструктора перед сабмітом, або зняти
`.default("RULES_2014")` зі схеми (лишити `.optional()`), щоб спрацював запасний шлях від класу.
Друге безпечніше: воно ж лікує будь-який інший клієнт.

Файли: `src/lib/zod/schemas/persCreateSchema.ts`, `src/lib/components/characterCreator/MultiStepForm.tsx`,
`src/server/db/character-creation.ts`, `src/lib/stores/persFormStore.ts`.

---

### P3-multiclass-wizard-cleric-02 · P1 · background · bug
**Розподіл характеристик походження (+2 INT / +1 WIS) мовчки губиться.**

Оракул: `data/2024/srd/character-creation.md` — походження 2024 дає +2/+1 або +1/+1/+1;
фікстура §21 очікує `INT 17 / WIS 15` на 1-му рівні (базові `INT 15 / WIS 14`).

Крок «Характеристики» показав панель «Бонуси походження «Послушник»», я обрав «+2 і +1»,
Кому +2 = Інтелект, Кому +1 = Мудрість; бейджі внизу показали `Інтелект +2 · Мудрість +1`
(`shots/P3-03-asi.png`). Уже на кроці «Імʼя» підсумок «Фінальні характеристики» показує
**ІНТ 15 · МУД 14** (`shots/P3-03-name.png`), і саме це лягло в базу:
```
pers 23: str 8, dex 10, con 13, int 15, wis 14, cha 12    (очікувано int 17, wis 15)
```
Лист персонажа підтверджує: `ІНТ 15 +2`, `МУД 14 +2` (`shots/P3-05-sheet.png`).

Причина — той самий `ruleset`: `src/rules/character-creation.ts:91`
```ts
if (ruleset === "RULES_2024") {
  if (input.backgroundAbilityOptions && input.backgroundAsiChoice) {
    scores = strategy.applyBackgroundASI(...)
```
і `src/rules/background-asi.ts:32` `if (ruleset !== "RULES_2024") return null;` — гейт
`findBackgroundAsiProblem` теж повертає `null`, тож помилки гравцю **не показують**: вибір
приймають і викидають.

Окремо від 01 це варте власного рядка, бо навіть після виправлення редакції треба, щоб
пропущений/зігнорований розподіл давав помилку, а не тихо зникав.

---

### P3-multiclass-wizard-cleric-03 · P1 · data · відсутні класові навички 2024
**У всіх 13 класів `RULES_2024` `skill_proficiencies IS NULL` — крок «Навички» не пропонує жодного вибору.**

Оракул: `data/2024/srd/classes.md`, Core Wizard Traits →
`Skill Proficiencies: Choose 2: Arcana, History, Insight, Investigation, Medicine, Nature, or Religion`.
Клірик 2024 — `Choose 2: History, Insight, Medicine, Persuasion, or Religion`.

Доказ (база):
```sql
select ruleset, count(*) filter (where skill_proficiencies is null) nulls, count(*) total from class group by ruleset;
 RULES_2024 | 13 | 13
 RULES_2014 |  0 | 13
```
Доказ (файл конструктора): у `src/lib/generated/creator-content-2024.json` усі класи мають
`"skillProficiencies": null`; у `-2014.json` — нормальні `{options:[…], choiceCount:2}`.
Джерело сіду `data/2024/normalized/classes.json` поля володіння навичками **не має взагалі**
(ключі запису: `ruleset, engName, weaponMasteryProgression, name, flavorTextEng, subclassLevel,
abilityScoreImprovementLevels, epicBoonLevel, isPhbCore, note, source, featuresEng, features,
translationStatus`).

Доказ (UI): крок «Навички» для Чарівника 2024 + Послушника показав лише
«Фіксовані навички: Аналіз поведінки, Релігія» (з походження) і текст «Ці навички вже отримані з
інших джерел і не змінюються на цьому кроці» — жодного вибору (`shots/P3-03-skills.png`).
На листі персонажа компетентність стоїть тільки на Релігії та Аналізі поведінки.

Наслідок: **кожен** персонаж 2024 недоотримує 2–4 володіння навичками. Це не залежить від 01.

---

### P3-multiclass-wizard-cleric-04 · P1 · feats · bug
**Друга «Посвячений у магію» (від Універсальності Людини) не збереглася, а вибори списків заклинань — жодного.**

Оракул: `docs/o27-multiclass-2024/reference-fifteen.md` §21 — `Magic Initiate (Cleric)` від
походження і `Magic Initiate (Druid)` від Універсальності Людини; фікстура очікує
`feats: [MAGIC_INITIATE, MAGIC_INITIATE, WAR_CASTER, FEY_TOUCHED]` і
`magicInitiateLists: ["Cleric","Druid"]`. Рішення власника Р37: повторювана риса = **другий
рядок** `pers_feat`.

Доказ (база, pers 23):
```
pers_feat:        1 рядок  (feat_id 3029 «Magic Initiate»)      — очікувано 2
pers_feat_choice: 0 рядків                                       — очікувано 2 (Cleric, Druid)
_PersToRaceChoiceOption: 1 рядок (B=159 — вибір Людини «Посвячений у магію») — тобто вибір виду
                          збережено, а риса й її опція з нього — ні
```
`background.origin_feat_id` у Послушника = **3029** — той самий feat, що обирає Людина, тож
обидва надання йдуть в один і той самий `featId`; вижив тільки один рядок.

Доказ (UI): конструктор жодного разу не показав кроків `backgroundFeat` /
`backgroundFeatChoices` — список заклинань для «Magic Initiate» від Послушника ніхто не питав;
крок `speciesFeatChoices` (для риси Людини) показали й вибір «Друїд» я зробив
(`shots/P3-03-sfc.png`), але в базу він не потрапив. На листі — одна картка «Посвячений у магію»
і рядок «Риса походження: Посвячений у магію» без обраного списку (`shots/P3-05-sheet.png`),
заклинань від риси нема жодного (`pers_spell` порожня).

Код, який мав це зробити, є й виглядає правильно —
`src/server/db/character-creation.ts:849-869` зберігає окремо `validData.featId`,
`background.originFeatId` і кожну `featsGrantedByChoiceOptions`, а `saveFeatWithChoices:326`
має коментар «повторювана риса лягає другим рядком зі своїми виборами (Р37)». Отже або
`character.featIdsFromChoiceOptions` порожній, або надання з виду відсіюється раніше —
підозра на спільний корінь із 01 (редакція), але це треба перевіряти окремо.

---

### P3-multiclass-wizard-cleric-05 · P1 · multiclass · bug (редакція 2014)
**Передумова мультикласу у формі `choice` не перевіряється в `RULES_2014` — Воїна пропонують персонажу з СИЛ 8 і СПР 10.**

Оракул 2024: `data/2024/srd/character-creation.md`, Multiclassing → Prerequisites: «To qualify for
a new class, you must have a score of at least 13 in the primary ability of the new class **and
your current classes**». PHB 2014 для Воїна: Сила 13 **або** Спритність 13.

Доказ (UI): майстер `/char/23/levelup` → «Взяти новий клас (мультиклас)». Підпис на екрані:
«Показано лише класи, для яких виконані вимоги мультикласу (зазвичай 13+)», далі «Ваші
характеристики: СИЛ 8 · СПР 10 · СТА 13 · ІНТ 15 · МУД 14 · ХАР 12», а в списку —
**КЛІРИК, ДРУЇД, ВОЇН, ЧАРІВНИК, ВИНАХІДНИК** (`shots/P3-07-mc-path.png`).

Доказ (дані + код): у базі `FIGHTER_2014.multiclassReqs = {"score":13,"choice":["STR","DEX"]}` —
єдиний клас 2014, записаний формою `choice`. А `src/rules/multiclass-entry.ts` читає `choice`
**лише** для 2024:
```ts
if (ruleset === "RULES_2024" && reqs.choice?.length) {
  return { abilities: [...reqs.choice], needsAll: false, score };
}
return null;              // ← 2014 + choice = вимоги немає взагалі
```
Коментар у шапці файлу стверджує, що 2014 записані формою `required` («так записані класи 2014»),
і саме через це виняток не помітили — але Воїн 2014 записаний `choice`.

Той самий екран доводить і наслідок 01: персонажу з класом `WIZARD_2024` пропонують **класи
2014** (за 2024-логікою для ІНТ 15 / МУД 14 підійшли б рівно Клірик, Друїд, Чарівник,
Винахідник — без Воїна). Тобто через UI зібрати мультиклас 2024 сьогодні неможливо взагалі,
а спроба дає персонажа з класами двох редакцій.

---

### P3-multiclass-wizard-cleric-06 · P2 · levelup · ux
**Крок вибору класу в майстрі підвищення показує сирий id: «КЛАС #350».**

Доказ: `shots/P3-07-mc-classes.png`, текст сторінки:
```
Оберіть клас, який отримує +1 рівень.
КЛАС #350
Рівень класу: 1
ОСНОВНИЙ КЛАС
```
`350` — `class_id` Чарівника 2024. Гравець не бачить назви свого класу там, де саме її й обирає.

---

### P3-multiclass-wizard-cleric-07 · P3 · creation-2024 · ux
**Підсумок конструктора малює сирі id предметів замість назв.**

Доказ: крок «Імʼя», блок СПОРЯДЖЕННЯ (`shots/P3-03-name.png`):
```
Опція 1: Кинджал x2 • 204 • 205 • 206 • Вчений набір • 208
```
Очікувано — «Містичне фокусування (палиця) • Мантія • Книга заклять … », і саме ці назви
конструктор коректно записав у `pers.custom_equipment`. Ламається лише прев'ю.

---

### P3-multiclass-wizard-cleric-08 · P1 · sheet-derived · in-flight (середовище)
**Маршрут `/char/<id>/levelup` на аудиторському сервері :3100 віддавав 500.**

`Module not found: Can't resolve './ability-score-ceiling'` (з `src/rules/levelup.ts:2`) —
паралельна сесія створила `src/rules/ability-score-ceiling.ts` о 23:16, а копія дерева під
:3100 (`scratchpad/app`, зроблена о 21:20 жорсткими лінками) нового файлу не має, тоді як
змінений `levelup.ts` через лінк видно одразу. Я скопіював відсутній модуль у копію
(`scratchpad/app/src/rules/ability-score-ceiling.ts`) — маршрут запрацював; **у репозиторії
нічого не змінював**. Це артефакт середовища, не дефект продукту, але поки копію не оновлять,
кожна персона на :3100 бачитиме 500 на підвищенні рівня.

---

## Перевірено й правильно

- **Скорочений пакет володінь клірика в коді відповідає книзі.**
  `src/rules/multiclass-proficiencies.ts`: `CLERIC_2024: { armor: ["LIGHT","MEDIUM","SHIELD"] }`,
  без навичок, без зброї, без ряткидків — дослівно `data/2024/srd/classes.md`, Cleric → As a
  Multiclass Character: «Gain the following traits …: Hit Point Die and training with Light and
  Medium armor and Shields». Жодного класу з важким обладунком у мультикласовій таблиці немає —
  теж правильно.
- **Двостороння передумова 2024 реалізована.** `findMulticlassEntryProblem` для `RULES_2024`
  перевіряє `[newClass, ...currentClasses]`, тобто вхід Чарівник → Клірик вимагатиме і ІНТ 13, і
  МУД 13; форми `and` (монах, паладин, слідопит) і `choice` (решта) розрізняються правильно.
  У базі `CLERIC_2024 {"score":13,"choice":["WIS"]}`, `WIZARD_2024 {"score":13,"choice":["INT"]}`.
- **Таблиця підготовки 2024 за класом є і має правильні числа.**
  `src/rules/spell-preparation-2024.ts`: `CLERIC_2024.prepared[0] = 4` (Клірик 1 — 4
  підготовлених, як у завданні), `maxSpellLevel[3] = 2` для обох класів на 4-му рівні — тобто
  «слоти до 4-го, готувати лише 2-й» закладено. (Сам файл — in-flight KR27.7, не чіпав.)
- **Кубик хітів і HP 1-го рівня.** Чарівник d6 + СТА 13 (+1) → 7/7 у базі й на листі.
- **Ряткидки з класу.** `additional_save_proficiencies = {INT,WIS}` — Core Wizard Traits.
- **Спорядження й гроші.** Варіант A чарівника + пакунок Послушника лягли в
  `custom_equipment` повним списком, `gp = 13` (5 + 8) — збігається з книгою.
- **Мови.** Крок мов дав рівно 2 вибори понад Загальну — `custom_languages_known` містить
  «Загальна / Драконяча / Ельфійська».
- **Вибір виду зберігається.** `_PersToRaceChoiceOption (A=23, B=159)` — риса походження Людини
  записана (загубилася лише риса й опція, що з неї випливають — знахідка 04).
- **Кроки конструктора зʼявляються за вибором.** `speciesFeatChoices` виник рівно після вибору
  «Посвячений у магію», `languages` — після класу; порядок збігається з
  `creation-step-resolver.ts`.

## Не перевірено (заблоковано знахідкою 01)

Пакет володінь клірика на живому персонажі, крок Divine Order на 1-му рівні клірика, Channel
Divinity 2 uses на 2-му, Домен світла з «завжди підготовленими» поза лімітом на 3-му, ASI/риса
на 4-му, слоти 4/2 на рівні заклинача 5 і 4/3/3/2 на 8-му, КС клірика від МУД проти чарівника від
ІНТ, заборона взяти Fireball, `Cure Wounds` з двох джерел одним рядком і безкоштовне застосування
від риси (Р38), окремі ліміти підготовки за класом, порівняння з `expected` фікстури, книга
заклинань чарівника окремим шаром, ліміт бастіону 2. Усе це потребує персонажа з
`pers.ruleset = RULES_2024`, якого браузерний конструктор сьогодні не створює.
