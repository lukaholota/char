# L12 — вторинні потоки не гублять стан 2024

Лінза: копія персонажа, знімок рівня, шеринг (перегляд і копія за токеном), відпочинки,
офлайн-операції, редагування, видалення/співвласники, теки.

Метод: читання коду й `prisma/schema.prisma`, запити до `spells_test` через `node + pg`,
цитати з оракулів `data/2024/srd/` і `data/2014/srd/`, і **програмний прогін справжніх серверних
дій** на зібраному персонажі 2024.

## Програмний прогін (головний доказ)

Фікстура `07-human-paladin-noble` зібрана до 5-го рівня через `createCharacter` +
`levelUpCharacter` (ті самі серверні дії, що й у застосунку), потім їй додано по одному рядку
`pers_resource_pool`, `pers_wildshape`, `pers_bastion` (+ приміщення) і три рядки
`pers_weapon_mastery`. Далі — `duplicatePers`, `createCharacterSnapshot`,
`generateShareToken` + `copyPersByToken`, `longRest`, `shortRest`.

Тест: `…/scratchpad/audit/work/L12-secondary-flows/secondary.test.ts`
(конфіг `vitest.audit.mts`, замок `spells_test` узято штатним `globalSetup`),
повний результат — `…/work/L12-secondary-flows/report.json`.

| | оригінал | копія (`duplicatePers`) | знімок | копія за токеном |
|---|---|---|---|---|
| `ruleset` | **RULES_2024** | **RULES_2014** | **RULES_2014** | **RULES_2014** |
| `pers_weapon_mastery` | 3 | 3 | **0** | **0** |
| `pers_resource_pool` | 1 | **0** | **0** | **0** |
| `pers_wildshape` | 1 | **0** | **0** | **0** |
| `pers_bastion` | 1 | **0** | **0** | **0** |
| навички / фічі / риси / вибори рис | 5 / 17 / 3 / 3 | 5 / 17 / 3 / 3 | 5 / 17 / 3 / 3 | 5 / 17 / 3 / 3 |

Відпочинки того самого персонажа:

```
before   currentSpellSlots = [4,2,0,0,0,0,0,0,0]     ← вірно: паладин 5 (2024) = рівень заклинача 3
longRest currentSpellSlots = [4,3,2,0,0,0,0,0,0]     ← видано за ЗАГАЛЬНИМ рівнем 5
longRest featuresRestored  = 0                        ← при 17 рядках pers_feature
longRest currentHitDice    = { "345": 5 }             ← усі 5 (вірно для 2024)
shortRest featuresRestored = 0
```

---

## Знахідки

### L12-secondary-flows-01 — жоден із трьох шляхів копіювання не переносить `ruleset`: копія та знімок персонажа 2024 стають персонажем 2014 (P0)

**Де.** Три незалежні реалізації створення `pers` із наявного:

1. `src/lib/logic/pers-duplication.ts:44-118` — `clonePersWithRelations` (копія персонажа й копія теки);
2. `src/server/db/snapshots.ts:39-113` — `createPersSnapshot` (знімок рівня);
3. `src/server/db/share-actions.ts:681-753` — `copyPersByToken` (копія за посиланням).

У жодному з трьох об'єктів `data` немає ключа `ruleset`. Перевірено grep-ом:

```
$ grep -rn "ruleset" src/server/db/share-actions.ts src/server/db/snapshots.ts \
      src/lib/logic/pers-duplication.ts src/server/db/pers-actions.ts
src/server/db/pers-actions.ts:122:export async function getUserPersHomeData(options?: { ruleset?: Ruleset }) {
src/server/db/pers-actions.ts:131:  ...(options?.ruleset ? [{ ruleset: options.ruleset }] : []),
src/server/db/pers-actions.ts:567:  spell: { select: { spellId: true, engName: true, ruleset: true } },
```

**Правило бази.** `prisma/schema.prisma:644` — `ruleset Ruleset @default(RULES_2014)`. Отже
кожен новий рядок без явного `ruleset` створюється як **RULES_2014**.

**Наслідки, доведені кодом:**

* `src/server/db/pers-actions.ts:122-133` — `/2024/char/home` фільтрує `where: { ruleset: "RULES_2024" }`
  (`src/app/2024/char/home/page.tsx:11`). Копія персонажа 2024 **зникає зі списку 2024** і
  з'являється у списку 2014.
* `src/lib/logic/spell-logic.ts:33-34` — `calculateCasterLevel` передає `pers.ruleset` у
  `src/rules/spellcasting.ts`, де половинні заклиначі округлюються **вниз у 2014 і вгору у 2024**
  (`getCasterLevelContribution`, коментар у файлі). Копія паладина 5 рівня одразу після
  копіювання рахує рівень заклинача 2 замість 3 — інші комірки на листі.
* Знімок створюється **автоматично при кожному підвищенні рівня**
  (`src/server/db/levelup-persistence.ts:1095` → `createCharacterSnapshot`). Тобто персонаж 2024
  генерує знімки чужої редакції на кожному рівні; модалка
  (`SnapshotHistoryModal.tsx:70-80`) пропонує з них зробити копію — і гравець отримує
  персонажа 2014.

**Відтворення.** Створити персонажа на `/2024/char`, підвищити рівень (з'явиться знімок), потім
«Копіювати» на `/char/home`. `select pers_id, name, ruleset from pers order by pers_id desc limit 3`.

**Очікується.** `ruleset: pers.ruleset` у всіх трьох `data`.
**Є.** Стовпець не задається; спрацьовує `@default(RULES_2014)`.

---

### L12-secondary-flows-02 — знімок рівня втрачає шість таблиць і одинадцять полів персонажа (P1)

**Де.** `src/server/db/snapshots.ts:18-215`. `include` знімка (рядки 20-34) і його вставки не
знають про:

| Втрачено | Модель у схемі | Що це для 2024 |
|---|---|---|
| `pers_weapon_mastery` | `prisma/schema.prisma:666` | **майстерність зброї** — ядро 2024 |
| `resourcePools` | `PersResourcePool`, схема:838 | ресурси класу (Channel Divinity, Sorcery Points, Wild Shape) |
| `wildshapes` | `PersWildshape`, схема:1145 | звірині форми друїда, зокрема активна форма й її хіти |
| `bastion` (+ `facilities`, `turns`) | `PersBastion*`, схема:1162-1272 | бастіон — механіка **лише** 2024 |
| `persInfusions` | `PersInfusion` | інфузії артифікатора |
| `folderId`, `isPinned` | `Pers` | тека й закріплення |

Плюс поля, які знімок мовчки обнуляє на рівні рядків, що він **таки** копіює:

* `persWeapon`: `overrideDamage`, `attackBonus`, `overrideNormalRange`, `overrideLongRange`,
  `overrideDamageType`, `overrideAttackAbility`, `customAttackBonus`, `customDamageCount`,
  `isMagical` (`snapshots.ts:169-180` проти повного переліку `prisma/schema.prisma:899-922`);
* `persMagicItem`: `isEquipped`, `isAttuned` (`snapshots.ts:203-210` проти схеми:811-822).

**Наслідок.** Знімок — єдиний відкат гравця після невдалого підвищення рівня. Відкотившись,
персонаж 2024 втрачає майстерність зброї, бастіон, дику форму й усі налаштування зброї.
Порівняння з `clonePersWithRelations`, який частину з цього копіює, показує, що це не рішення,
а розходження двох копій одного коду.

---

### L12-secondary-flows-03 — копія персонажа (`clonePersWithRelations`) втрачає ресурси, дику форму й бастіон (P1)

**Де.** `src/lib/logic/pers-duplication.ts:3-27` — `PERS_DUPLICATION_INCLUDE`. У ньому немає
`resourcePools`, `wildshapes`, `bastion` (і `additionalUsers`, `shareTokens` — тут це, найпевніше,
навмисно). Повний перелік зв'язків `Pers` — `prisma/schema.prisma:652-672`.

Викликається з `duplicatePers` (`src/server/db/pers-actions.ts:233`), копії теки
(`pers-actions.ts:430`) і копії спільної теки (`share-actions.ts:616`).

**Наслідок 2024.** Копія друїда не має жодної звіриної форми (`pers_wildshape`), копія
персонажа 4+ рівня не має бастіону, у копії будь-кого обнулено лічильники ресурсів класу.
Майстерність зброї тут **скопійована** (`pers-duplication.ts:206-213`) — на відміну від знімка.

---

### L12-secondary-flows-04 — `copyPersByToken` — третя, найбідніша копія: втрачає майстерність зброї, інфузії, ресурси, дику форму, бастіон і `raceStaticAcBonus` (P1)

**Де.** `src/server/db/share-actions.ts:646-860`. Власний `include` (рядки 662-677) і власні
вставки, які не використовують `clonePersWithRelations`, хоча він імпортований у цьому ж файлі
(`share-actions.ts:7`).

Понад те, що втрачає знімок, тут ще й **немає `raceStaticAcBonus`** (`prisma/schema.prisma:641`,
`@default(0)`), який `clonePersWithRelations` копіює (`pers-duplication.ts:89`) — тобто копія
за посиланням може мати інший КБ, ніж оригінал.

**Наслідок.** Шлях «поділився посиланням → друг скопіював собі» дає найгіршу копію з трьох.
Для 2024 копія приходить без майстерності зброї й у редакції 2014 (див. знахідку 01).

---

### L12-secondary-flows-05 — публічна сторінка шеринга не вантажить майстерність зброї й опційні класові фічі: спільний лист 2024 показує менше, ніж власний (P1)

**Де.** `src/server/db/share-actions.ts:159-357` — `getPersByShareToken`, обидві гілки
(`editToken` і `shareToken`). Порівняння з `include` власного листа
(`src/server/db/pers-actions.ts:600-694`):

| Є у власному листі | Є у шерингу |
|---|---|
| `pers_weapon_mastery: { include: { weapon: true } }` (pers-actions.ts:692) | **немає** |
| `classOptionalFeatures: { include: { feature: true } }` (:677) | **немає** |
| `choiceOptions: { include: { features: { include: { feature: true } } } }` (:678) | `choiceOptions: true` |
| `raceChoiceOptions: { include: { traits: { include: { feature: true } } } }` (:679) | `raceChoiceOptions: true` |
| `feats.feat.grantsFeature` (:652-654) | немає |

Компоненти читають саме ці поля: `WeaponMasteryCard.tsx:25` — `const mastered = pers.pers_weapon_mastery ?? []`,
`WeaponsCard.tsx:71` — мапа майстерностей із того самого поля. Обидва отримають порожній масив,
тобто на `/char/share/<token>` картка майстерності порожня, а бейджі майстерності на зброї зникають.

**Відтворення.** Персонаж 2024 з обраною майстерністю → «Поділитися» → відкрити
`/char/share/<token>` → блок майстерності порожній, на власному листі — заповнений.

---

### L12-secondary-flows-06 — жодна фіча 2024 не має ані `limited_uses_per`, ані `uses_pool_key`: відпочинок для персонажа 2024 не відновлює **нічого** (P1, дані)

**SQL (spells_test, 2026-09-04):**

```sql
select ruleset, limited_uses_per, count(*) from feature group by 1,2;
-- RULES_2014 | SHORT_REST | 75
-- RULES_2014 | LONG_REST  | 202
-- RULES_2014 | DAY        | 1
-- RULES_2014 | null       | 1003
-- RULES_2024 | LONG_REST  | 3     ← лише Magic Initiate (Cleric/Druid/Wizard list)
-- RULES_2024 | null       | 544

select ruleset, uses_pool_key, count(*) from feature where uses_pool_key is not null group by 1,2;
-- усі 8 ключів (WILD_SHAPE, CHANNEL_DIVINITY, SORCERY_POINTS, KI, …) мають ruleset = RULES_2014
```

Поіменно:

```
48849 Barbarian: Rage (2024)              limited_uses_per=null  uses_count=null
48906 Fighter: Second Wind (2024)         limited_uses_per=null  uses_count=null
48531 Dragonborn: Breath Weapon (2024)    limited_uses_per=null  uses_count=null
48524 Aasimar: Healing Hands (2024)       limited_uses_per=null  uses_count=null
48561 Orc: Relentless Endurance (2024)    limited_uses_per=null  uses_count=null
```

**Правило.**
* `data/2024/srd/classes.md:238` (Rage), `:3533` (Wild Shape), `:4798` (Second Wind) —
  «You regain one expended use when you finish a Short Rest, and you regain all expended uses
  when you finish a Long Rest».
* `data/2024/srd/character-origins.md:154` — «You can use this Breath Weapon a number of times
  equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest».
* `data/2024/srd/character-origins.md:323` — Relentless Endurance «Once you use this trait, you
  can't do so again until you finish a Long Rest».

**Код-споживач.** `src/server/db/rest-actions.ts:177-186` (короткий) і `:290-300` (довгий)
шукають `persFeature` з `feature.limitedUsesPer in [SHORT_REST, LONG_REST]`, а пули —
`persResourcePool` персонажа. Для 2024 обидві вибірки порожні, тож `featuresRestored` завжди 0,
а `pers_resource_pool` для персонажа 2024 не створюється взагалі (перевірено: усі 8 персонажів
2024, що були в `spells_test` до чужого TRUNCATE, мали 0 пулів).

**Статус у репо.** Виміряно й записано в `docs/o24-wildshape-second-layer/kr24.6-wildshape-2024.md:223`
(«фіча `Druid: Wild Shape (2024)` має `usesPoolKey: null`, як і **всі** фічі 2024 … це сід
контенту, не цей KR»). Тобто відомо, але **власника не має**: жодна ціль не веде цей сід.
Для релізу це означає, що персонаж 2024 не має жодного лічильника ресурсу класу, а кнопка
відпочинку для нього — порожня дія.

---

### L12-secondary-flows-07 — короткий відпочинок відновлює використання **до максимуму**, тоді як 2024 повертає рівно одне (P2, зараз замаскована знахідкою 06)

**Де.** `src/server/db/rest-actions.ts:196-206` і `:213-236`:

```ts
const maxUses = calculateMaxUsesForFeature(pers, pf.feature) ?? 0;
if (maxUses > 0) {
  await prisma.persFeature.update({ …, data: { usesRemaining: maxUses } });
```

**Правило.** `data/2024/srd/classes.md:3533` — «You can use Wild Shape twice. You regain **one**
expended use when you finish a Short Rest». Те саме для Rage (`:238`) і Second Wind (`:4798`).
У 2014 Second Wind повертається повністю (`feature_id 2073`, `SHORT_REST`, `uses_count 1` — там
максимум і є одиниця), тому чинна поведінка правильна саме для 2014.

**Чому P2, а не P1.** Поки жодна фіча 2024 не має `limitedUsesPer` (знахідка 06), гілка не
виконується для 2024 взагалі. Але щойно сід дасть фічам використання, короткий відпочинок
почне повертати друїду обидва використання Дикої форми замість одного — і це буде тихий
дефект правил, а не помітна відсутність.

---

### L12-secondary-flows-08 — `longRest` видає стандартні комірки за **загальним рівнем** персонажа, а не за рівнем заклинача (P1; це BUG-010, досі відкритий, і у 2024 число інше)

**Де.** `src/server/db/rest-actions.ts:388-397` + приватна `getMaxSpellSlots(level)` (`:420-450`):

```ts
const maxSpellSlots = getMaxSpellSlots(pers.level);
…
data: { …, currentSpellSlots: maxSpellSlots, currentPactSlots: maxPactSlots, … }
```

`calculateCasterLevel` тут викликається (рядок 411), але його результат використовується **лише**
для Pact-комірок.

**Правило 2024.** `data/2024/srd/character-creation.md:937-947` — «Half your levels (round up) in
the Paladin and Ranger classes … Then look up this **total level** in the Multiclass Spellcaster
table». Паладин 5 → рівень заклинача 3 → `SPELL_SLOT_PROGRESSION.FULL[3]` = `[4,2,0,…]`
(`src/lib/refs/static.ts:9`).

**Є.** `getMaxSpellSlots(5)` = `[4,3,2,0,…]` (`rest-actions.ts:425`, рядок «5»).
Тобто паладин 5 після довгого відпочинку отримує **третю** комірку 2-го кола понад максимум і
дві комірки 3-го кола, яких у нього немає. Лист малює `cur` без обрізання по `max`
(`MagicSlide.tsx:701-704`), тому в очі впаде «3 / 2».

**Готовий правильний виклик уже є** і не використаний: `getMaximumStandardSpellSlots(character,
progression, ruleset)` — `src/rules/spellcasting.ts:31-37`.

**Стан у документації.** `docs/KNOWN-BUGS.md:240-253` (BUG-010, «Статус: відкрито»), приклад там
для 2014-Fighter 2. Для 2024 наслідок ширший: половинні заклиначі округлюються **вгору**, тому
розходження торкається паладина й слідопита з першого ж рівня.

---

### L12-secondary-flows-09 — довгий відпочинок повертає **всі** кубики здоров'я обом редакціям (P2; це BUG-013, правильно для 2024, неправильно для 2014)

**Де.** `src/server/db/rest-actions.ts:277-279`:

```ts
const restoredHitDice = serializeHitDicePools(
  collectHitDicePools(pers).map((pool) => ({ ...pool, current: pool.max })),
);
```

У `src/rules/hit-dice.ts` немає жодного ділення навпіл (перевірено grep-ом `half|половин|ceil|floor`).

**Правило.**
* 2024 — `data/2024/srd/rules-glossary.md:1035`: «You regain all lost Hit Points and **all** spent
  Hit Point Dice» → чинна поведінка **правильна**.
* 2014 — `data/2014/srd/06_Gameplay/Adventuring.md:174`: «regains spent Hit Dice, up to a number of
  dice equal to **half** of the character's total number of them (minimum of one die)» → для 2014
  неправильна.

Задокументовано як BUG-013 (`docs/KNOWN-BUGS.md:345-366`), з приміткою, що правка змінює баланс
9 394 наявним персонажам і потребує рішення власника. Підтверджую, що дефект досі в коді.

---

### L12-secondary-flows-10 — Героїчного натхнення немає в моделі взагалі: людина 2024 не отримує його після довгого відпочинку (P2, немає системи)

**Правило.** `data/2024/srd/character-origins.md:303` — Human, «_Resourceful._ You gain Heroic
Inspiration whenever you finish a Long Rest». Плюс три приміщення бастіону дають його ж
(`src/lib/generated/bastions.json` — Workshop, Séance Parlor, Noble Residence).

**Є.** У схемі немає жодного стовпця й жодної таблиці зі словом inspiration
(`grep -in "inspiration" prisma/schema.prisma` — порожньо), у компонентах листа немає жодного
файлу зі словом «натхнен» (`grep -rln "натхнен" src/lib/components/characterSheet/` — порожньо).
`longRest` (`rest-actions.ts:380-405`) його, відповідно, не видає.

Правило 2024 описане в довіднику (`src/lib/generated/rules-2024.json:361`), тож гравець його
побачить у правилах — і не знайде на листі.

---

### L12-secondary-flows-11 — співвласник за посиланням на редагування може **назавжди видалити** персонажа власника; знімки власника лишаються сиротами (P2)

**Де.** `src/server/db/pers-actions.ts:194-215`:

```ts
export async function deletePers(persId: number) {
    …
    const canEdit = await canEditPers(persId, userId);
    if (!canEdit) return { success: false as const, error: "Немає доступу до персонажа" };
    await prisma.$transaction([
        prisma.pers.deleteMany({ where: { userId, parentPersId: persId } }),
        prisma.pers.delete({ where: { persId } }),
    ]);
```

`canEditPers` (`pers-actions.ts:20-45`) віддає `true` будь-кому з `additionalUsers`, а рядок
`persAdditionalUser` створюється кожному, хто відкрив посилання на редагування
(`share-actions.ts:401-407`, `acceptPersEditShareToken`) або приєднався до спільної теки
(`share-actions.ts:549-556`).

Плюс: `deleteMany` прибирає знімки **лише свої** (`where: { userId, … }`). Коли видаляє
співвласник, знімки власника лишаються в базі з `parentpersid` на видалений рядок (зв'язку з
каскадом у схемі немає — `parentPersId` це звичайний `Int?`, `prisma/schema.prisma:628`).

**Наслідок.** Один клік у чужого гравця знищує персонажа безповоротно; жодного підтвердження
власника чи «кошика» немає. Це не залежить від редакції, але посилення шеринга під 2024
збільшує ймовірність.

---

### L12-secondary-flows-12 — сторінка спільної теки не віддає ані редакції, ані мультикласу (P3)

**Де.** `src/server/db/share-actions.ts:477-493` — вибірка персонажів для
`/char/folder/share/[token]` бере `race/class/background`, але не `ruleset` і не `multiclasses`.
Власний список (`getUserPersHomeData`, `pers-actions.ts:134-143`) вантажить `multiclasses` і
будує `classNames`/`subclassNames`.

**Наслідок.** У спільній теці мультикласовий персонаж підписаний лише базовим класом, а редакцію
2014/2024 відрізнити ніяк.

---

## Перевірено й правильно

* **Офлайн-операції (Р29).** `src/server/db/offline-operations.ts` — ідемпотентність тримається
  окремою таблицею `pers_offline_operation` із `createMany({ skipDuplicates: true })` і перевіркою
  `claimed.count === 0`; операція виконується в транзакції; чужого персонажа не візьме
  (`where: { persId, userId, isSnapshot: false }`). Редакції ця гілка не стосується — пише лише
  хіти, ряткидки смерті й комірки.
* **Редагування деталей.** `src/lib/actions/update-character.ts` перевіряє сесію, право на
  редагування й нормалізує текст одним спільним `normalizePersDetails`; редакцію не чіпає.
* **Pact-комірки на відпочинку.** І короткий (`rest-actions.ts:170-174`), і довгий (`:411-414`)
  беруть `calculateCasterLevel` і таблицю `PACT` — тобто саме тут рівень заклинача врахований
  правильно, на відміну від стандартних комірок (знахідка 08).
* **Короткий відпочинок і кубики здоров'я.** Витрата йде через чисту `findPoolsAfterSpending`
  (`src/rules/hit-dice.ts`), результат кидка може бути введений гравцем вручну, включно з нулем —
  коментар у `rest-actions.ts:146-148` це пояснює; правило 2024
  (`rules-glossary.md:1283`, «Spend Hit Point Dice … minimum of 1 Hit Point») дотримано в
  `rollHitDiceForHitPoints` через `Math.max(1, roll + мод)`.
* **Довгий відпочинок і тимчасові хіти / ряткидки смерті.** `rest-actions.ts:392-402` скидає
  `tempHp`, `deathSaveSuccesses`, `deathSaveFailures`, `isDead` — збігається з
  `playing-the-game.md:1259` («Temporary Hit Points last until they're depleted or you finish a
  Long Rest»).
* **Ізоляція знімків у списках.** `buildVisiblePersFilter`
  (`src/server/db/pers-access-filters.ts:6-17`) не показує неактивні знімки — тобто автоматичні
  знімки рівня не засмічують ані `/char/home`, ані `/2024/char/home`.
* **Копія знімка створює звичайного персонажа.** `clonePersWithRelations` задає `isSnapshot: false`
  і не переносить `parentPersId` (`pers-duplication.ts:113-114`), тож «Копіювати» в історії дає
  самостійного персонажа, а не другий знімок.
* **Вибори рис у копії й знімку.** І `clonePersWithRelations` (`:172-183`), і `createPersSnapshot`
  (`:158-168`) створюють `PersFeat` поштучно й переносять `PersFeatChoice` — вибори всередині
  рис не губляться в жодному з двох шляхів. Це узгоджено з Р37 (повторювана риса = другий рядок
  `pers_feat`): обидва шляхи ходять циклом, а не `createMany` з унікальним ключем.
* **Інфузії в копії персонажа.** `clonePersWithRelations:246-256` перемапує `persArmorId`,
  `persWeaponId`, `persMagicItemId` через три Map-и на нові id — рідкісний випадок, зроблений
  правильно (у знімку й копії за токеном інфузій немає взагалі).

## Не перевірено

* Браузерна перевірка `/char/share/<token>` і `/char/folder/share/<token>` на :3100.
* PDF/друк (інша лінза).
* Мультикласовий персонаж у вторинних потоках: перевірено лише одноклассового паладина
  (`pers_multiclass` = 0 в обох станах). Рядки `PersMulticlass` копіюють усі три шляхи, але
  на живому мультикласі це не проганялося.
* Побічне спостереження, не моя лінза: у зібраного паладина 5 рівня `pers_spell` = 0 —
  підготовлених заклинань немає жодного. Це або фікстура їх не обирає, або дефект підготовки
  2024; передаю лінзі spellcasting.
