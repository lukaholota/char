# L04 — класові риси 2024 (рівні 1–20, 12 класів + ARTIFICER_2024)

Оракул: `data/2024/srd/classes.md` (таблиці «<Class> Features» + прозові розділи «#### Level N: …»)
і `data/2024/normalized/classes.json`. База — `spells_test`.

Робочі файли: `scratchpad/audit/work/L04-class-features/`
- `parse-srd.mjs` → `srd-tables.json` — усі 12 таблиць рівнів із SRD, розібрані в JSON;
- `q.mjs` — запити до `spells_test` (читає URL із `.env.test`);
- `cf-2024.json` — повний дамп `class_feature` × `feature` для RULES_2024;
- `artificer.test.ts` + `artificer.out.json` — Винахідник 2024 крізь справжні серверні дії до 4-го рівня;
- `build-to-six.out.json` — Воїн / Клірик / Чарівник, знімок після кожного рівня 1→6;
- `vitest.l04.mts` — конфіг прогону (файли лежать поза репо, тому `next/cache` аляситься явно).

Прогін: `node_modules/.bin/vitest run --root <репо> --config <…>/vitest.l04.mts --disable-console-intercept`

---

## Знахідки

### L04-class-features-01 — P1 — жодна класова риса 2024 не несе чисел; ресурсів класу не існує

**Правило.** SRD дає числову колонку майже кожному класу: Barbarian «Rages 2/3/4/5/6», Fighter
«Second Wind 2/3/4», Cleric «Channel Divinity —/2/3/4», Monk «Martial Arts 1d6→1d12», «Focus Points
2…20», «Unarmored Movement +10…+30 ft.», Rogue «Sneak Attack 1d6→10d6», Bard «Bardic Die D6→D12»,
Sorcerer «Sorcery Points 2…20», Druid «Wild Shape 2/3/4», Ranger «Favored Enemy 2…6», Warlock
«Eldritch Invocations 1…10».

**Доказ (SQL, spells_test).**

```sql
select c.ruleset, cf.mechanic_type, count(*), count(cf.mechanic_metadata) as with_meta
from class_feature cf join class c on c.class_id=cf.class_id group by 1,2;
```
```
RULES_2014  CHOICE_ASI       11   10
RULES_2014  CHOICE_SPECIFIC   3    3
RULES_2014  CHOICE_SPELLS     1    1
RULES_2014  CHOICE_SUBCLASS   6    5
RULES_2014  PASSIVE         124    3
RULES_2024  PASSIVE         187    0      ← усі 187, жодного metadata
```

```sql
select f.eng_name from feature f
 join class_feature cf on cf.feature_id=f.feature_id
 join class c on c.class_id=cf.class_id
where c.ruleset='RULES_2024'
  and (f.uses_count is not null or f.uses_count_special is not null
       or f.uses_pool_key is not null or f.unarmed_damage is not null
       or f.invocations_count is not null or f.skill_expertises is not null);
```
→ **0 рядків.**

Той самий запит для `RULES_2014` дає 31 рядок із заповненими числами, зокрема
`Rage → [{"lvl":1,"uses":2},{"lvl":3,"uses":3},{"lvl":6,"uses":4},{"lvl":12,"uses":5},{"lvl":17,"uses":6},{"lvl":20,"uses":"UNLIMITED"}]`,
`Ki → {"equalsToClassLevel":true}, pool KI`, `Lay on Hands → {"type":"FORMULA","group":"LEVEL_BASED","operation":"MULTIPLY","multiplier":5}`,
`Channel Divinity (Cleric) → [{"lvl":2,"uses":1},{"lvl":6,"uses":2},{"lvl":18,"uses":3}], pool CHANNEL_DIVINITY`.
Тобто система (`src/lib/logic/feature-resources.ts` → `calculateMaxUsesForFeature`,
`src/rules/resource-pools.ts` → `findPoolProvider`, `PersResourcePool`) існує й працює — її просто
нічим годувати в 2024.

**Доказ (програмна збірка).** `build-to-six.out.json`: Воїн-Драконороджений 1→6, Клірик-Дворф 1→6,
Чарівник-Ельф 1→6, усі через справжні `createCharacter` / `levelUpCharacter`.
На **кожному** рівні `pers_resource_pool` порожній (`pools=[]`). Єдина риса з `usesCount` на
6-му рівні в усіх трьох — `Magic Initiate: Wizard list (2024)` (це риса, не класова фіча).
Воїн 6-го рівня має «Fighter: Second Wind (2024)» з `usesCount=null, limitedUsesPer=null`; за книгою
це 3 використання, які повертаються за короткий відпочинок.

**Джерело даних теж порожнє:** `data/2024/normalized/classes.json` — у кожної риси лише ключі
`{level, name, descriptionEng, displayOrder}`. Числа є тільки в `weaponMasteryProgression`
на рівні класу; колонок Rages / Focus Points / Sneak Attack / Martial Arts у нормалізованих
даних немає взагалі.

**Наслідок.** Гравець 2024 не має жодного лічильника ресурсу на листі: Лють, Другий подих,
Порив дій, Божественний канал, Накладання рук, Очки фокусу, Очки чаклунства, Натхнення барда,
Дика форма, Арканне відновлення, Незламність, Містичний Арканум — усе проза. Кубик Підступної
атаки і кубик Бойових мистецтв ніде не число, тож ані лист, ані друк не можуть їх показати.
Це не одна риса — це весь клас ресурсів для всієї редакції.

**Fix hint.** Наповнити `feature.uses_count_special` / `uses_pool_key` / `unarmed_damage` у
`prisma/seed/**` з таблиць SRD (за Р33 — правити файл-джерело, тобто спершу
`data/2024/normalized/classes.json`, додавши поля на кшталт `usesByLevel`, `poolKey`, `dieByLevel`).
Кубики (Sneak Attack, Martial Arts, Bardic Die) чинна схема не тримає — для них потрібна нова
колонка або `mechanic_metadata` (це вже L).

---

### L04-class-features-02 — P1 — Експертизи в 2024 немає: ні другого гранту, ні вибору навичок

**Правило.** Rogue L1: «You gain Expertise in two of your skill proficiencies of your choice…
**At Rogue level 6, you gain Expertise in two more**» (`classes.md:7033–7037`); таблиця Rogue
ставить «Expertise» і в рядок 6. Bard L2: «…**At Bard level 9, you gain Expertise in two more**»
(`classes.md:888–892`). Ranger L2 Deft Explorer: «_Expertise._ Choose one of your skill
proficiencies…» (`classes.md:6427–6431`); Ranger L9 Expertise: «Choose two…» (`classes.md:6457–6459`).

**Доказ.**

```sql
select c.ruleset, f.eng_name, f.skill_expertises
from feature f join class_feature cf on cf.feature_id=f.feature_id
     join class c on c.class_id=cf.class_id
where f.eng_name ilike '%expertise%' or f.eng_name ilike '%deft explorer%';
```
```
RULES_2014  Expertise                        {"count":2,"chooseFromCurrentProficiencies":true}
RULES_2014  Expertise 2                      {"count":2,"chooseFromCurrentProficiencies":true}
RULES_2014  Expertise (Bard)                 {"count":2,"chooseFromCurrentProficiencies":true}
RULES_2014  Expertise (Bard) 2               {"count":2,"chooseFromCurrentProficiencies":true}
RULES_2024  Bard: Expertise (2024)           null
RULES_2024  Ranger: Deft Explorer (2024)     null
RULES_2024  Ranger: Expertise (2024)         null
RULES_2024  Rogue: Expertise (2024)          null
```

Рівні (з `cf-2024.json`): `Rogue: Expertise (2024)` — тільки L1; `Bard: Expertise (2024)` — тільки L2.
Рядків на L6 (розбійник) і L9 (бард) немає взагалі.

**Чому це ламає UI.** `src/lib/components/levelUp/LevelUpWizard.tsx:506–530` вмикає крок
«Експертиза» рівно тоді, коли `feature.skillExpertises` має `count > 0` /
`chooseFromCurrentProficiencies` / `options`. Оскільки всі 2024-значення `null`, крок не зʼявляється
ніколи — ні при створенні розбійника 1-го рівня, ні при підвищенні.

**Наслідок.** Розбійник 2024 не має експертизи взагалі (за книгою — 2 навички на 1-му і ще 2 на 6-му),
бард — 2 на 2-му і 2 на 9-му, мисливець — 1 на 2-му і 2 на 9-му. Це прямий числовий недолік:
бонус майстерності на цих навичках подвоєний не буде.

---

### L04-class-features-03 — P1 — Метамагія: рядок лише на 2-му рівні, а опцій метамагії для 2024 немає жодної

**Правило.** Таблиця Sorcerer ставить «Metamagic» у рядки **2, 10, 17**. Текст L2: обираєш 2 опції;
на 10 і 17 — ще по 2. `classes.md:7722` «### Metamagic Options» перелічує **10** опцій: Careful,
Distant, Empowered, Extended, Heightened, Quickened, Seeking, Subtle, Transmuted, Twinned Spell.

**Доказ.**
- `cf-2024.json`: `Sorcerer: Metamagic (2024)` існує рівно один раз, `level_granted = 2`.
- ```sql
  select ruleset, count(*) from choice_option
  where group_name ilike '%метамаг%' or option_name ilike '%метамаг%' group by 1;
  ```
  → `RULES_2014 | 10`. Для `RULES_2024` — **порожньо**.
- Усі `class_choice_option` для 2024 (єдиний запит по всіх класах):
  ```
  FIGHTER_2024  {1}                    10  Бойовий стиль
  PALADIN_2024  {2}                    10  Бойовий стиль
  RANGER_2024   {2}                    10  Бойовий стиль
  WARLOCK_2024  {1,2,5,7,9,12,15,18}   31  Потойбічні виклики
  ```
  Груп метамагії немає.

**Наслідок.** Чародій 2024 отримує пасивний текст «Метамагія» і жодного вибору — ні на 2-му, ні на
10-му, ні на 17-му. У 2014 та сама механіка працює (10 опцій + `class_optional_feature`).

---

### L04-class-features-04 — P1 — Warlock: Містичний Арканум лише на 11-му, немає 13/15/17

**Правило.** Таблиця Warlock: L11 «Mystic Arcanum (level 6 spell)», L13 (7), L15 (8), L17 (9).

**Доказ.** `cf-2024.json` → у WARLOCK_2024 єдиний рядок `Warlock: Mystic Arcanum (2024)`,
`level_granted = 11`. У 2014 те саме зроблено правильно — чотири окремі фічі
`Mystic Arcanum (6th level)…(9th level)`, кожна з `uses_count = 1, LONG_REST`.

**Наслідок.** Чорнокнижник 2024 з 13-го рівня втрачає по одному закляттю 7/8/9 кола, тобто три
найсильніші ефекти класу.

---

### L04-class-features-05 — P1 — Fighter: 13-й і 17-й рівні недодають риси (Indomitable / Action Surge)

**Правило.** Таблиця Fighter: L2 «Action Surge (one use)», L9 «Indomitable (one use), Tactical
Master», L13 «Indomitable (two uses), Studied Attacks», L17 «Action Surge (two uses), Indomitable
(three uses)».

**Доказ.** `cf-2024.json`, FIGHTER_2024: `Action Surge` тільки L2, `Indomitable` тільки L9.
На L13 у базі є **лише** `Studied Attacks`; на **L17 — жодного рядка**. Тобто воїн 17-го рівня
не отримує нічого, крім підкласової риси.

**Чому так вийшло.** `prisma/schema.prisma:170` — `ClassFeature @@unique([classId, featureId])`,
тому та сама фіча не може бути видана двічі. У варвара цей самий випадок обійшли двома окремими
записами — `Barbarian: Improved Brutal Strike L13 (2024)` і `… L17 (2024)` (обидва є в базі).
Той самий прийом просто не застосували до воїна, чародія і чорнокнижника.

**Fix hint.** Або окремі фічі з суфіксом рівня (як у варвара), або справжні числа використань
(знахідка -01), що зняло б потребу в повторному гранті для Indomitable / Action Surge.

---

### L04-class-features-06 — P1 — Divine Order (клірик) і Primal Order (друїд) подані без вибору, разом із володіннями, які він дає

**Правило.** `classes.md:2205–2211`: «#### Level 1: Divine Order — You have dedicated yourself to one
of the following sacred roles **of your choice**. _Protector._ …you gain proficiency with Martial
weapons and training with **Heavy armor**. _Thaumaturge._ You know one extra cantrip from the Cleric
spell list… bonus to your Intelligence (Arcana or Religion) checks… equals your Wisdom modifier».
`classes.md:3521–3527`: те саме для друїда — _Magician_ (зайвий замовляння + бонус до Arcana/Nature)
проти _Warden_ (військова зброя + **середній обладунок**).

**Доказ.**
- `class_choice_option` для CLERIC_2024 і DRUID_2024 — **0 рядків** (див. вивід у знахідці -03).
- `Cleric: Divine Order (2024)` і `Druid: Primal Order (2024)` — `mechanic_type=PASSIVE`,
  `mechanic_metadata=null`, `armor_proficiencies='{}'`, `weapon_proficiencies=null`,
  `skill_proficiencies=null`.
- `build-to-six.out.json`, клірик 1-го рівня: серед фіч є рівно `Cleric: Divine Order (2024)`,
  жодної гілки Protector/Thaumaturge; крок вибору в конструкторі не показувався.

**Наслідок.** Клірик-Protector 2024 не отримує ані військової зброї, ані **важкого обладунку** —
похідний КЗ і атаки будуть неправильні; клірик-Thaumaturge не отримує зайвого замовляння.
Те саме для друїда (середній обладунок і військова зброя у Warden). Вибір гравця, який книга
називає «of your choice», у застосунку не існує.

---

### L04-class-features-07 — P1 — Barbarian Primal Knowledge (L3) не дає навички

**Правило.** `classes.md:280–282`: «#### Level 3: Primal Knowledge — You gain proficiency in another
skill of your choice from the skill list available to Barbarians at level 1.»

**Доказ.** `Barbarian: Primal Knowledge (2024)`: `skill_proficiencies = null`,
`mechanic_type = PASSIVE`, `mechanic_metadata = null`; `class_choice_option` для BARBARIAN_2024
немає жодного. Варвар 3-го рівня отримує текст і не отримує навички.

---

### L04-class-features-08 — P1 — ARTIFICER_2024: клас із нуля підкласів проходить 3-й рівень без підкласу і мовчки лишається без нього назавжди

**Стан даних.**
```sql
select c.class_id, c.eng_name, c.subclass_level,
       (select count(*) from class_feature cf where cf.class_id=c.class_id) as feats,
       (select count(*) from subclass s where s.class_id=c.class_id) as subs
from class c where c.ruleset='RULES_2024';
```
→ `351 | ARTIFICER_2024 | subclass_level=3 | feats=13 | subs=0` (усі інші 12 класів мають 4 підкласи).

Клас **не прихований**: він є в `src/lib/generated/creator-content-2024.json`
(`ARTIFICER_2024 | subclasses=0 | features=13 | choiceOpts=0`), а `findCharacterCreationOptions`
(`src/lib/content/creator-content.ts:39–60`) не фільтрує класи взагалі; каталог теж його показує —
`src/lib/classesData.ts:57–62` навіть має гілку `findClassSource` → `"EFA"` для нього.
`data/2024/normalized/classes.json` позначає його `isPhbCore: false`,
`source: "EBERRON_FORGE_OF_THE_ARTIFICER_2024_UNOFFICIAL"` з нотаткою «Клас не входить у core
PHB 2024… 2024-оновлення Артифайсера ще не випущене окремою книгою.»

**Репро (програмно, справжні серверні дії).** `artificer.test.ts` → `artificer.out.json`:

```
created: persId=1, error=null            ← Винахідника 2024 створено без жодної помилки
L2: error=null, level=2, subclassId=null
L3: error=null, level=3, subclassId=null  ← отримав «Artificer: Artificer Subclass (2024)»
                                             як звичайну пасивну фічу, підкласу не обрав
L4: error=null, level=4, subclassId=null
```

`needsSubclassSelection` для 2024 (`src/rules/strategies/rules2024.ts:16–18`) повертає `true` на
3-му рівні, але сервер (`src/server/db/levelup-persistence.ts`) на відсутність `subclassId` не
скаржиться, а список підкласів порожній — обрати нічого. Персонаж застрягає без підкласу назавжди
і надалі не отримає жодної підкласової риси.

**Додатково до того самого класу:** `skill_proficiencies = null` і `tool_proficiencies = '{}'`
(`artificer.out.json → classInfo`) — Винахідник не обирає ані навичок, ані інструментів, хоча
інструменти — стрижень класу.

**Fix hint.** Або прибрати ARTIFICER_2024 з `getAllClasses`/creator-content до появи підкласів
(і залишити його лише як контент каталогу з поміткою), або засіяти чотири підкласи; у будь-якому
разі — не дати `levelUpCharacter` пройти рівень підкласу з `subclassId = null`.

---

## Перевірено й правильно

- **Рівні рис за таблицями SRD зійшлися рядок у рядок для всіх 12 класів**, крім перелічених вище.
  Програмна звірка: `srd-tables.json` × `cf-2024.json` (скрипт у звіті вище). Кількість рис у базі
  збігається з кількістю унікальних назв у SRD: Barbarian 20 (19 + розщеплений Improved Brutal
  Strike), Bard 12, Cleric 11, Druid 13, Fighter 15, Monk 22, Paladin 17, Ranger 17, Rogue 18,
  Sorcerer 10, Warlock 9, Wizard 10.
- **Epic Boon стоїть на 19-му в усіх 12 класах** (`epic_boon_level = 19`, і окремий рядок
  `<Class>: Epic Boon (2024)` на L19). `rules2024Strategy.isAbilityScoreIncreaseLevel` явно
  виключає рівень Epic Boon із ASI — правильно.
- **Підклас на 3-му рівні в усіх класах** (`subclass_level = 3`), як і вимагає 2024.
- **ASI-рівні правильні й механічно працюють**: `{4,8,12,16}` у всіх, `{4,6,8,12,14,16}` у воїна,
  `{4,8,10,12,16}` у розбійника. Перевірено збіркою: воїн на 6-му справді підняв CON 14 → 16
  (`build-to-six.out.json`). Окремого рядка «Ability Score Improvement» на 6/8/12/… немає через
  `@@unique(classId, featureId)`, але це косметика — механіка йде з `ability_score_up_levels`.
- **Weapon Mastery за рівнями правильна.** `class.weapon_mastery_progression`:
  варвар `2,2,2,3,3,3,3,3,3,4,4,…` ✓ (SRD 2/3/4), воїн `3,3,3,4,4,4,4,4,4,5,…,6` ✓,
  паладин/мисливець/розбійник — рівні 2 ✓ (у їхніх таблицях колонки Weapon Mastery немає, текст
  каже «two kinds of weapons»: `classes.md:5647`, `6422`, `7051`).
- **Потойбічні виклики чорнокнижника — рівні правильні.** `class_choice_option.levels_granted =
  {1,2,5,7,9,12,15,18}` — рівно ті рівні, де таблиця Warlock збільшує кількість (1→3→5→6→7→8→9→10),
  31 опція.
- **Бойовий стиль на правильних рівнях**: воїн 1, паладин 2, мисливець 2 — по 10 опцій кожному.
- **Риси попередніх рівнів не губляться.** Знімки 1→6 для трьох класів: жодного `LOST` — набір
  `pers_feature` тільки росте (воїн 9→11→14→15→18→18, клірик 6→7→11→12→13→14,
  чарівник 10→11→14→15→16→17).
- **Дублювання фіч немає.** `featuresToAdd` у `src/server/db/levelup-persistence.ts:720` — `Set`,
  а `featureIdsToCreate` (рядок 1080) відсіює вже наявні `pers_feature`; у знімках жодна назва не
  повторюється.
- **Підкласові риси приходять на правильних рівнях:** Champion 3 (Improved Critical + Remarkable
  Athlete), Life Domain 3 (Disciple of Life, Preserve Life, Life Domain Spells) і 6 (Blessed Healer),
  Evoker 3 (Evocation Savant, Potent Cantrip) і 6 (Sculpt Spells) — збігається з SRD.
- **Рівень класу, а не персонажа**, керує видачею класових рис при підвищенні
  (`levelup-persistence.ts:725` — `cf.levelGranted === classLevelAfter`), і майстер рахує так само
  (`LevelUpWizard.tsx:660–665`). Серверне `newClassFeatures` у `loadLevelUpBaseContent:89` рахує за
  рівнем **персонажа**, але клієнт його не використовує — мертвий обчислювальний шлях, не баг.

## Не перевірено

- Рівні 7–20 програмно не пройдені (збірки доведено до 6-го). Розбіжності на 9–20 доведені
  запитами до даних, а не проходом персонажа.
- Як саме лист персонажа малює фічу без `usesCount` (є там кнопка-лічильник чи ні) — не знімав
  у браузері; доказ обмежений порожнім `pers_resource_pool` і `usesRemaining = null`.
- Підкласові риси на 7–20 рівнях (лінза L05).
- Monk «Monk's Focus», Rogue «Cunning Strike», Cleric «Channel Divinity» як набори ефектів —
  дивився лише наявність рядка фічі, не наявність кожного підефекту.
