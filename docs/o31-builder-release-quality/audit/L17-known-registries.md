# L17 — повторний аудит реєстрів дефектів

Мітка: `L17-known-registries`. Дата: 2026-09-04. База: `spells_test` (читання через `node`+`pg`;
`psql` заблокований). Програмні збірки — власний vitest-конфіг у
`scratchpad/audit/work/L17-known-registries/vitest.audit.mts` (файли тестів у тій самій теці,
у репозиторій нічого не писано).

Перевірено: `docs/KNOWN-BUGS.md` — BUG-001…013, «Б: раси без тексту», «Гідратація навбара»;
`docs/o21-user-signals/defects.md` — D-001…D-003; знімок `inbox/sentry-issues.json` (29 issue).

---

## Підсумок одним рядком

| Запис | Стан на 2026-09-04 |
|---|---|
| BUG-001…003 | прийнято власником, поведінка та сама — не чіпав |
| BUG-004 | **відтворюється**, 30 рис / 80 мертвих рядків у 2014; 2024 чистий |
| BUG-005 | **відтворюється**, 5 дубльованих рядків стихій, ефекту немає |
| BUG-006 | **відтворюється у 2014**; 2024 закрито KR27.2 |
| BUG-007 | **відтворюється**, 50 із 66 вливань недосяжні |
| BUG-008 | **половина виправлення**: гейт зʼявився, але 2014 його майже не бачить |
| BUG-009 | **відтворюється** (симптом упіймано побіжно під час перевірки BUG-008) |
| BUG-010 | **відтворюється, і воно сліпе до редакції** — 2024 мультиклас теж |
| BUG-011 | ✅ виправлення тримається, п’ять споживачів на місці |
| BUG-012 | **відтворюється**, рядки зʼїхали 261→273 |
| BUG-013 | **відтворюється** (доведено запуском) |
| Гідратація навбара | ✅ причини більше немає — механізм замінено |
| Б: раси без тексту | **відтворюється**, і ширше, ніж записано |
| D-001 | ✅ тримається в `spells_test` і в сідах |
| D-002 | 🟡 як і записано: клієнт закритий, сервер ні |
| D-003 | ✅ тримається |
| Sentry-знімок | 1 із «живих» родин закрито (PISTOL), решта на місці |

---

## Знахідки

### L17-known-registries-01 — BUG-010 живий і не знає про редакції: 2024-мультиклас дістає слоти повного кастера

**Правило (2024).** `data/2024/srd/character-creation.md:937-942`:
«_Spell Slots_. You determine your available spell slots by adding together the following: All
your levels in the Bard, Cleric, Druid, Sorcerer, and Wizard classes; Half your levels (round up)
in the Paladin and Ranger classes. Then look up this total level in the Level column of the
Multiclass Spellcaster table.» Воїн у цьому додаванні не бере участі взагалі.

**Де.** `src/server/db/rest-actions.ts:369` — `const maxSpellSlots = getMaxSpellSlots(pers.level);`
`pers.level` — загальний рівень персонажа. `calculateCasterLevel` тут же рахується (рядок 385),
але його результат іде **лише** в пактові слоти (`caster.pactLevel`, рядок 386). Гілки за
`pers.ruleset` немає ніде у файлі.

**Доказ — програмна збірка** (`scratchpad/audit/work/L17-known-registries/repro.test.ts`,
2 з 2 зелені):

```
FIGHTER_2024 lvl5 after longRest: {"level":5,"ruleset":"RULES_2024",
  "currentSpellSlots":[4,3,2,0,0,0,0,0,0], ...}
F3/W2 2024 after longRest:       {"level":5,"ruleset":"RULES_2024",
  "currentSpellSlots":[4,3,2,0,0,0,0,0,0], ...}
```

Перший — Воїн 2024 5 рівня, некастер: має бути `[0,0,…]`, отримує слоти повного кастера 5 рівня.
Другий — Воїн 3 / Чарівник 2 2024: сумарний рівень кастера = 2, книга дає `[3,0,…]`, персонаж
отримує `[4,3,2,…]` — **два слоти 3 кола, яких у нього не може бути в принципі**.

Golden 2014 підтверджує те саме давніше (`tests/golden/derived-state/rest-and-slots.json`):
паладин 6 (caster level 3) → `[4,3,3,…]`; мультиклас Паладин 2/Чарівник 3/Лицар-містик 3
(caster level 5) → `[4,3,3,2,…]` замість `[4,3,2,…]`.

**Відтворення.** `bunx vitest run --config scratchpad/audit/work/L17-known-registries/vitest.audit.mts`
з `include` на `repro.test.ts`.

**Чому це критично саме зараз.** Реліз 2024 — це реліз мультикласу; `docs/o27-multiclass-2024/`
вимірював саме розбіжності мультикласу, а тривалий відпочинок цю роботу знецінює щоранку.
Правильні числа рахує `calculateCasterLevel`, який тут уже викликано, — бракує одного аргументу.

**Полагодити.** `getMaxSpellSlots(caster.casterLevel)` замість `pers.level`, з нулем для
`casterLevel === 0`; порядок викликів переставити так, щоб `persForSlots` читався до розрахунку.
Пін — розширити `tests/golden/derived-state/rest-and-slots.json`, знявши `KNOWN_BUG: BUG-010`.

---

### L17-known-registries-02 — BUG-006 у 2014 живий: мультиклас не додає жодного володіння; 2024 закрито

**Правило (2014).** `data/2014/srd/03_Characterization/Multiclassing.md:47-63` — таблиця
Multiclassing Proficiencies: Fighter «Light armor, medium armor, shields, simple weapons, martial
weapons», Rogue «Light armor, one skill from the class's skill list, thieves' tools» тощо.

**Де.** `src/rules/multiclass-proficiencies.ts` — таблиця називається
`MULTICLASS_PROFICIENCIES_2024` і містить лише ключі `*_2024`. Коментар у файлі (рядки 18-19)
формулює це прямо:

> «Класи 2014 тут відсутні навмисно: у 2014 своя таблиця скорочених володінь, гілка `MULTICLASS`
> сьогодні не видає нічого, і 9 394 живих персонажі цієї редакції цим KR не рухаються.»

Єдиний споживач — `src/server/db/levelup-persistence.ts:1150-1164`:
`findMulticlassProficiencies(selectedClass.name)` для `FIGHTER_2014` повертає `null`, і блок
`customProficiencyExtras` не виконується.

**Наслідок.** Чарівник, що бере рівень Воїна 2014, лишається без легких/середніх обладунків, щита
та бойової зброї — тобто без усього, заради чого цей мультиклас беруть.

**Полагодити.** Другу таблицю `MULTICLASS_PROFICIENCIES_2014` у тому самому файлі (значення —
рядок у рядок із SRD вище) і зняти `_2024` з назви `findMulticlassProficiencies`. Обсяг: один
файл + тест; ризик для наявних персонажів нульовий (нові рядки додаються лише в момент
мультикласу).

---

### L17-known-registries-03 — BUG-008 виправлено наполовину: у 2014 гейт мультикласу не спрацьовує для Воїна взагалі й ніколи не дивиться на поточний клас

**Правило (2014).** `data/2014/srd/03_Characterization/Multiclassing.md:11` — «To qualify for a
new class, you must meet the ability score prerequisites for **both your current class and your
new one**». Таблиця там же: Fighter — «Strength 13 or Dexterity 13».

**Що вже добре.** Гейт на сервері зʼявився:
`src/server/db/levelup-persistence.ts:188-197` викликає `findMulticlassEntryProblem` і повертає
помилку до будь-якого запису. Це закриває початкове формулювання BUG-008 («нуль згадок
multiclassReqs»).

**Дві дірки, обидві лише в 2014.** `src/rules/multiclass-entry.ts:50-52`:

```ts
const classesToCheck = args.ruleset === "RULES_2024"
  ? [args.newClass, ...args.currentClasses]
  : [args.newClass];
```

— для 2014 поточні класи не перевіряються, хоча книга вимагає обидві сторони. І
`readRequirement` (рядки 96-99):

```ts
if (ruleset === "RULES_2024" && reqs.choice?.length) {
  return { abilities: [...reqs.choice], needsAll: false, score };
}
return null;
```

— форма `choice` для 2014 повертає `null`, тобто вимоги немає. У базі
(`select eng_name, "multiclassReqs" from class`) єдиний клас 2014 із цією формою —
`FIGHTER_2014: {"score":13,"choice":["STR","DEX"]}`. Отже **гейт мультикласу у Воїна 2014
вимкнено повністю**, а Воїн — найпоширеніший дип у 5e.

**Доказ — програмна збірка** (`scratchpad/audit/work/L17-known-registries/mc2014.test.ts`,
зелений):

```
L17-EVIDENCE before: {"str":9,"dex":9,"level":1}
L17-EVIDENCE levelUp result: {"success":true} after: {"level":2}
  multiclasses: [{"classId":1,"classLevel":1}] fighterClassId: 1
```

Чарівник 2014 із СИЛ 9 і СПР 9 узяв рівень Воїна. Проміжний прогін без вибору бойового стилю
повернув `{"error":"Дооберіть опції"}` — тобто гейт характеристик пропустив персонажа далі, а
зупинила його зовсім інша перевірка.

**Полагодити.** Прибрати обидві умови «тільки 2024» з `src/rules/multiclass-entry.ts`: для 2014
теж перевіряти `[newClass, ...currentClasses]` і теж читати `choice`. Дані вже правильні —
міняється рівно рушій. Обережно: це **посилення** перевірки для 705 живих мультикласових
персонажів, тож перед вмиканням варто порахувати, скільки з них зараз не проходять (запит по
`pers`+`pers_multiclass` проти `multiclassReqs`) — інакше вони не зможуть підвищитися далі.

---

### L17-known-registries-04 — BUG-007 живий: 50 із 66 вливань артифайсера недосяжні

**Де, сервер.** `src/server/db/levelup-persistence.ts:1283` (реєстр указував
`src/lib/actions/levelup.ts:1357-1399`; той файл нині 16 рядків — реекспорт):

```ts
if (selectedClass?.name === "ARTIFICER_2014" && classLevelAfter === 2) {
  …
  if (infusionIds.length !== 4) throw new Error("Оберіть рівно 4 вливання");
```

**Де, UI.** `src/lib/components/levelUp/LevelUpWizard.tsx:584-588`:

```ts
const needsInfusions = useMemo(() => {
  if (!selectedClass) return false;
  if (selectedClass.name !== "ARTIFICER_2014") return false;
  return classLevelAfter === 2;
}, [selectedClass, classLevelAfter]);
```

Крок «Вливання» додається лише під цією умовою (рядок 866).

**Доказ із даних репо.** `select min_artificer_level, count(*) from infusion where
ruleset='RULES_2014' group by 1`:

| `min_artificer_level` | вливань |
|---|---|
| 2 | 16 |
| 6 | 13 |
| 10 | 23 |
| 14 | 14 |

Тобто 50 із 66 вливань позначені як доступні з рівнів 6/10/14 — і жодним шляхом у застосунку не
можуть бути обрані, бо єдиний запис відбувається на 2 рівні, а серверна перевірка
`minArtificerLevel: { lte: classLevelAfter }` на рівні 2 їх ще й відфільтрує.

**2024.** Еквівалента немає: `infusion` містить рядки лише `RULES_2014` (66/66), а артифайсера в
SRD 2024 немає — див. коментар у `src/rules/multiclass-proficiencies.ts:83-85`.

**Оракул.** Точної таблиці «Infusions Known» (TCoE) у репо немає — grep по `data/`,
`prisma/seed/`, `src/` на «Infusions Known»/`infusionsKnown` порожній. Доказ вище спирається на
дані самого проєкту (`infusion.min_artificer_level`), а не на памʼять про книгу: незалежно від
точної кількості, 50 записів даних, які неможливо дістати, — дефект.

---

### L17-known-registries-05 — BUG-013 живий: тривалий відпочинок повертає всі кубики здоровʼя й персонажу 2014

**Правило (2014).** `data/2014/srd/06_Gameplay/Adventuring.md:174`: «The character also regains
spent Hit Dice, up to a number of dice equal to **half** of the character's total number of them
(minimum of one die). For example, if a character has eight Hit Dice, he or she can regain four
spent Hit Dice.» Для 2024 — `data/2024/srd/rules-glossary.md:1035`, «all spent Hit Point Dice»,
тож поточна поведінка для 2024 випадково правильна.

**Де.** `src/server/db/rest-actions.ts:296-298`:

```ts
const restoredHitDice = serializeHitDicePools(
  collectHitDicePools(pers).map((pool) => ({ ...pool, current: pool.max })),
);
```

`pers.ruleset` не читається.

**Доказ — програмна збірка** (`repro.test.ts`, зелений). Воїн 2014 8 рівня, кубики виставлено в
`{"1": 0}`, один `longRest`:

```
L17-EVIDENCE BUG-013 2014 Fighter lvl8, 0/8 hit dice, after longRest: {"1":8}
```

За книгою мало б бути 4.

**Полагодити.** Гілка за `pers.ruleset` через наявний `src/rules/strategies/`:
2014 — `min(max, current + max(1, floor(max/2)))`, 2024 — `max`. Це змінює поведінку 9 394 живих
персонажів 2014 і, як і записано в реєстрі, потребує окремого рішення власника (див.
`questions_for_owner`).

---

### L17-known-registries-06 — BUG-012 живий, рядки зʼїхали

**Де зараз.** `src/lib/components/characterCreator/FeatChoiceOptionsForm.tsx:273-322`
(`currentAbilityScores`); лейбли «X: 14 → 15» — `:996-997` і `:1109-1110`.
Реєстр указує 261-313 / 984-989 / 1097-1102 — **треба оновити реєстр**.

**Що робить код.** Для флоу створення (`pers` відсутній) стартує з `base = {STR:10,…CHA:10}` і
накладає лише значення обраної ASI-системи (`asi` / `simpleAsi` / `customAsi`). Расових бонусів
(`raceASI`/`variantASI`/`subraceASI`, гнучкий вибір Таші) немає жодної згадки — на відміну від
`buildCreationAbilityScores` у `src/rules/character-creation.ts`, яким рахує сервер.

**Той самий компонент — і 2024.** `FeatChoiceOptionsForm` імпортують `MultiStepForm.tsx` (три
місця: 736, 764, 776), `LevelUpASIForm.tsx:377` і `LevelUpWizard.tsx`. Окремої 2024-копії немає,
тож прев’ю занижене в обох редакціях (у 2024 бонуси дає походження, а не вид — але механіка
прев’ю та сама: `base 10 + ASI` без жодного кроку до).

**Примітка власника в реєстрі** (бажаний напрям — не патч гілки, а спільний компонент «обрання
характеристики») лишається чинною; сюди нічого не додаю.

---

### L17-known-registries-07 — BUG-004 живий: 30 рис, 80 мертвих рядків вибору (лише 2014)

**Запит до `spells_test`:**

```sql
select count(distinct f.feat_id) feats, count(*) dead_rows
from feat_choice_option fco
  join choice_option co on co.option_id = fco.choice_option_id
  join feat f on f.feat_id = fco.feat_id
where f.ruleset = 'RULES_2014' and co.group_name ~ '\(здібність\)$';
-- feats = 30, dead_rows = 80
```

Приклад (ATHLETE, `feat_id=2`, `RULES_2014`):

| option_id | group_name | option_name_eng | effect_kind |
|---|---|---|---|
| 2053 | Характеристика ATHLETE | ATHLETE Ability (Strength) | null |
| 2054 | Характеристика ATHLETE | ATHLETE Ability (Dexterity) | null |
| 2174 | Атлет (здібність) | ATHLETE (STR) | null |
| 2175 | Атлет (здібність) | ATHLETE (DEX) | null |

**2024 чистий.** У `feat_id=2991` (`ATHLETE`, `RULES_2024`) рівно одна група «Характеристика» з
`effect_kind='ASI'`, `effect_ability` заповнено. Крос-редакційного витоку немає — перевірено:

```sql
select count(*) from feat_choice_option fco
  join choice_option co on co.option_id = fco.choice_option_id
  join feat f on f.feat_id = fco.feat_id
where f.ruleset <> co.ruleset;   -- 0
```

(що важливо, бо `findCreatorFeats` фільтрує за `ruleset` **риси**
(`src/server/db/creator-content-query.ts:88-91`), а вкладений `featChoiceOptions` — ні, рядок 38;
захищає лише те, що рядки риси розведені по редакціях.)

Статус реєстру «відкрито як прибирання мертвих даних» лишається правильним: живих гравців це
не зачіпає, ціна — пастка для будь-якого нового коду, що читатиме `choice_option` без
UI-дедублікації.

---

### L17-known-registries-08 — BUG-005 живий: 5 мертвих рядків стихій Elemental Adept

`ELEMENTAL_ADEPT` (`feat_id=10`, 2014) має **дві** групи по пʼять стихій:
«Стихія Адепта» (option_id 1990-1994) і «Elemental Adept (тип пошкодження)» (2163-2167).
`effect_kind` у всіх десяти — `null`, тож жодна не дає структурного ефекту (опір до типів шкоди в
застосунку не змодельований — це лист персонажа, не симулятор бою).

Версія 2024 (`feat_id=3015`) натомість має правильні ASI-опції INT/WIS/CHA з `effect_kind='ASI'`.

Пріоритет — як у реєстрі: нижчий за BUG-004, це прибирання даних.

---

### L17-known-registries-09 — «Б: раси без тексту» ширша, ніж записано: у `spells_test` без рис не лише варіант людини, а й базова людина та Своя раса

**Запит:**

```sql
select r.race_id, r.name::text, r.ruleset::text
from race r
where not exists (select 1 from race_trait rt where rt.race_id = r.race_id);
-- 1485 CUSTOM_LINEAGE_TCE RULES_2014
--    4 HUMAN_2014         RULES_2014
```

```sql
select rv.name::text, count(rvt.*)
from race_variant rv left join race_variant_trait rvt using (race_variant_id)
group by 1 having count(rvt.*) = 0;
-- HUMAN_VARIANT  0     (єдиний варіант із нулем)
```

Реєстр каже: «Базову людину й Свою расу полагоджено сідом
`db/changes/2026-08-28-race-traits-custom-lineage-and-human.sql`, варіант — ні». Цей файл справді
робить `INSERT INTO race_trait (race_id, feature_id, ruleset)` (рядок 74) — але в `spells_test`
цих рядків **немає**. Тобто або правку не донесли до клона (`CLAUDE.md`: «`spells_test` —
твоя відповідальність; зелений diff схеми не доводить, що клон має зміну»), або запис у реєстрі
випереджає дійсність.

Практичний наслідок для цієї фази: **аудиторський стенд на :3100 показує людину й Свою расу без
жодної риси**, і будь-який агент, що це побачить, вважатиме за баг продукту. Плюс сама форма
правки (одноразовий SQL без сід-модуля) означає, що наступний `db-clone.sh` знову зітре її з
клона — це той самий клас пастки, що описано в [Р33](../../../docs/DECISIONS.md#р33) для
корекційних проходів.

Решта двох пунктів «Б» відтворюється буквально:
- у таблиці `race` немає стовпця опису (перелік стовпців: `ac, armor_proficiencies, asi,
  burrow_speed, climb_speed, flight_speed, languages, languages_to_choose_count, name, race_id,
  ruleset, size, skill_proficiencies, sort_order, source, speed, swim_speed, tool_proficiencies,
  tool_to_choose_count, weapon_proficiencies` — жодного `description`);
- `race_choice_option` Своєї раси (option_id 117, race_id 1485) називає варіант «Темний зір»,
  тоді як у базі 12 рядків `feature` носять «Темнозір»/«Вищий темнозір», а
  `dictionary.json:426` дає `"darkvision": "Темнозір"`. Виняток у словнику — **заклинання**
  `Darkvision` («Темний зір [Darkvision]»), це інша сутність.

---

### L17-known-registries-10 — «Гідратація навбара» більше не відтворюється: механізму, який її спричиняв, немає

`src/components/ui/EditionSwitcher.tsx:22-26` тепер вирішує не за сесією:

```tsx
const canAccess2024 = isRules2024Allowed();
if (!canAccess2024) return null;
```

а `src/rules/access.ts` — константа:

```ts
export function isRules2024Allowed(): boolean { return true; }
```

(гейт знято 2026-08-28). Розмітка на сервері й на клієнті збігається завжди, розходження
сервер/клієнт зникло разом із перевіркою акаунта. **Запис у `KNOWN-BUGS.md` застарілий і має
переїхати в «Виправлені»** — разом із «пасткою для наступної сесії» про `ENABLE_RULES_2024`.

Хвіст, який лишився: рядок 16 усе ще робить `const { data: session } = useSession();`, і `session`
ніде не використовується (grep по файлу — одне входження). Мертвий виклик, який заразом тримає
компонент підписаним на контекст сесії; прибирається одним рядком.

---

## Перевірено й правильно

**BUG-011 (пули ресурсів) — виправлення тримається.** `findPoolProviderForPers` викликають рівно
ті пʼять споживачів, які описує реєстр: `src/server/db/rest-actions.ts:227` (короткий) і `:348`
(тривалий), `src/server/db/feature-uses.ts:79` (витрата) і `:218` (ручне відновлення),
`src/server/db/wildshape-uses.ts:81`; показ на листі — `src/server/db/pers-actions.ts:995` через
чисту `findPoolProvider`. Жодного «першого-ліпшого» `Feature.findFirst` в цих шляхах не лишилося.

**D-001 (колізія `engName`) — тримається і в базі, і в сідах.**
`select eng_name, count(*) from feature group by 1 having count(*)>1` — **0 рядків**. Усі 16
розведених назв на місці й із різними текстами:

```
Psychic Blades (College of Whispers) / Psychic Blades (Soulknife)
Psionic Power (Psi Warrior)          / Psionic Power (Soulknife)
Shapechanger (Changeling)            / Shapechanger (School of Transmutation)
Child of the Sea (Sea Elf Race)      / … (Sea Elf Subrace)
Duergar Magic (Duergar Race)         / … (Duergar Subrace)
Radiant Soul (Aasimar)               / Radiant Soul (Celestial)
Stone Camouflage (Deep Gnome Race)   / … (Deep Gnome Subrace)
Cloak of Shadows (Trickery Domain)   / Cloak of Shadows (Way of Shadow)
```

Гейт `tests/content/feature-eng-names-unique.test.ts` на місці. «Хвіст» із запису (вісім колізій
— це та сама риса, задубльована між расою й підрасою) підтверджується цим самим списком і
лишається окремим питанням моделювання контенту.

**D-002 — стан рівно такий, як записано.** `src/lib/monitoring/sentry-user-sync.tsx:16-18`
робить `Sentry.setUser({ id })` / `setUser(null)`, компонент змонтовано в
`src/app/providers.tsx:17`. Серверна половина не закрита: grep `Sentry.setUser` по
`src/instrumentation.ts`, `src/sentry.server.config.ts` і `src/lib/actions/` — **0 збігів**.

**D-003 — виправлення тримається.** `src/server/db/spell-actions.ts:296-311`: `persSpell.create`
у `try/catch`, повертає `{ success: false, error: 'Не вдалося зберегти заклинання' }`.
(Файл у списку паралельної сесії — лише читав.)

**BUG-001, BUG-002, BUG-003** — прийняті власником 2026-08-13 («UI — джерело істини; створити
персонажа з недозволеним вибором краще, ніж відмовити»). Поведінка не змінилася; не чіпав.

**Схема проти бази — рознесення енумів немає.** Порівняв усі 39 енумів `pg_enum` зі
`prisma/schema.prisma` (`scratchpad/audit/work/L17-known-registries/enums.mjs`): жодного
значення, яке є в базі й відсутнє в схемі. Це прямо закриває родину Sentry
`JAVASCRIPT-NEXTJS-J` (нижче).

---

## Знімок Sentry — які з 29 issue стосуються конструктора / листа / підвищення

Класифікація KR21.1 залишається чинною; перевіряв **чи місця в коді досі ті самі**.

| Issue | Події | Маршрут | Стосується нас? | Стан місця в коді на 2026-09-04 |
|---|---|---|---|---|
| `-J` (12) | GET /char | `prisma.weapon.findMany()`: «Value 'PISTOL' not found in enum 'WeaponCategory'» | **так — лист/каталог** | **закрито**: `PISTOL` є і в базі (останнє значення енуму), і в `prisma/schema.prisma:2222`, і в `translation.ts:1135`. Клієнт Prisma у деплої відстав від бази — розходження більше немає |
| `-A` (29) + `-8` (16) | /char/:id | `setValue` на невизначеному | **так — форми creator/levelUp** | родина жива: `setValue` (react-hook-form) у 20+ файлах `characterCreator`/`levelUp`; знімок без стека (мініфікація), точного рядка немає |
| `-S` (9) + `-T` (7) + `-C` (14) | POST /page, /_not-found, /char/:id | застарілий Server Action ID через деплой | опосередковано — усі дії листа й підвищення | архітектурне, не файл; `deploy.yml` не змінювався |
| `-R` (3) | /spells | «Rendered more hooks than during the previous render» | так — каталог заклинань | `src/app/spells/spells-client.tsx` (1 510 рядків) — **файл у списку паралельної сесії (KR27.7/KR30.3), не чіпав** |
| `-7` (11) + `-P` (2) | /spells, /char | `removeChild` — вузол не дочірній | так | те саме: DOM-конфлікт у клієнті каталогу/списку |
| `-X` (6) + `-W` (1) | POST /spells | FK `pers_spell_spell_id_fkey` | так — **це D-003** | закрито (див. вище) |
| `-Q` (4) | GET /char/home | «Authentication failed against the database server» | ні — інфраструктура | поза кодом |
| `-E` (233), `-B` (101), `-9` (28), `-5` (21), `-6` (4), `-V` (1), `-M` (18), `-D`,`-F`,`-G`,`-H`,`-N` | різні | MetaMask, `M_ID` в `app:///executors/200.js`, `addListener`, `emit`, `loadTheme`, `Failed to fetch` | **ні** | розширення браузера й мережа користувача; `executors/200.js` — не наш бандл |
| `-1`,`-2`,`-3`,`-4` | /sentry-check | навмисні перевірки | ні | інструмент |

Тобто з 534 подій знімка приблизно **334 (E+B+9+5+6+V+M) — шум розширень браузера**, і
`userCount=0` (D-002) заважає це побачити з панелі: найгучніший issue проєкту — не наш код.

---

## Що не перевірено

- Робоча база — не читав узагалі (заборона контексту). Усі твердження про дані стосуються
  `spells_test`.
- Браузерну перевірку на :3100 не робив: усі знахідки цієї лінзи виявилися доказовими через код,
  запит до бази або програмну збірку, і бюджет пішов на них.
- BUG-009 бачив рівно як побічний ефект (`{"error":"Дооберіть опції"}` на шляху MULTICLASS у Воїна
  2014, тоді як `createCharacter` таких виборів не вимагає) — окремої симетричної збірки
  «створити Слідопита без Favored Enemy» не робив.
- Точної таблиці «Infusions Known» (TCoE) у репо немає — доказ BUG-007 спирається на
  `infusion.min_artificer_level`, а не на памʼять про книгу.
