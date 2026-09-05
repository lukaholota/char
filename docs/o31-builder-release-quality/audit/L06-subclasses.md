# L06-subclasses — аудит підкласів 2024

Мітка: **L06-subclasses**. Дата: 2026-09-04. База: `spells_test`. Нічого в репозиторії не змінено.

Робочі файли: `scratchpad/audit/work/L06-subclasses/`
(`q.mjs` — запити до `spells_test`; `db-2024.json` — вивантаження підкласів; `subclass-probe.test.ts.done`,
`no-subclass.test.ts`, `vitest.probe.mts` — програмна збірка персонажів через справжні серверні дії).

---

## Метод

1. Оракул: `data/2024/normalized/subclasses.json` (48 підкласів) + `data/2024/srd/classes.md`
   (12 підкласів SRD 5.2.1 — по одному на клас). `data/5etools/raw/book/book-phb.json` підкласових
   рис **не містить** (це текст глав, теки `class/` у зліпку немає), тому оракулом були нормалізований
   файл і SRD.
2. Звірка: SQL по `subclass` / `subclass_feature` / `feature` у `spells_test` + `src/lib/generated/creator-content-2024.json`.
3. Наскрізна перевірка: справжні `createCharacter` / `levelUpCharacter` через `tests/helpers/build-2024-character.ts`
   на власному vitest-конфізі (файли лежать поза репо, замок на `spells_test` береться штатним `globalSetup`).

---

## Знахідки

### L06-subclasses-01 (P1) Підкласові «завжди підготовлені» заклинання 2024 не існують ніде — ні в даних, ні як джерело

**Правило.** `data/2024/srd/classes.md:2970` (Life Domain Spells): «When you reach a Cleric level
specified in the Life Domain Spells table, you thereafter always have the listed spells prepared»
(3 рівень: Aid, Bless, Cure Wounds, Lesser Restoration; 5: Mass Healing Word, Revivify).
`classes.md:4410` (Circle of the Land Spells): «Whenever you finish a Long Rest, choose one type of
land … you have the spells listed for your Druid level and lower prepared».

**Доказ (дані).** У `spells_test`:

```sql
select s.ruleset, count(distinct s.subclass_id), count(*) from "_SubclassExpandedSpells" e
join subclass s on s.subclass_id=e."B" group by 1;   -- []  (таблиця порожня)

select ruleset, grants_spells, count(*) from subclass group by 1,2;
-- RULES_2014 false 40 | RULES_2014 true 78 | RULES_2024 false 48
```

Усі 48 підкласів 2024 мають `grants_spells = false`, тоді як 78 зі 118 підкласів 2014 — `true`.
21 риса-таблиця («Life Domain Spells», «Oath of Devotion Spells», «Circle of the Land Spells»,
«Fiend Spells», «Draconic Spells», «Gloom Stalker Spells», «Psionic Spells», «Clockwork Spells»,
«Fey Wanderer Spells», …) має **0** рядків у `_FeatureToSpell`.

**Доказ (наскрізний).** Фікстура `02-dwarf-cleric-farmer` (Дворф Клірик 5, Life Domain) прогнана
через справжні `createCharacter` + 4× `levelUpCharacter`:

```
PERS: { "level": 5, "subclass": { "name": "LIFE_DOMAIN", "ruleset": "RULES_2024", "grantsSpells": false } }
SPELLS (0):
SPELL SOURCES: [{"key":"CLERIC_2024","name":"CLERIC_2024","ability":"WIS","kind":"CLASS"}]
```

**Доказ (код).** `src/rules/spell-sources.ts:16` — `export type SpellSourceKind = "CLASS" | "SPECIES" | "FEAT";`
Підкласу серед видів джерел немає; `findGrantedSpells` (там само, рядок 85) матеріалізує лише
заклинання виду.

**Очікується.** Клірик Life Domain 5-го рівня має 6 завжди підготовлених заклинань, що **не**
рахуються в ліміті підготовлених.
**Фактично.** Нуль. Гравець мусить додати їх вручну, і вони з'їдять ліміт, якщо він не поставить
бейдж із назвою підкласу (єдиний наявний механізм — евристика по тексту бейджа,
`src/lib/logic/spell-prepared-exclusions.ts:65`).

**Статус у документах.** Це вимірювання вже зроблено власником:
`docs/o18-2024-character-parity/kr18.4-species-choices.md:113-124` — «жоден із 48 підкласів 2024 не
має ані `grants_spells`, ані `expanded_spells` … власник 2026-08-29 підтвердив, що цього тут не
робимо». Тобто рішення було **відкласти в межах KR18.4**, а не прийняти як фінальну поведінку.
Для релізу 2024 це відкрита діра.

**Де лагодити.** Дані: рядки в `_SubclassExpandedSpells` або `_FeatureToSpell` для риси-таблиці +
рівні. Код: додати `SUBCLASS` у `SpellSourceKind` і гілку в `findSpellSources`/`findGrantedSpells`
(`src/rules/spell-sources.ts`), завантаження в `src/server/db/spell-sources.ts`, видача при
`levelUpCharacter` поряд з `readMissingSpeciesGrants`. Ліміт підготовлених — прапорець
`excludeFromPreparedCount` на створеному рядку. **Effort: L.**

---

### L06-subclasses-02 (P1) Персонаж 2024 доходить до 5-го рівня без підкласу — сервер не вимагає його, а майстер більше не пропонує

**Правило.** `data/2024/srd/classes.md` — у кожного класу 2024 на 3-му рівні риса «<Клас> Subclass»,
підклас обов'язковий.

**Доказ (наскрізний).** Клірик 2024 піднятий з 1 до 5 рівня чотирма викликами `levelUpCharacter`
**без** `subclassId` у формі (`work/L06-subclasses/no-subclass.test.ts`):

```
levelup -> 2 {"success":true}      server needsSubclass for next level: true  nextLevel: 3
levelup -> 3 {"success":true}      server needsSubclass for next level: true  nextLevel: 4
levelup -> 4 {"success":true}      server needsSubclass for next level: true  nextLevel: 5
levelup -> 5 {"success":true}      server needsSubclass for next level: true  nextLevel: 6
FINAL level: 5 subclassId: null
FEATURES: Cleric: Spellcasting (2024) | Cleric: Divine Order (2024) | Dwarf: … | Cleric: Channel Divinity (2024)
          | Cleric: Cleric Subclass (2024) | Cleric: Ability Score Improvement (2024) | Cleric: Sear Undead (2024)
```

Персонаж 5-го рівня з `subclassId = null`, без жодної підкласової риси, і `getLevelUpInfo` чесно
каже `needsSubclass: true` — але ніхто на це не дивиться.

**Доказ (код).**
- `src/server/db/levelup-persistence.ts:449-453` — єдина перевірка підкласу при підвищенні:
  `if (subclassIdForSelectedClass) { … if (!belongs) return { error: … } }`. Якщо `subclassId` не
  надіслали — жодної помилки.
- `src/server/db/levelup-persistence.ts:86` рахує `needsSubclass` і повертає його (рядок 115), але
  жоден споживач його не читає: майстер має власний
  `src/lib/components/levelUp/LevelUpWizard.tsx:567` —
  `return selectedClass.subclassLevel === classLevelAfter;` — **рівність**, не `>=`.
  Тобто крок «Підклас» показується рівно на 3-му рівні класу й ніколи потім.
- `src/rules/strategies/rules2024.ts:16` — `needsSubclassSelection(_p, hasSubclass, level) { return !hasSubclass && level >= 3; }`
  (сервер) проти рівності в майстрі. Дві різні відповіді на те саме питання.

**Очікується.** Підвищення до 3-го рівня класу без підкласу відхиляється; якщо персонаж уже без
підкласу — майстер пропонує його на будь-якому наступному рівні.
**Фактично.** Підвищення проходить, і повернути підклас через UI неможливо — інших місць, де
пишеться `pers.subclassId`, немає (`src/lib/actions/character-transaction.ts:52` — мертвий стаб
`SELECT_SUBCLASS`, ніхто не викликає).

**Де лагодити.** Серверна перевірка в `executeLevelUp` поруч із `belongs`; у майстрі замінити
рівність на ту саму `rulesStrategy.needsSubclassSelection` (або читати `needsSubclass` із
`getLevelUpInfo`). **Effort: S.**

---

### L06-subclasses-03 (P1) Усі 241 підкласові риси 2024 — `PASSIVE` без жодного обмеженого використання

**Доказ.**

```sql
select s.ruleset, f.display_type, count(*) from subclass s
join subclass_feature sf using(subclass_id) join feature f using(feature_id) group by 1,2;
-- RULES_2024 {PASSIVE} 241            (і жодного іншого типу)
-- RULES_2014 {PASSIVE} 408 | {ACTION} 92 | {BONUSACTION} 72 | {REACTION} 57 | {CLASS_RESOURCE} 5 | …

select s.ruleset, count(*) filter (where f.uses_count is not null or f.uses_count_special is not null) with_uses,
       count(*) filter (where f.uses_pool_key is not null) with_pool, count(*) total …;
-- RULES_2024: with_uses 0, with_pool 0, total 241
-- RULES_2014: with_uses 91, with_pool 96, total 638
```

Пряме порівняння тих самих рис у двох редакціях:

| риса | 2014 | 2024 |
|---|---|---|
| Warding Flare (Light Domain) | `{REACTION}`, `LONG_REST` | `{PASSIVE}`, без використань |
| War Priest (War Domain) | `{BONUSACTION}`, `LONG_REST` | `{PASSIVE}`, без використань |
| Combat Superiority (Battle Master) | `{CLASS_RESOURCE}`, `SHORT_REST`, `uses_pool_key = SUPERIORITY_DICE` | `{PASSIVE}`, `pool = null` |

Текст у самій базі суперечить типу: `Path of the Berserker: Retaliation (2024)` — «ви можете
**реакцією** зробити одну атаку», `display_type = {PASSIVE}`. `War Domain: War Priest (2024)` —
«**Бонусною дією** … кількість разів, що дорівнює вашому модифікатору Мудрості … відновлюєте …
короткий або довгий відпочинок», `uses_count = null`.

**Правило (SRD).** `classes.md:5278` (Wholeness of Body): «You can use this feature a number of
times equal to your Wisdom modifier … regain all expended uses when you finish a Long Rest».
`classes.md:9786` (Dark One's Own Luck): те саме через Харизму. `classes.md:3003` (Preserve Life):
«As a **Magic action** … expend a use of your Channel Divinity».

**Наслідок.** На листі персонажа 2024 жодна підкласова риса не потрапляє в «Дії / Бонусні дії /
Реакції» — усе падає в «Пасивні»; лічильників використань і пулів ресурсів немає взагалі
(у пробі `POOLS: []` у Клірика Life Domain 5-го рівня). Це прямо ламає бойовий цикл підкласу.

**Де лагодити.** Дані сіду (`prisma/seed/*2024*` + `data/2024/normalized/subclasses.json` не несе
цих полів — їх треба туди додати), а не прохід по базі ([Р33](docs/DECISIONS.md#р33)). **Effort: L.**

---

### L06-subclasses-04 (P1) Жодна підкласова риса 2024 не дає володінь, КЗ і ХП — тільки проза

**Доказ.**

```sql
select s.ruleset, count(*) filter (where f.skill_proficiencies is not null) sk,
  count(*) filter (where f.skill_expertises is not null) exp,
  count(*) filter (where array_length(f.armor_proficiencies,1)>0) arm,
  count(*) filter (where f.weapon_proficiencies is not null) wpn,
  count(*) filter (where array_length(f.tool_proficiencies,1)>0) tool,
  count(*) filter (where f.gives_ac is not null or f.modifies_ac is not null) ac,
  count(*) filter (where f.bonus_hit_points_per_level is not null) hp
from subclass s join subclass_feature sf using(subclass_id) join feature f using(feature_id) group by 1;
-- RULES_2024: 0 0 0 0 0 0 0   (з 241)
-- RULES_2014: 4 1 9 5 4 0 0   (з 638)
```

Конкретні риси з текстом із бази, які нічого не дають механічно:

- `College of Lore: Bonus Proficiencies (2024)` — «Ви отримуєте Володіння **трьома навичками** на ваш вибір» → `skill_proficiencies = null`, вибору немає.
- `Assassin: Assassin's Tools (2024)` — «Ви отримуєте Набір для маскування та Набір отруйника, і ви маєте Володіння ними» → `tool_proficiencies = {}`.
- `Draconic Sorcery: Draconic Resilience (2024)` — «Ваш максимум Хіт Поїнтів збільшується на 3 і збільшується ще на 1 щоразу, коли ви отримуєте черговий рівень Чародія … поки ви не носите броню, ваш базовий Клас Броні дорів[нює 13 + мод. Спритності]» → `bonus_hit_points_per_level = null`, `gives_ac = null`, `modifies_ac = null`. **ХП і КЗ такого персонажа рахуються не за книгою.**
- `College of Dance: Dazzling Footwork (2024)` — «Ваш базовий Клас Броні дорівнює 10 плюс модифікатори Спритності та Харизми» → `modifies_ac = null`.

(2014 `Draconic Resilience` теж не змодельована — тут це не регресія, а спільна діра; решта пунктів у 2014 змодельовані.)

**Де лагодити.** Ті самі сіди 2024, що й у -03. **Effort: M.**

---

### L06-subclasses-05 (P1) У підкласів 2024 нема жодного структурованого вибору — `subclass_choice_option` порожня

**Доказ.**

```sql
select count(*) from subclass s join subclass_choice_option sco using(subclass_id)
where s.ruleset='RULES_2024';   -- 0
```

`creator-content-2024.json` це підтверджує: усі 48 підкласів мають `0co` (див. вивантаження в
робочій теці).

**Правило.** `data/2024/srd/classes.md:6817` (Hunter's Prey): «You gain **one of the following
feature options of your choice**. Whenever you finish a Short or Long Rest, you can replace the
chosen option with the other one» (Colossus Slayer / Horde Breaker). `classes.md:4410`
(Circle of the Land): «choose one type of land: arid, polar, temperate, or tropical». Текст у базі
`Draconic Sorcery: Elemental Affinity (2024)`: «Оберіть один з таких типів: Кислотна, Холодна,
Вогняна, Блискавична або Отруйна». `Battle Master: Combat Superiority (2024)`: «Ви опановуєте **три
маневри на вибір**».

**Очікується.** Крок «Опції підкласу» на 3-му (і 7/11/…) рівні з реальними варіантами, збережений
вибір, видимий на листі.
**Фактично.** Крок ніколи не з'являється (`levelup-persistence.ts:103` фільтрує порожній список,
`LevelUpWizard` крок не додає), вибір гравця не існує як дані. Маневри Battle Master 2024 не
вибираються й не показуються.

**Де лагодити.** `choice_option` + `subclass_choice_option` для 2024 у сіді; крок у майстрі вже є
й працює для 2014. **Effort: L.**

---

### L06-subclasses-06 (P1) `ARTIFICER_2024` пропонується у конструкторі 2024, але має 0 підкласів при `subclass_level = 3`

**Доказ.**

```sql
select c.eng_name, c.subclass_level, (select count(*) from class_feature cf where cf.class_id=c.class_id) feats,
       (select count(*) from subclass s where s.class_id=c.class_id) subs
from class c where c.ruleset='RULES_2024' order by c.sort_order;
-- … WIZARD_2024 3 10 4 | ARTIFICER_2024 3 13 0
```

`src/lib/generated/creator-content-2024.json` містить `ARTIFICER_2024 subclassLevel=3 subs=0`, тобто
клас віддається конструктору 2024 (фільтра за джерелом у `ClassesForm`/`MultiStepForm` немає).

**Наслідок.** На 3-му рівні майстер підвищення додає крок «Підклас»
(`LevelUpWizard.tsx:827`, `needsSubclass = selectedClass.subclassLevel === classLevelAfter` — true
незалежно від того, чи є підкласи), крок стартує з `initialDisabled: true`
(`LevelUpWizard.tsx:831`, розблоковується лише вибором у формі, `LevelUpWizard.tsx:1224`). З нулем
варіантів «Далі» не вмикається — гравець застрягає на 3-му рівні.

**Зауваження.** PHB 2024 Артифіцера не містить узагалі; питання, чи цей клас має бути в редакції
2024, — до власника.

**Де лагодити.** Або прибрати `ARTIFICER_2024` зі списку класів 2024, або завезти підкласи, або
не показувати крок, коли `subclasses.length === 0`. **Effort: S** (сховати клас) / **L** (контент).

---

### L06-subclasses-07 (P3) `getLevelUpInfo` рахує нові підкласові риси за рівнем ПЕРСОНАЖА, а не класу

**Доказ.** `src/server/db/levelup-persistence.ts:89-90`

```ts
const newClassFeatures = (currentClass?.features ?? []).filter((f) => f.levelGranted === nextLevel);
const newSubclassFeatures = (currentSubclass?.features ?? []).filter((f) => f.levelGranted === nextLevel);
```

де `nextLevel = pers.level + 1` — рівень **персонажа**. Реальна видача (рядок 731) правильно
використовує `classLevelAfter`. Розбіжність стріляє лише в мультикласі.

**Чому P3.** Майстер не читає ці поля — він рахує власні
(`LevelUpWizard.tsx:666-671`, теж `classLevelAfter`). Тобто це неправильні значення в публічному
API `getLevelUpInfo`, які поки ніхто не показує. Пастка для наступного споживача.

**Де лагодити.** Замінити `nextLevel` на рівень класу в рядках 89-90. **Effort: S.**

---

## Перевірено й правильно

- **Інвентар рис підкласів 2024 бездоганний.** Усі 48 підкласів × 241 риса в `spells_test`
  збігаються з `data/2024/normalized/subclasses.json` рівень-у-рівень і назва-в-назву (діапазон
  назв у базі має префікс «<Підклас>: <Риса> (2024)», але це навмисна дизамбігуація, не розбіжність).
  Жодної відсутньої, зайвої чи не на тому рівні риси.
- **Рівні збігаються з SRD 5.2.1** для всіх 12 підкласів SRD: Path of the Berserker 3/6/10/14;
  College of Lore 3,3/6/14; Life Domain 3,3,3/6/17; Circle of the Land 3,3/6/10/14;
  Champion 3,3/7/10/15/18; Warrior of the Open Hand 3/6/11/17; Oath of Devotion 3,3/7/15/20;
  Hunter 3,3/7/11/15; Thief 3,3/9/13/17; Draconic Sorcery 3,3/6/14/18; Fiend Patron 3,3/6/10/14;
  Evoker 3,3/6/10/14. Класові схеми з ТЗ теж підтвердились: клірик 3/6/17, паладин 3/7/15/20,
  слідопит 3/7/11/15, воїн 3/7/10/15/18, монах 3/6/11/17, пройдисвіт 3/9/13/17, бард 3/6/14,
  чародій 3/6/14/18.
- **`creator-content-2024.json` дзеркалить базу** — ті самі 48 підкласів і 241 риса, `subclassLevel = 3`
  у всіх 13 класів.
- **Ізоляція редакцій на даних чиста.** `select … from subclass s join class c using(class_id)
  where s.ruleset <> c.ruleset` → 0 рядків; те саме для трійки `subclass_feature`/`subclass`/`feature`
  (638 суто 2014, 241 суто 2024). `Class` унікальний по `(name, ruleset)`, `Subclass` — по
  `(classId, name)`, тож однойменні підкласи двох редакцій живуть окремо коректно.
- **Взяти чужий підклас неможливо.** Створення: `src/server/db/character-creation.ts:169` —
  `if (subclass && subclass.classId !== validData.classId) return { error: "Підклас не належить
  обраному класу" }`. Підвищення: `src/server/db/levelup-persistence.ts:451` — та сама перевірка
  `belongs` по `selectedClass.subclasses`. Оскільки `class` розділений за редакцією, підклас 2014
  у клас 2024 не пролазить.
- **Крок «Підклас» у конструкторі 2024 правильно відсутній.** `MultiStepForm.tsx:435-438` питає
  `strategy.needsSubclassSelection({subclassLevel}, false, 1)`; для 2024
  (`src/rules/strategies/rules2024.ts:16`) це `level >= 3` → на 1-му рівні false.
- **Підкласові риси доїжджають до `pers_feature` і на лист.** Проба Клірика Life Domain 5:
  `Life Domain: Disciple of Life (2024)`, `Life Domain: Life Domain Spells (2024)`,
  `Life Domain: Preserve Life (2024)` — усі три рядки 3-го рівня на місці.
  `FeaturesSlide.tsx:211-245` збирає `subclassEntries` і для основного класу, і для мультикласу;
  PDF теж (`src/server/pdf/generateCharacterPdf.ts:306-322`, `sourceBaseOrder.SUBCLASS = 2`).
- **Видача підкласових рис при підвищенні прив'язана до рівня КЛАСУ, не персонажа** —
  `levelup-persistence.ts:731`, `if (sf.levelGranted === classLevelAfter)`. Для мультикласу це
  правильно.
- **Eldritch Knight і Arcane Trickster** мають `spellcasting_type = THIRD`, `primary_casting_stat = INT`;
  решта 46 підкласів — `NONE`. Відповідає книзі.

## Не перевірено

- Візуальна перевірка листа й PDF у браузері на :3100 (не встиг у бюджет; висновок про лист
  зроблено з коду + рядків `pers_feature`).
- Підкласові риси вище 5-го рівня наскрізно (проба доходила до 5). Дані для 6-20 у базі є й
  збігаються з оракулом; шлях видачі той самий рядок 731.
- Чи справді крок «Підклас» блокує Артифіцера 2024 у живому браузері (висновок із коду майстра).
