# P1-human-fighter — Людина-Воїн 2024 через браузер (:3100)

**Лінза:** гравець, що вперше збирає Людину-Воїна 2024 через `/2024/char`, потім піднімає рівні.
**Персонаж:** `pers_id = 16`, «Гартан Клинок», користувач `P1-human-fighter@holota.family`,
база `spells_test`. Скрипти — `scratchpad/audit/work/P1-human-fighter/*.mjs`, скріншоти —
`scratchpad/audit/shots/P1-human-fighter-*.png`.

**Головний висновок:** персонаж 2024, створений **через браузер**, зберігається з
`pers.ruleset = RULES_2014`. Це один корінь, з якого ростуть щонайменше чотири окремі симптоми,
включно з **неможливістю підняти рівень**. Приймальні набори `tests/rules-2024/*` зелені саме
тому, що хелпер підставляє `ruleset: "RULES_2024"` у форму сам — тобто тестується шлях, яким
жоден гравець не ходить. Рівні 2–6 (Action Surge, Battle Master, Great Weapon Master,
Extra Attack, ASI) перевірити не вдалося взагалі: майстер підвищення закінчується глухим кутом.

---

## P1-human-fighter-01 (P0) — конструктор 2024 пише `pers.ruleset = RULES_2014`

**Правило/очікування:** персонаж, зібраний на `/2024/char` з класу `FIGHTER_2024`, має бути
персонажем редакції 2024.

**Доказ.**

1. Чернетка форми (localStorage `dnd-2024-pers-form`) після проходу всіх кроків **не містить
   ключа `ruleset`** взагалі:
   `{"state":{"formData":{"raceId":1875,...,"classId":343,"classChoiceSelections":{"Бойовий стиль":3384},"weaponMasteryWeaponIds":[...]},"currentStep":6,"totalSteps":12}}`
2. `src/lib/zod/schemas/persCreateSchema.ts:294`
   ```ts
   ruleset: z.enum(["RULES_2014", "RULES_2024"]).default("RULES_2014").optional(),
   ```
   `.default()` спрацьовує на відсутньому полі, тож `validData.ruleset === "RULES_2014"`.
3. Через це запобіжник у `src/server/db/character-creation.ts:180`
   ```ts
   const ruleset = (validData.ruleset ?? characterClass.ruleset ?? "RULES_2014") as RulesetId;
   ```
   ніколи не доходить до `characterClass.ruleset` (= `RULES_2024`).
4. Сторінка передає редакцію лише в UI: `src/app/2024/char/page.tsx:41` — `initialRuleset="RULES_2024"`,
   а `MultiStepForm.tsx:90` читає `formData.ruleset ?? initialRuleset` **тільки для показу**;
   у payload `formData` редакція не потрапляє.
5. База:
   ```
   select pers_id,name,class_id,ruleset from pers where pers_id=16
   → { pers_id: 16, name: "Гартан Клинок", class_id: 343 (FIGHTER_2024), ruleset: "RULES_2014" }
   ```
   Для порівняння, той самий білд, зроблений хелпером тестів:
   ```
   select pers_id,name,str,ruleset from pers where pers_id=6
   → { "Red Dragonborn Fighter 5 — Soldier", str: 17, ruleset: "RULES_2024" }
   ```
   `tests/helpers/build-2024-character.ts:103` кладе `ruleset: "RULES_2024"` у форму явно.

**Репро:** `/2024/char` → Людина → Умілець → Воїн → Оборона → 3 майстерності → Солдат 2024 →
характеристики (+2 Сила, +1 Статура) → мови → спорядження A → імʼя → «Створити» →
`select ruleset from pers where pers_id=<новий>`.

**Наслідки (окремі знахідки 02–04):** підвищення рівня неможливе, бонуси характеристик
походження не застосовані, майстерність зброї не збережена.

**Куди дивитися:** `src/lib/zod/schemas/persCreateSchema.ts:294` (прибрати `.default()` або
зробити поле обовʼязковим), `src/lib/components/characterCreator/MultiStepForm.tsx` (класти
`initialRuleset` у `formData` при ініціалізації), `src/server/db/character-creation.ts:180`.
Гейт: тест, що ганяє **payload конструктора**, а не payload хелпера.

---

## P1-human-fighter-02 (P0) — підвищення рівня глухий кут: «Клас не знайдено»

**Доказ.** `/char/16/levelup` → «Підняти рівень наявного класу» → картка класу → «Підвищити рівень»
→ під кнопкою зʼявляється **«Клас не знайдено»**, майстер не рухається. Повторні кліки — те саме.
Скріншоти `P1-human-fighter-lvlup-16-0..13.png`.

Код: `src/server/db/levelup-content.ts:49-50`
```ts
const ruleset = pers?.ruleset ?? DEFAULT_RULESET;
const { classes, feats, infusions, weapons } = findCharacterCreatorOptions(ruleset);
```
→ для `pers.ruleset = RULES_2014` список класів не містить `classId 343` →
`src/server/db/levelup-persistence.ts:186`
```ts
const selectedClass = classes.find((characterClass) => characterClass.classId === selectedClassId);
if (!selectedClass) return { error: "Клас не знайдено" };
```

**Наслідок:** будь-який персонаж, створений у браузері на `/2024/char`, замкнений на 1-му рівні
назавжди. Рівні 2–6 моєї лінзи (Action Surge/Tactical Mind, Battle Master, Great Weapon Master,
Extra Attack/Tactical Shift, ASI) **не перевірені взагалі**.

---

## P1-human-fighter-03 (P1) — бонуси характеристик від походження не застосовані

**Правило:** `data/2024/srd/character-origins.md:57-62` — Soldier, **Ability Scores: Strength,
Dexterity, Constitution**; `character-creation.md` — походження дає +2/+1 або +1/+1/+1.

**Має бути:** Сила 15 → **17**, Статура 14 → **15**.
**Є:** `select str,con from pers where pers_id=16 → str: 15, con: 14`. На листі СИЛ 15 (+2),
РятК Сили +4, Дворучний меч 2d6+2 / влучання +4 (мало бути 2d6+3 / +5).
Скріншот `P1-human-fighter-19-sheet-lvl1.png`.

Крок конструктора вибір **прийняв і показав** («Сила +2, Спритність +0, Статура +1»,
`P1-human-fighter-13-asi-done.png`) — тобто вибір гравця зроблено й загублено при збереженні.
Причина — знахідка 01: `buildInitialCharacterState({ ruleset, ... })` отримує `RULES_2014`, де
бонусів походження немає.

---

## P1-human-fighter-04 (P1) — обрана майстерність зброї не збереглася

**Правило:** `data/2024/srd/classes.md` — Fighter level 1, Weapon Mastery = **3**.

**Є:** на кроці конструктора обрано Дворучний меч, Бойовий ціп, Дротик (чернетка:
`weaponMasteryWeaponIds: [2217, 2214, 2209]`), після створення:
```
select * from pers_weapon_mastery where pers_id=16 → []
```
Лист персонажа: «МАЙСТЕРНІСТЬ ЗБРОЇ — Обрано 0 з 3. Види зброї ще не обрані»
(`P1-human-fighter-19b-sheet-lvl1.png`). Атаки не несуть жодної властивості майстерності
(Graze/Sap/Vex).

Для порівняння, персонаж 6 (зібраний хелпером із `ruleset: RULES_2024`):
`select count(*) from pers_weapon_mastery where pers_id=6 → 3`.
Причина — знахідка 01: `findCreationWeaponMasteryOffer(tx, { classId, ruleset })`
(`character-creation.ts:937`) не знаходить пропозиції для `RULES_2014`.

---

## P1-human-fighter-05 (P1) — жоден клас 2024 не дає навичок класу

**Правило:** `data/2024/srd/classes.md`, Core Fighter Traits →
«**Skill Proficiencies:** Choose 2: Acrobatics, Animal Handling, Athletics, History, Insight,
Intimidation, Persuasion, Perception, or Survival».

**Є:** крок «Навички» показує лише «Фіксовані навички: Атлетика, Залякування» (від походження)
і напис «Ці навички вже отримані з інших джерел і не змінюються на цьому кроці» —
вибору двох навичок класу немає (`P1-human-fighter-14-skills.png`).

Дані, не UI:
```
select eng_name, skill_proficiencies from class where ruleset='RULES_2024'
→ усі 13 класів: skill_proficiencies = null
```
Для порівняння 2014: `FIGHTER_2014 → {"options":[ANIMAL_HANDLING,ACROBATICS,ATHLETICS,HISTORY,
INSIGHT,INTIMIDATION,PERCEPTION,SURVIVAL],"choiceCount":2}`.
Джерело сіду теж порожнє: у `data/2024/normalized/classes.json` запис Fighter не має поля
`skillProficiencies` взагалі (ключі: ruleset, engName, weaponMasteryProgression, name,
flavorTextEng, subclassLevel, abilityScoreImprovementLevels, epicBoonLevel, isPhbCore, note,
source, featuresEng, features, translationStatus).

**Наслідок:** кожен персонаж 2024 недоотримує 2–4 володіння навичками (Rogue — 4, Bard — 3).
Це **не** наслідок знахідки 01: у персонажа 6 (`RULES_2024`) теж лише 2 рядки `pers_skill`.

---

## P1-human-fighter-06 (P1) — риса Людини «Вправність» (Skillful) не дає навички

**Правило:** `data/2024/srd/character-origins.md:307` — Human, «_Skillful._ You gain proficiency
in one skill of your choice.»

**Є:** риса присутня як текст (`pers_feature` 105, `Human: Skillful (2024)`), але вибору навички
конструктор не пропонує на жодному кроці, і `pers_skill` не поповнюється.
Дані виду: `creator-content-2024.json`, `HUMAN_2024.skillProficiencies = null`,
поля на кшталт `skillsToChooseCount` у записі немає.

**Разом із 05:** за книгою персонаж мав мати 8 навичок (2 походження + 2 класу + 1 Skillful +
3 Skilled), фактично має **2**.

---

## P1-human-fighter-07 (P1) — три навички риси «Умілець» не збереглися

**Правило:** `data/2024/srd/feats.md:51-57` — Skilled: «You gain proficiency in any combination
of three skills or tools of your choice.»

**Є:** на кроці «Опції риси виду» обрано Виживання, Уважність, Медицину (чернетка:
`speciesFeatChoiceSelections: {"Skilled Options": [3374, 3373, 3372]}`). Після створення:
```
select * from pers_skill where pers_id=16      → лише ATHLETICS, INTIMIDATION
select * from "_ChoiceOptionToPers" where "B"=16 → лише {A: 3384} (бойовий стиль Оборона)
```
На листі Виживання +1, Уважність +1, Медицина +1 — тобто без бонусу майстерності
(мало бути +3). Скріншот `P1-human-fighter-19-sheet-lvl1.png`.

Чи це наслідок знахідки 01 — не доведено (у персонажа 6 немає Skilled, порівняти нема з чим),
але вибір гравця точно губиться між формою і базою.

---

## P1-human-fighter-08 (P1) — бойовий стиль «Оборона» не додає +1 до КБ

**Правило:** `data/2024/srd/feats.md:91-95` — Defense: «While you're wearing Light, Medium, or
Heavy armor, you gain a +1 bonus to Armor Class.»

**Має бути:** Кольчуга 16 + Оборона 1 = **17**.
**Є:** лист показує «КЛАС БРОНІ 16», в блоці обладунку «Кольчуга … БАЗ. КБ 16».
Фіча в базі не несе модифікатора:
```
select feature_id, eng_name, modifies_ac from feature where feature_id = 49282
→ { "Fighting Style: Defense (2024)", modifies_ac: null }
```
Персонаж носить кольчугу (`pers_armor` armor_id 357, equipped=true), фічу отримав
(`pers_feature` 107) — не спрацьовує саме числовий ефект. Це дефект даних, не редакції.

---

## P1-human-fighter-09 (P1) — «Друге дихання» без лічильника застосувань

**Правило:** `data/2024/srd/classes.md`, таблиця Fighter Features, колонка Second Wind: на 1–3
рівнях — **2**; текст: «You can use this feature twice… regain one on a Short Rest, all on a Long Rest.»

**Є:** `select uses_count, uses_count_special, limited_uses_per from feature where feature_id=48906`
→ `Fighter: Second Wind (2024)`: `uses_count: null, uses_count_special: null, limited_uses_per: null`.
`pers_feature.uses_remaining = null`. На листі картка «Друге дихання» без «2 з 2» і без кнопки
витрати (`P1-human-fighter-19-sheet-lvl1.png`). Ресурс не відстежується — гравець не має де
відзначити використання.
`select * from pers_resource_pool where pers_id=16` — порожньо.

---

## P1-human-fighter-10 (P2) — Людина не може обрати розмір (Середній/Малий)

**Правило:** `data/2024/srd/character-origins.md:298` — Human, «**Size:** Medium (about 4–7 feet
tall) **or Small** (about 2–4 feet tall), **chosen when you select this species**».

**Є:** дані розмір знають — `data/2024/normalized/species.json` Human `size: ["MEDIUM","SMALL"]`,
`creator-content-2024.json` `HUMAN_2024.size: ["MEDIUM","SMALL"]` — але кроку вибору немає
(після Людини йде одразу «Опції раси» з рисою походження, `P1-human-fighter-03-after-race.png`),
і `pers.size` (колонка є, `prisma/schema.prisma:303`) ніде не пишеться:
`grep -rn "size" src/lib/components/characterCreator/*.tsx` дає лише `window.resize`.
`select size from pers where pers_id=16 → null`.

---

## P1-human-fighter-11 (P2) — «Умілець» пропонує лише навички, інструментів немає

**Правило:** `data/2024/srd/feats.md:55` — «proficiency in any combination of three skills
**or tools** of your choice».

**Є:** група «Skilled Options» містить рівно 18 навичок і жодного інструмента
(`P1-human-fighter-05-skilled-choices.png`). Гравець, який хоче Злодійські інструменти чи
Ковальські знаряддя від Skilled, це зробити не може.

---

## P1-human-fighter-12 (P2) — майстер підвищення показує «КЛАС #343» замість назви класу

**Є:** на кроці «Оберіть клас, який отримує +1 рівень» картка підписана
**«КЛАС #343 / Рівень класу: 1 / ОСНОВНИЙ КЛАС»** (`P1-human-fighter-lvlup-16-a.png`) —
сирий `classId` у обличчя гравцеві. Мало бути «Воїн».

---

## P1-human-fighter-13 (P3) — усі походження 2024 названі «Солдат 2024» / «Soldier 2024»

**Є:** `src/lib/refs/translation.ts:771` `SOLDIER_2024: "Солдат 2024"`, `:864`
`SOLDIER_2024: "Soldier 2024"`; так само `ARTISAN_2024: "Ремісник 2024"` і решта 15.
Суфікс редакції став частиною **назви** і видно його всюди: у списку походжень
(`P1-human-fighter-10-background.png`), на кроці характеристик («Бонуси походження «Солдат 2024»»)
і на листі персонажа («ПЕРЕДІСТОРІЯ Солдат 2024»).
Непослідовно: `ACOLYTE` (перевикористаний запис 2014) показується як «Послушник» без суфікса —
у тому ж списку. Види й класи суфікса не мають («Людина», «Воїн»).
Дзеркало в `src/lib/refs/dictionary.json:3837` те саме.

---

## P1-human-fighter-14 (P3) — сирий англійський ключ «Skilled Options» у назві групи вибору

**Є:** крок «Опції риси виду» → заголовок групи **«Skilled Options»** (`ГРУПА / Skilled Options /
Оберіть 3`), скріншот `P1-human-fighter-05-skilled-choices.png`. Решта інтерфейсу українською.

---

## P1-human-fighter-15 (P3) — картка риси «Умілець» не каже, що риса дає

**Є:** у списку рис походження картка «Умілець» показує лише
«**Повторюваність** — Ви можете обирати цю рису більше одного разу», тобто примітку про
повторюваність замість самої переваги. Дані такі самі:
`data/2024/normalized/feats.json`, Skilled → `benefits: [{ name: "Повторюваність", ... }]`,
`plainDescriptionEng: null`. Гравець обирає рису, не знаючи, що вона робить
(`P1-human-fighter-03-after-race.png`). Порівняй: «Жорстокий нападник» поруч має повний текст.

---

## P1-human-fighter-16 (P3) — володіння Солдата «Набір для гри (на вибір)» не обирається

**Правило:** `data/2024/srd/character-origins.md:61` — «**Tool Proficiency:** _Choose one kind of_
Gaming Set».
**Є:** `creator-content-2024.json` `SOLDIER_2024.toolProficiencies: ["GAMING_SET"]`, без
`toolToChooseCount`; кроку вибору набору немає; на листі володіння записане як «Ігровий набір»
(`pers.custom_proficiencies`), у спорядженні предмет «Набір для гри (на вибір)».

---

## P1-human-fighter-17 (P3) — 2014-термінологія й 2014-опція в конструкторі 2024

Дві дрібниці на тому самому екрані:
- крок називається «**Раса**» / «Опції раси», хоча PHB 2024 і `data/2024/srd/character-origins.md`
  оперують поняттям **вид** (species);
- крок «Навички» пропонує тумблер «**Правила Таші**» з підписом «🌟 Режим Таші: всі навички від
  раси, підраси та передісторії тепер доступні для вільного вибору»
  (`P1-human-fighter-14b-skills-tasha.png`) — необовʼязкове правило TCoE 2014 у конструкторі 2024.

---

# Перевірено й правильно

- **Заборона неможливого вибору характеристик.** Крок «Бонуси походження» для Солдата пропонує
  рівно Силу, Спритність, Статуру (`abilityOptions: ["STR","DEX","CON"]`), обидва режими
  («+2 і +1», «+1 до всіх трьох»). Мудрості в списку немає — ворожий сценарій «+2 до WIS»
  недосяжний. `P1-human-fighter-12-asi.png`.
- **Ліміт 3 у «Умілець».** Четвертий клік не змінює чернетку:
  після трьох `[3374,3373,3372]`, після четвертого — те саме.
- **Ліміт 3 у майстерності зброї.** Заголовок «Обрано 0 з 3»; після трьох виборів четверта
  картка **disabled** (Playwright: «element is not enabled» 60 разів поспіль).
- **Підкласу на 1-му рівні немає** — крок `subclass` не зʼявляється; `subclassLevel: 3` у даних
  класу. Відповідає `classes.md` (Fighter Subclass — level 3).
- **Список бойових стилів** — 10 позицій (Бій наосліп, Оборона, Стрільба з лука, Дуель,
  Бій великою зброєю, Перехоплення, Захист, Бій метальною зброєю, Бій двома зброями,
  Рукопашний бій), збігається з набором Fighting Style feats PHB 2024.
- **Стартове спорядження** збігається з `classes.md` посимвольно: A — Кольчуга, Дворучний меч,
  Бойовий ціп, Метальний спис x8, Підземний набір, 4 зм; B — Проклепаний шкіряний, Шабля,
  Короткий меч, Довгий лук, Стріли x20, Сагайдак, Підземний набір, 11 зм; C — 155 зм.
  Пакунок Солдата й альтернатива 50 зм — теж за книгою.
- **Гроші:** 4 зм (клас, варіант A) + 14 зм (пакунок Солдата) = `gp: 18`. Правильно.
- **Мови:** «Ви можете обрати ще 2 з 2 мов», збережено «Загальна / Дворфська / Оркська» —
  Common + 2 за `character-origins.md`.
- **Похідні числа листа** (у межах тих характеристик, що збереглися): HP 12 = 10 + мод. Статури 2;
  Хіт Дайси 1/1 d10; Майстерність +2; Ініціатива +1 = мод. Спритності; РятК Сили +4 і Статури +4
  (володіння є, решта без бонусу) — усе правильно для `str 15 / con 14`.
- **Володіння з класу й походження** у `custom_proficiencies`: «Легкі обладунки, Середні
  обладунки, Важкі обладунки, Щит / Ігровий набір / Проста зброя, Бойова зброя» — збігається з
  Core Fighter Traits.
- **Властивості майстерності в списку зброї** правильні за PHB 2024: Дворучний меч — Черкання
  (Graze), Бойовий ціп — Виснаження (Sap), Дротик — Знервування (Vex), Шабля — Кидок (Nick),
  Велика сокира — Розмах (Cleave), Довгий спис — Повалення (Topple).
- **Риси на листі присутні всі, з правильними джерелами:** Бойовий стиль / Друге дихання /
  Майстерність зброї (КЛАС), Винахідливість / Вправність / Універсальність (РАСА),
  Жорстокий нападник (РИСА), Оборона й Риса походження: Умілець (ВИБІР).
- **Жодної помилки в консолі** за весь прохід конструктора (12 кроків), створення й відкриття
  листа: `console.error` і `pageerror` — порожні.

# Що не перевірено

Рівні 2–6 (Action Surge + Tactical Mind, підклас Майстер бойових мистецтв із 3 маневрами і
4 кубиками к8 + Student of War, риса Great Weapon Master замість ASI, Extra Attack + Tactical
Shift, PB +3, ASI +2 Сили) — **заблоковано знахідкою 02**. Друк, копія, шеринг, відпочинок —
не перевірялися (поза лінзою й поза часом).
