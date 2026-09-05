# L10-sheet-config — що гравець може змінити на листі персонажа

Лінза: «highly configurable». Питання одне — **чи можна виправити персонажа на листі, не
перестворюючи його**, і чого бракує проти D&D Beyond / Roll20.

Дата: 2026-09-04. Сервер :3100, база `spells_test`, персонаж 2024 (`pers_id` 56/57, варвар 5 рівня,
вид Аазимар→Голіаф, користувач `L10-sheet-config@holota.family`).

> Примітка про середовище: копія дерева під :3100 (`scratchpad/app`) не мала двох модулів, які вже
> є в репозиторії (`src/rules/attacks-per-action.ts`, `src/server/db/armor-class-formulas.ts`), і
> лист персонажа через це не компілювався (`Module not found` у `WeaponsCard.tsx`). Я скопіював
> **тільки ці два файли** з репозиторію в копію (додавання, без правок) — після цього лист
> відкрився. У репозиторій нічого не писав.
>
> Друга примітка: під час прогону паралельна сесія зробила `TRUNCATE` користувацьких таблиць
> (`pers` спорожніла, у `user` лишився чужий рядок) — частину браузерних перевірок довелося
> замінити доказом із коду й бази.

---

## Матриця: що налаштовується на листі

| Пункт | Стан | Де |
|---|---|---|
| Характеристики: базове значення | **є** | `ModifyStatModal.tsx:88–96`, `saveAbilityAdjustments` (`src/server/db/bonus-actions.ts:479`) |
| Характеристики: бонус до значення / до модифікатора / до ряткидка | **є** | ті самі, `statBonuses` / `statModifierBonuses` / `saveBonuses` |
| Володіння ряткидком (додати своє) | **є** | `additionalSaveProficiencies`, `bonus-actions.ts:250` |
| Статура заднім числом рухає максимум хітів | **є** | `findConstitutionHitPointUpdate`, `bonus-actions.ts:441` |
| Макс. HP вручну (Р22) | **є** | `updateMaxHp`, `bonus-actions.ts:542` |
| Поточні HP / тимчасові HP / шкода / лікування | **є** | `combat-actions.ts:32` |
| Ряткидки смерті, смерть, відродження | **є** | `combat-actions.ts:84,148` |
| КЗ: override бази + бонус | **є** | `overrideBaseAC`, `bonus-actions.ts:375` |
| Щит і додатковий бонус щита | **є** | `equipment-actions.ts:344` |
| Ініціатива / бонус майстерності / атака й СЛ замовлянь — бонуси | **є** | `SimpleBonusField`, `model-types.ts:776` |
| **Швидкість** | **частково** — тільки бонус; база жорстко 30 | `bonus-calculator.ts:395` → **знахідка 03** |
| Навички: НЕМА / ПОЛОВИНА / ВОЛОДІННЯ / ЕКСПЕРТИЗА + власний бонус | **є** | `ModifyStatModal.tsx:647–657`, `updateSkillProficiency` |
| **Володіння (зброя/броня/інструменти)** | **частково** — один текстовий блок | `customProficiencies = profLines.join("\n")`, `character-creation.ts:713` → **знахідка 12** |
| **Мови** | **частково** — текстовий блок + діалог-підстановка | `MainStatsSlide.tsx:1010–1046` → **знахідка 12** |
| **Риси (feat): додати/видалити з каталогу** | **частково** — надання й вибори не застосовуються | `FeatsSheetManagerModal.tsx:75`, `feat-actions.ts` → **знахідка 01** |
| **Своя фіча з текстом і ресурсом** | **нема** | стовпець `pers.custom_features` мертвий → **знахідка 11** |
| Заклинання: додати будь-яке, підготувати, лічильник | **є** | `AddSpellDialog.tsx` (файл паралельної сесії, не чіпав) |
| Зброя: додати з каталогу, створити свою, назва/бонус атаки/кубик/характеристика/магічність/володіння, видалити | **є** | `AddWeaponDialog.tsx`, `WeaponCustomizeModal.tsx`, `equipment-actions.ts:47,90` |
| **Зброя: каталог 2024 для персонажа 2024** | **нема** | `ACTIVE_RULESET = "RULES_2014"`, `equipment-actions.ts:10,375` → **знахідка 02** |
| **Зброя: володіння виводиться з персонажа** | **нема** — завжди `isProficient: true` | `AddWeaponDialog.tsx:59,76` → **знахідка 14** |
| Зброя: тип шкоди / дальність | **нема в UI** (стовпці в базі є) | `PersWeapon.overrideDamageType/…Range` → **знахідка 15** |
| Обладунок: додати, свій, override КЗ, характеристики бонусу, misc, володіння, вдягнути | **є** | `ArmorCustomizeModal.tsx`, `equipment-actions.ts:169,246` |
| **Магічні предмети: каталог 2024** | **нема** | `AddMagicItemDialog.tsx:26` → **знахідка 04** |
| Магічні предмети: вдягнути / налаштуватися / видалити | **є** | `CombatSlide.tsx:66–83`, `magic-item-actions.ts` |
| **Ліміт налаштування — 3** | **нема** | ніде не рахується → **знахідка 05** |
| **Заряди предмета** | **нема** | стовпця немає взагалі → **знахідка 06** |
| Гроші (мідь/срібло/електрум/золото/платина) | **є** | `MainStatsSlide.tsx:842–905` |
| **Вага / навантаження** | **нема** | системи немає → **знахідка 07** |
| **Стани й виснаження** | **нема** | лише довідник `rulesData.ts` → **знахідка 08** |
| **Натхнення (Heroic Inspiration)** | **нема** | стовпця немає → **знахідка 09** |
| XP (число) | **є**; рівень із XP не виводиться | `update-character.ts:25` |
| Світогляд | **є** | `MainStatsSlide.tsx:818` |
| Нотатки / риси характеру / ідеали / привʼязаності / вади / передісторія | **є** | `MainStatsSlide.tsx:807–979` |
| **Зовнішність (вік, зріст, вага, очі, волосся, шкіра) і портрет** | **нема** | у `model Pers` полів немає → **знахідка 13** |
| Імʼя | **є** | `CharacterSheet.tsx:131`, `renamePers` |
| **Змінити підклас** | **нема** | `updatePersSubclass` викликається лише з `character-transaction.ts:52` → **знахідка 10** |
| **Знизити рівень / респек** | **нема** | у `src/` немає жодної дії зниження рівня → **знахідка 10** |
| Копія персонажа | **є** | `duplicatePers`, `pers-duplication.ts` |
| Знімки (історія рівнів) і копія зі знімка | **є** | `SnapshotHistoryModal.tsx:74` |
| Видалити | **є** | `deletePers` |
| Теки: створити, перейменувати, колір, закріпити, вкласти, копіювати | **є** | `pers-actions.ts:270–526` |
| Спільний доступ (токен, право редагування, шеринг теки) | **є** | `PersShareToken.canEdit`, `share-actions.ts` |
| Друк / PDF | **є** | `PrintCharacterDialog.tsx` |

---

## Знахідки

### L10-sheet-config-01 (P1) — риса, додана на листі, не дає нічого зі своїх надань

`FeatsSheetManagerModal` викликає дію **без виборів**:

```ts
// src/lib/components/characterSheet/FeatsSheetManagerModal.tsx:75
const res = await addFeatToPers({ persId, featId: feat.featId });
```

`addPersFeat` пише лише рядок `pers_feat` (+ `pers_feat_choice`, якщо `choiceOptionIds` передали —
а їх ніхто не передає):

```ts
// src/server/db/feat-actions.ts:56-84
export async function addPersFeat(persId, featId, choiceOptionIds?) {
  const persFeat = existing ?? (await prisma.persFeat.create({ data: { persId, featId } }));
  if (choiceOptionIds && choiceOptionIds.length > 0) { … }
  return persFeat;
}
```

Надання риси (`grantedASI`, `grantedSkills`, `grantedLanguages`, `grantedToolProficiencies`,
`grantedArmorProficiencies`, `grantedWeaponProficiencies`) застосовуються **тільки** у двох місцях —
`src/server/db/character-creation.ts` і `src/server/db/levelup-persistence.ts:288–411`.
`bonus-calculator.ts` із риси читає лише `feat.grantsFeature` (рядок 192). Тобто:

* «Умілець» (`Skilled`, 3 володіння на вибір) додається без жодного володіння і без діалогу вибору;
* «Стійкий» (`Resilient`, +1 і володіння ряткидком) — без +1 і без ряткидка;
* «Магічний послушник» (`Magic Initiate`) — без заклинань;
* риса 2024 з ASI (`grantedASI`) не рухає характеристику.

Виправити на листі не можна: діалогу виборів риси на листі немає взагалі (`FeatChoiceOptionsForm`
живе тільки в конструкторі й у майстрі рівня). Гравець мусить видалити рису й піднімати рівень
заново — а якщо риса потрібна не на рівні ASI, то тільки перестворенням.

**Відтворення:** лист → слайд «Фічі» → «Керування рисами персонажа» → «+ Додати рису» → «Умілець» →
`select * from pers_feat_choice where pers_feat_id = <новий>` порожньо; жодна навичка в `pers_skill`
не змінилась.

**fix_hint:** дати `FeatsSheetManagerModal` той самий крок виборів, що і майстер рівня
(`FeatChoiceOptionsForm`), і винести застосування надань риси з `levelup-persistence.ts` у чисту
функцію `src/rules/feat-grants.ts`, яку кличуть обидва шляхи. Effort **M**.

---

### L10-sheet-config-02 (P1) — на листі персонажа 2024 каталог зброї й обладунку жорстко 2014

```ts
// src/server/db/equipment-actions.ts:9-10
// KR6.3: hardcoded until the edition switch (O6 Крок 5) lets pers.ruleset drive this.
const ACTIVE_RULESET: Ruleset = "RULES_2014";
…
// :375-386
prisma.weapon.findMany({ where: { ruleset: ACTIVE_RULESET }, … })
prisma.armor.findMany({ where: { ruleset: ACTIVE_RULESET }, … })
```

Браузер, персонаж `ruleset = RULES_2024`, кнопка «Додати зброю»
(`shots/L10-2-add-weapon.png`) — перші позиції списку: `Дубинка, Кинджал, Велика дубинка, Ручна
сокира, Метальний спис, Легкий молот, Булава, Палиця, Серп, Спис, Беззбройний удар` — це рядки
`RULES_2014`.

База (`spells_test`):

```
 ruleset     | with_mastery | count
 RULES_2024  |      38      |  38
 RULES_2014  |       0      |  48
```

Тобто **всі** 38 записів зброї 2024 несуть `mastery`, і **жоден** із 48 записів 2014 його не має.
`pers_weapon_mastery` посилається на `weapon_id` (`prisma/schema.prisma`, `model
pers_weapon_mastery`), а `WeaponsCard` шукає майстерність теж по `weaponId`:

```ts
// src/lib/components/characterSheet/WeaponsCard.tsx:70-72
const masteryByWeaponId = useMemo(
  () => new Map((pers.pers_weapon_mastery ?? []).map((e) => [e.weapon_id, e.weapon.mastery])), …);
```

**Наслідок:** персонаж 2024, який додав зброю на листі (а не отримав її при створенні), назавжди
отримує рядок 2014 без майстерності. Значок майстерності на такій зброї не зʼявиться ніколи, бо
`weapon_id` рядка з 2014 не збігається з `weapon_id`, під яким записано вибір майстерності.
Обладунок так само: 16 записів `RULES_2024` у базі є, з листа недосяжні. `handleAddCustom` для
кастомної зброї падає у `weaponId || 1` (`equipment-actions.ts:63`), а `weapon_id = 1` — це
`CLUB` редакції 2014.

**Правило:** `data/2024/srd/equipment.md` — розділ Mastery Property: кожна зброя 2024 має
властивість майстерності; це одна з опорних механік редакції.

**fix_hint:** `getBaseEquipment(ruleset)` замість `ACTIVE_RULESET`; ruleset брати з `pers.ruleset`
у `AddWeaponDialog`/`AddArmorDialog`; фолбек кастомної зброї — `HOMEBREW`-рядок відповідної
редакції, як уже зроблено для обладунку (`equipment-actions.ts:186–198`). Effort **M**.

---

### L10-sheet-config-03 (P1) — швидкість на листі завжди 30 + бонус, видова швидкість ігнорується

```ts
// src/lib/logic/bonus-calculator.ts:394-397
/** Calculate final speed (base 30 + bonuses) */
export function calculateFinalSpeed(pers: PersWithRelations): number {
  // TODO: Get from race when race has speed field
  return 30 + getSimpleBonus(pers, "speed");
}
```

Стовпець у виду **є** (`race.speed`, а також `burrow_speed`, `flight_speed`, `swim_speed`,
`climb_speed`). У `spells_test`:

```
 name           | speed | ruleset
 GOLIATH_2024   |  35   | RULES_2024
 HALFLING_2014  |  25   | RULES_2014
 GNOME_2014     |  25   | RULES_2014
 DWARF_2014     |  25   | RULES_2014
 CENTAUR_MPMM   |  40   | RULES_2014
 …               (2014: чотири види по 25, три по 35, один 40)
```

**Оракул:** `data/2024/srd/character-origins.md:257` — Goliath: «**Speed:** 35 feet».

Ту саму функцію використовує PDF (`src/server/pdf/generateCharacterPdf.ts:1065,1205`), тож у
надрукованому листі теж 30. Модалка налаштування швидкості показує ту саму фіктивну базу:

```ts
// src/lib/components/characterSheet/ModifyStatModal.tsx:233
case "speed": baseValue = 30; break;
```

Єдиний спосіб полагодити — вручну вписати +5 (або −5) у бонус швидкості, і тоді лист бреше про
джерело числа. Це і є «не можна виправити правильно».

**Відтворення:** персонаж 2024 із видом Голіаф → плитка «ШВИДКІСТЬ» показує 30. Браузерний доказ
зняти не встиг (паралельний прогін зробив `TRUNCATE` посеред перевірки), але код і дані однозначні:
`race.speed` ніде не читається — `grep -rn "race.speed\|\.speed" src/lib/logic/bonus-calculator.ts`
дає лише `speedBonuses`.

**fix_hint:** `calculateFinalSpeed(pers)` = `pers.race.speed ?? 30` + бонуси; додати
`creature-speed.ts` (він уже є в `src/rules/`) як джерело правди й показувати інші швидкості
(політ/плавання/лазіння) окремими рядками. Effort **S** для базової швидкості, **M** із рештою.

---

### L10-sheet-config-04 (P2) — магічні предмети 2024 недосяжні з листа

```tsx
// src/lib/components/characterSheet/AddMagicItemDialog.tsx:24-27,56
const queryParams = new URLSearchParams({ origin: "character", persId: String(persId) });
…
<iframe src={`/magic-items?${queryParams.toString()}`} … />
```

Адреса `/magic-items` без редакції; сторінка бере дефолт:

```ts
// src/lib/magicItemsData.ts:73
export const getAllMagicItems = (ruleset: Ruleset = "RULES_2014") => …
// src/app/magic-items/page.tsx:20
const itemsRaw = getAllMagicItems();
```

Браузер, персонаж 2024: `MAGIC IFRAME SRC: /magic-items?origin=character&persId=56&persName=…`
(`shots/L10-3-add-magic-item.png`). Маршрут `/2024/magic-items` існує й передає
`getAllMagicItems("RULES_2024")` — але діалог на нього не показує. У базі 445 предметів
`RULES_2024`.

**fix_hint:** підставляти `pers.ruleset === "RULES_2024" ? "/2024/magic-items" : "/magic-items"`
(або передавати `ruleset` параметром і читати його в `magic-items-client`). Effort **S**.

---

### L10-sheet-config-05 (P2) — ліміт налаштування на три предмети не рахується і не показується

**Оракул:** `data/2024/srd/equipment.md:2161` — «You can be attuned to no more than three magic
items at a time. Any attempt to attune to a fourth item fails… Additionally, you can't attune to
more than one copy of an item.»

`isAttuned` перемикається вільно, без жодної перевірки:

```tsx
// src/lib/components/characterSheet/slides/CombatSlide.tsx:82
onClick={() => onUpdate({ isAttuned: !pmi.isAttuned })}
```

Серверна дія `updateMagicItem` (`src/lib/actions/magic-item-actions.ts:30`) передає `updates` у
`prisma.persMagicItem.update` без валідації. `grep -rn "isAttuned" src/` дає 12 входжень — жодного
підрахунку. Лічильника «Налаштовано 2/3» на листі немає.

D&D Beyond показує цей лічильник і блокує четверте налаштування; Roll20 (charactermancer) — теж.

**fix_hint:** чиста функція `src/rules/attunement.ts` (`findAttunementCapacity`, з урахуванням
Artificer, який має 4 на 10 рівні: `data/2024/srd/classes.md:7161` «You can attune to up to four
magic items at once»), перевірка в `updateMagicItem` і бейдж на слайді «Спорядження». Effort **S**.

---

### L10-sheet-config-06 (P2) — зарядів магічних предметів немає взагалі

```
select column_name from information_schema.columns where table_name='pers_magic_item';
 pers_magic_item_id | pers_id | magic_item_id | is_attuned | is_equipped
```

Ні `charges_remaining`, ні `charges_max`; у `model MagicItem` теж немає полів зарядів. `grep -rni
"charge|заряд" src/lib/components/characterSheet src/lib/actions/magic-item-actions.ts
src/server/db/magic-items.ts` — жодного збігу.

Це найпоширеніший ручний трекер на листі після HP: «Жезл вогняних куль (7 зарядів)», «Сумка
хитрощів», «Плащ мани». D&D Beyond дає лічильник із поверненням на світанку; Roll20 — теж.
Обійти можна тільки нотатками.

**fix_hint:** `charges` / `max_charges` у `pers_magic_item` (DDL у `db/changes/`), розбір
«expends N charges … regains 1d6+4 at dawn» уже є в описах предметів; повернення чіпляти до
`rest-actions.ts` (довгий відпочинок). Effort **L** (потрібен DDL і розбір даних).

---

### L10-sheet-config-07 (P2) — ваги й навантаження немає

`grep -rni "weight|вага|навантаж|carrying|encumb" src/lib/components src/rules src/lib/logic
src/server/pdf` дає лише CSS `font-weight` і сортувальну вагу у `FeatChoiceOptionsForm`.
Спорядження — вільний текст `pers.custom_equipment`; ні предмет, ні кількість, ні вага не є
даними. Отже, немає ні суми ваги, ні `STR × 15`, ні порогів обтяження.

**Оракул:** `data/2024/srd/equipment.md`, «Carrying Capacity»; `playing-the-game.md` — правила
обтяження.

**fix_hint:** окрема ціль: структурований інвентар (`pers_item` із кількістю й вагою) замість
текстового блоку. Effort **L**.

---

### L10-sheet-config-08 (P2) — станів і виснаження на листі немає

Стани живуть тільки як довідник (`src/lib/rulesData.ts:87–290`, `src/lib/rules2024Data.ts:54`), на
персонажа їх не почепиш: у `model Pers` немає ні `conditions`, ні `exhaustion_level`.

**Оракул:** `data/2024/srd/rules-glossary.md:774–778` — «_Exhaustion Levels._ This condition is
cumulative. Each time you receive it, you gain 1 Exhaustion level. You die if your Exhaustion level
is 6.» У 2024 виснаження дає −2 × рівень до всіх перевірок к20 і −5 × рівень до швидкості, тобто
міняє **всі** числа листа.

Зараз гравець мусить сам вписувати мінуси в кожен бонус окремо (шість характеристик, ряткидки,
навички, швидкість) і памʼятати, що це треба зняти. D&D Beyond і Roll20 обидва мають перемикачі
станів, які автоматично міняють похідні.

**fix_hint:** `pers.conditions Condition[]` + `exhaustion_level Int`, чиста функція
`src/rules/conditions.ts`, яку читає `bonus-calculator`. Effort **L**.

---

### L10-sheet-config-09 (P2) — натхнення (Heroic Inspiration) не відстежується

**Оракул:** `data/2024/srd/rules-glossary.md:865–869` — «If you (a player character) have Heroic
Inspiration, you can expend it to reroll any die immediately after rolling it…»

У `model Pers` поля немає; `grep -rn "Натхнення|натхнення" src/lib src/app --include='*.tsx'` дає
лише текст правил у `rulesData.ts`. Це чекбокс на офіційному аркуші D&D і в D&D Beyond, і 2024
роздає його частіше за 2014 (виду Люди воно дається як видова риса).

**fix_hint:** `pers.has_heroic_inspiration Boolean` + перемикач у шапці листа поруч із натхненням
кубиків. Effort **S** (DDL + одна кнопка).

---

### L10-sheet-config-10 (P2) — рівень не можна знизити, підклас не можна змінити, респеку немає

`grep -rn "levelDown|decreaseLevel|respec|знизити рівень"` по `src/lib src/app src/server src/rules`
— жодного збігу. `updatePersSubclass` (`src/server/db/legacy-levelup.ts:8`) кличеться рівно з
одного місця — транзакції підвищення рівня (`src/lib/actions/character-transaction.ts:52`).

Отже: помилився на виборі підкласу на 3 рівні — переграти не можна; підняв рівень зайвий раз —
відкотити не можна; захотів перерозподілити характеристики після ASI — не можна.
Часткові обхідні шляхи, які **є**: копія персонажа зі знімка попереднього рівня
(`SnapshotHistoryModal.tsx:74` → `duplicatePers(snapshotId)`) — але це **новий** персонаж із новим
id, тобто всі посилання, шеринг і теки треба заводити заново.

D&D Beyond дає «Manage Levels» із видаленням рівня і повний респек; Roll20 — редагування будь-якого
поля.

**fix_hint:** мінімум — дія «відкотити останній рівень» поверх наявних знімків
(`snapshot-actions.ts` вже зберігає стан кожного рівня) із записом **у той самий** `pers_id`.
Effort **L**.

---

### L10-sheet-config-11 (P2) — своєї фічі з текстом і ресурсом додати не можна

Стовпець під це є й **не використовується**: `pers.custom_features` (`prisma/schema.prisma`, `model
Pers`) зустрічається у `src/` рівно тричі — `share-actions.ts`, `snapshots.ts`,
`pers-duplication.ts`, тобто його лише копіюють. Жодного місця, де його читає чи пише UI, немає.

Так само немає способу створити власний ресурс: `grep -rn "persResourcePool.create|
createResourcePool|addResourcePool" src/` — порожньо; `feature-uses.ts` уміє лише витрачати й
повертати використання **наявних** фіч.

Наслідок: домашня риса від майстра, благословення, тимчасова здібність («3 рази на день, повертає
короткий відпочинок») на листі не існує. D&D Beyond має «Custom Actions», «Extras» і лічильники з
відновленням.

**fix_hint:** мінімальний варіант — увімкнути `custom_features` у слайді «Фічі» як список
`{назва, текст, uses, recharge}` у JSON. Effort **M**.

---

### L10-sheet-config-12 (P2) — володіння і мови — один текстовий блок, а не дані

```ts
// src/server/db/character-creation.ts:713
const customProficiencies = profLines.join("\n");
```

Володіння бронею, зброєю та інструментами з виду, класу, підвиду, підкласу, походження й риси
зшиваються в **один рядок** і далі живуть як проза (`MainStatsSlide.tsx:917` — `<textarea>`).
Мови так само (`character-creation.ts:750`, `MainStatsSlide.tsx:955`).

Що з цього випливає **на листі**:

* додати одне володіння інструментом (наприклад, від дару майстра) можна лише дописавши слово в
  абзац — жодна механіка цього не побачить;
* `PersWeapon.isProficient` не звіряється з цим текстом узагалі (див. знахідку 14);
* діалог «Мови» (`MainStatsSlide.tsx:1010–1046`) підставляє **перезаписом** усього поля з набору
  чекбоксів: токени, яких немає в `LanguageTranslations` (наприклад «Тайнопис злодіїв» або будь-яка
  примітка), у чекбоксах не показуються, зняти їх не можна, а переноси рядків після «Підставити»
  сплющуються в коми;
* друк, копія й шеринг несуть той самий текст — звірити його з правилами неможливо.

D&D Beyond тримає володіння списком із джерелом кожного («Light Armor — Fighter»), і саме тому вміє
показати дубль і порахувати заміну.

**fix_hint:** структуровані `pers_proficiency` / `pers_language` з `source`, а текстове поле лишити
як «інше». Effort **L**; косметичну частину (діалог мов не має сплющувати рядки) — **S**.

---

### L10-sheet-config-13 (P2) — портрета й зовнішності немає

`model Pers` не має ні `image_url`, ні `avatar`, ні `age`/`height`/`weight`/`eyes`/`hair`/`skin`
(єдиний `image_url` у схемі — рядок 340, це інша модель). У «Детальній інформації» є нотатки,
риси характеру, ідеали, привʼязаності, вади й передісторія — зовнішності немає взагалі.

Портрет — перше, що бачить гравець у D&D Beyond і Roll20, і єдине, що робить список персонажів
впізнаваним. У списку `/char/home` персонажі відрізняються лише текстом.

**fix_hint:** `pers.image_url` + завантаження у вже наявний сторедж (або зовнішнє посилання, як
дешевий перший крок) + поля зовнішності одним JSON. Effort **M**.

---

### L10-sheet-config-14 (P2) — будь-яка додана зброя одразу «з володінням»

```tsx
// src/lib/components/characterSheet/AddWeaponDialog.tsx:54-60
const res = await addWeapon(persId, weapon.weaponId, {
  overrideName: …, customDamageDice: weapon.damage,
  isProficient: true,          // ← завжди
});
// :72-78 — те саме для кастомної зброї
```

і сервер закріплює той самий дефолт: `isProficient: customData.isProficient ?? true`
(`src/server/db/equipment-actions.ts:73`).

Чарівник, який додав на лист дворучний меч, отримує бонус майстерності до атаки, поки сам не зніме
галочку у `WeaponCustomizeModal`. Оскільки володіння зброєю зберігаються прозою (знахідка 12),
вивести правильне значення нізвідки — але дефолт `true` мовчки завищує число, а дефолт «питати»
принаймні не бреше.

**fix_hint:** доки немає структурних володінь — виводити `isProficient` із
`class.weaponProficiencies` / `race.weaponProficiencies` за `weapon.weaponType` (ці дані структурні,
на відміну від тексту на листі). Effort **S**.

---

### L10-sheet-config-15 (P3) — поля налаштування, які є в базі, але яких немає в UI

* `PersWeapon.overrideDamageType`, `overrideNormalRange`, `overrideLongRange`,
  `overrideAttackAbility` — у `WeaponCustomizeModal` редагуються лише `overrideName`, `attackBonus`,
  `customDamageBonus`, `customDamageDice`, `customDamageAbility`, `isMagical`, `isProficient`
  (`WeaponCustomizeModal.tsx:24-33`), і `updateWeapon` решти навіть не приймає
  (`equipment-actions.ts:90-101`). Тобто зробити «кинджал, що завдає шкоду холодом» або лук із
  іншою дальністю не можна, хоча стовпці під це є.
* `PersSkill.customModifier` — читається лише в копії/знімку/шерингу
  (`pers-duplication.ts:132`, `snapshots.ts:127`, `share-actions.ts:766`); власний бонус до навички
  лист пише в `skillBonuses` JSON. Мертвий стовпець-дубль.

**fix_hint:** або довести поля до UI, або прибрати їх із моделі, щоб наступна сесія не рахувала їх
робочими. Effort **S**.

---

## Перевірено й правильно

* **Модалка характеристики зберігається одним записом.** База, бонус до значення, бонус до
  модифікатора, бонус до ряткидка й володіння ряткидком летять одним `prisma.pers.update`
  (`bonus-actions.ts:479–541`), і коментар пояснює чому: три паралельні запити рахували б зсув хітів
  кожен зі свого стану. Для Статури зсув максимуму хітів заднім числом рахує
  `findRetroactiveConstitutionHitPoints` і одразу підрізає поточні хіти.
* **Р22 виконано:** максимум хітів редагується напряму (`updateMaxHp`), із валідацією ≥ 1 і
  підрізанням поточних хітів до нового максимуму.
* **Тимчасові хіти не складаються** — беруть більше (`combat-actions.ts:64`), як у книзі; шкода
  спершу зʼїдає тимчасові.
* **Ряткидки смерті** обмежені 0–3, три успіхи стабілізують на 1 HP, три провали ставлять `isDead`,
  повернення вище 0 HP скидає їх (`combat-actions.ts:73–142`). Є кнопка «Відродити (1 HP)».
* **КЗ** має і override бази (`overrideBaseAC`, найвищий пріоритет), і бонус, і окремий бонус щита,
  і статичний видовий бонус (`raceStaticAcBonus`) — з листа налаштовується повністю.
* **Навички** дають усі чотири стани володіння (НЕМА / ПОЛОВИНА / ВОЛОДІННЯ / ЕКСПЕРТИЗА) плюс
  власний бонус — це рівно те, що дає D&D Beyond.
* **Каталог рис редакційно свідомий:** `FeaturesSlide.tsx:818` передає `ruleset={pers.ruleset}` у
  `FeatsSheetManagerModal`, і той вантажить `getAllFeats(ruleset)`. (На відміну від зброї й
  предметів — знахідки 02 і 04.)
* **Зброя й обладунок налаштовуються глибоко:** кастомна назва, бонус атаки, кубик і бонус шкоди,
  характеристика шкоди, магічність, володіння, видалення; обладунок — override базового КЗ,
  характеристики бонусу, тип бонусу (FULL / MAX_2 / NONE), misc-бонус, «вдягнути» з автоматичним
  зняттям решти.
* **Доступ перевіряється в кожній дії.** `assertOwnsPers` (у `bonus-actions`, `combat-actions`,
  `equipment-actions`, `magic-item-actions`, `feat-actions`) щоразу йде через `canEditPers`, тобто
  враховує і `PersAdditionalUser`, і `PersShareToken.canEdit` — редагування з листа, відкритого за
  посиланням, працює саме там, де дозволено.
* **Автозбереження «Детальної інформації»** дебаунситься на 2 с і йде через офлайн-чергу
  (`commitOperation`, `MainStatsSlide.tsx:296–306`), тобто нотатки не губляться без мережі.
* **Другорядні потоки на місці:** копія персонажа (`PERS_DUPLICATION_INCLUDE` тягне магічні
  предмети з `isAttuned`, навички з `customModifier`, кастомні тексти), знімки з історією рівнів,
  шеринг із правом редагування, теки з кольором/закріпленням/вкладеністю, друк.

## Не перевірено

* Поведінку діалогу заклинань (`AddSpellDialog.tsx`) у браузері — файл у списку паралельної сесії
  (KR27.7), обмежився читанням.
* Браузерне підтвердження знахідки 03 (швидкість Голіафа) — `TRUNCATE` від паралельного прогону
  знищив персонажа посеред перевірки; лишився доказ із коду + бази + SRD.
* Мобільний вигляд (375×812) слайдів налаштування.
* Чи переживає копія/друк нововведені поля — перевіряв лише за кодом `pers-duplication.ts`.
