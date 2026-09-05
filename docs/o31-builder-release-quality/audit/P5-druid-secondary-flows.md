# P5 — Друїд 2024 і вторинні потоки

Мітка: `P5-druid-secondary-flows`. Дата: 2026-09-04. База: `spells_test`. Сервер: `http://127.0.0.1:3100`.

## Персонаж, на якому все міряно

`pers_id = 13` — «Лісовий Друїд P5»: Ельф 2024 (родовід Лісовий ельф, Гострі чуття → Уважність),
Друїд 2024, Провідник (`GUIDE_2024`), риса походження Magic Initiate (список друїда),
підклас Коло місяця з 3 рівня, ASI на 4-му (+2 МУД), рівень 5.
Зібраний справжніми серверними діями (`createCharacter` + 4 × `levelUpCharacter`) через
`tests/helpers/build-2024-character.ts`; скрипт — `work/P5-druid-secondary-flows/build2.ts.bak`,
результат — `work/P5-druid-secondary-flows/built.json`.
Похідні числа на листі: КБ 13, ХП 38, комірки 4/3/2, СК 15, бонус атаки закл. +7, МУД 19 — правильні.

Знімок → `pers_id = 19`, копія → `pers_id = 20` (створені `work/.../flows.test.ts`, результат
`work/.../flows.json`).

---

## P5-01 (P0) Копія і знімок персонажа втрачають редакцію: 2024 → RULES_2014

**Правило/очікування.** Копія і знімок мусять бути тим самим персонажем. `ruleset` — вимір, від
якого залежить усе: бастіони, Дика форма, майстерність зброї, підготовка заклинань.

**Доказ (код).** `src/lib/logic/pers-duplication.ts:44-116` — обʼєкт `data`, з якого створюється
копія, не містить поля `ruleset` взагалі. Те саме в другій, незалежній реалізації
`src/server/db/snapshots.ts:40-113`. `grep -n "ruleset" src/lib/logic/pers-duplication.ts
src/server/db/snapshots.ts` → жодного збігу. У схемі `Pers.ruleset` має
`@default(RULES_2014)` (`prisma/schema.prisma`), тож новий рядок мовчки стає 2014.

**Доказ (виконано).** `work/.../flows.json`:

```
"origin":      { "ruleset": "RULES_2024", "level": 5 }        ← pers 13
"snapshotRow": { "persId": 19, "ruleset": "RULES_2014", "classId": 342, "subclassId": 133 }
"copies":      [ { "persId": 20, "ruleset": "RULES_2014" } ]
```

`classId 342` — це `DRUID_2024`, `subclassId 133` — Коло місяця 2024. Тобто виходить гібрид:
контент 2024, правила 2014.

**Доказ (лист).** `shots/P5-copy-sheet.png` проти `shots/P5-sheet-original.png`:

* оригінал має блок **БАСТІОН → Доступний / Створити**; копія його **не має взагалі**
  (`createBastionForPers` віддає «Бастіони — механіка правил 2024», `src/lib/actions/bastion-actions.ts:47`);
* картка Дикої форми оригіналу: `Відомі форми 0 / 6 · КР до 1 · політ з 8 рівня · плавання
  дозволено · лазіння без обмежень · вхід і вихід — бонусна дія · тимчасові ХП +15 · заміна
  однієї форми за довгий відпочинок`;
  картка копії: `КР до 1 · політ з 8 рівня · плавання дозволено · лазіння без обмежень` —
  без межі відомих форм, без тимчасових ХП, без бонусної дії, бо `findWildshapeLimits` дістав
  рядок таблиці 2014.

**Відтворення.** Створити 2024-персонажа → `/char/home` → «Дублювати» (або
`duplicatePers(persId)`) → відкрити копію: блока «Бастіон» немає, рядок обмежень Дикої форми
2014-й. Так само `createCharacterSnapshot(persId)`.

**Виправити.** Додати `ruleset: pers.ruleset` в обидва `data` (і покрити тестом «копія і знімок
несуть редакцію оригіналу»).

---

## P5-02 (P1) Копія персонажа не переносить дику форму, пули ресурсів і бастіон

**Доказ.** `PERS_DUPLICATION_INCLUDE` (`src/lib/logic/pers-duplication.ts:3-26`) перелічує
20 звʼязків; у моделі `Pers` (`prisma/schema.prisma`) є ще `wildshapes PersWildshape[]`,
`resourcePools PersResourcePool[]`, `bastion PersBastion?`. Жодного з трьох ані в `include`,
ані в тілі `clonePersWithRelations` (`grep -n "wildshape\|resourcePool\|bastion"
src/lib/logic/pers-duplication.ts` → порожньо).

**Наслідок.** Копія втрачає прикріплені звірині форми (Р25 — форма може лишатися прикріпленою
навіть коли зникла з каталогу), поточні залишки пулів (`WILD_SHAPE`, `SORCERY_POINTS`, …) і
весь бастіон з приміщеннями та ходами. Той самий код обслуговує копію папки
(`src/server/db/pers-actions.ts:430`) і копію з чужої розшареної папки
(`src/server/db/share-actions.ts:616`).

**Виправити.** Додати три звʼязки в `include` і три блоки `createMany`/`create` (бастіон —
з `PersBastionFacility` і `PersBastionTurn`).

---

## P5-03 (P1) Знімок — окрема друга реалізація копіювання, ще бідніша за першу

**Доказ.** `src/server/db/snapshots.ts:19-226` не використовує `clonePersWithRelations`, а
повторює її вручну. У знімок не потрапляють:
`pers_weapon_mastery`, `persInfusions`, `wildshapes`, `resourcePools`, `bastion`,
`folderId`, `isPinned`, `raceStaticAcBonus` (є) — а також:

* зброя копіюється лише пʼятьма полями (`snapshots.ts:174-186`), тоді як копія персонажа
  переносить чотирнадцять (`pers-duplication.ts:182-208`): губляться `overrideDamage`,
  `attackBonus`, `overrideNormalRange`/`overrideLongRange`, `overrideDamageType`,
  `overrideAttackAbility`, `isMagical`, `customAttackBonus`, `customDamageCount`;
* магічні предмети — без `isEquipped` і `isAttuned` (`snapshots.ts:213-220`).

**Доказ (виконано).** `flows.json → "snapshotMastery": 0` — у знімка нуль рядків майстерності
зброї (у нашого друїда їх і так нема, але шлях спільний для всіх класів 2024).

**Наслідок.** «Відновись зі знімка» не повертає стан: після відновлення персонаж — 2014 (P5-01),
без майстерності зброї, без екіпірованих/налаштованих магічних предметів, без бастіону.
Плюс: `activatePersSnapshot` лише ставить `isActive = true` на знімку
(`snapshots.ts:245-247`) — батьківський персонаж не деактивується і не оновлюється, тобто
«відновлення» фактично множить персонажів, а не повертає стан.

**Виправити.** Знімок має ходити через `clonePersWithRelations` з
`{ isSnapshot: true, parentPersId, snapshotLevel, isActive: false }` — одна реалізація замість двох.

---

## P5-04 (P1) Дика форма 2024 не має використань: ні лічильника, ні витрати, ні відновлення

**Правило.** `data/2024/srd/classes.md:3533` — «_Number of Uses._ You can use Wild Shape twice.
You regain one expended use when you finish a Short Rest, and you regain all expended uses when
you finish a Long Rest.» Стовпчик «Wild Shape» таблиці класу: 2 / 3 / 4.

**Доказ (дані).** Запит до `spells_test`:

```
feature 17928 "Wild Shape"                limited_uses_per=SHORT_REST uses_count=2   uses_pool_key=WILD_SHAPE  ruleset=RULES_2014
feature 48895 "Druid: Wild Shape (2024)"  limited_uses_per=NULL       uses_count=NULL uses_pool_key=NULL        ruleset=RULES_2024
```

**Доказ (лист).** `shots/P5-sheet-original.png`, картка ДИКА ФОРМА: є «Відомі форми 0 / 6» і
рядок обмежень — **рядка «Використань N / M» немає**. Він малюється лише коли
`uses !== null` (`src/lib/components/characterSheet/WildshapeCard.tsx:106-108`), а
`findWildshapeUses` віддає `null`, бо `findFormFeatureOfPers` шукає фічі за
`where: { usesPoolKey: "WILD_SHAPE" }` (`src/server/db/wildshape-uses.ts:64-73`) і не знаходить
жодної.

**Наслідок.** Перетворення нічого не коштує, `spendWildshapeUse` — no-op
(`wildshape-uses.ts:50-61` виходить на `if (!uses) return null`), короткий і довгий відпочинок
не мають чого відновлювати. Разом із цим мовчки не працюють «Дикий супутник» (витрачає
використання Дикої форми, `classes.md:3588`) і «Дике відродження» 5 рівня
(`classes.md:3602-3604`).

**Виправити.** `prisma/seed/…` для `Druid: Wild Shape (2024)`:
`usesPoolKey = "WILD_SHAPE"`, `usesCount` через `usesCountSpecial` (2/3/4 за рівнем друїда,
пороги 2/6/17), `limitedUsesPer = SHORT_REST` — і одразу P5-05 та P5-06, інакше запис нічого не
змінить.

---

## P5-05 (P1) `findFormFeature` не впізнає фічу 2024: збіг за `engName === "Wild Shape"`

**Доказ.** `src/rules/wildshape-uses.ts:29-33`:

```ts
const FORM_FEATURE_BY_CREATURE_TYPE = [
  { creatureType: "звір", engName: "Wild Shape" },
  { creatureType: "елементаль", engName: "Elemental Wild Shape" },
];
```

і далі `features.find((feature) => feature.engName === engName)` (`:41-46`). Англійська назва
фічі 2024 в базі — `Druid: Wild Shape (2024)` (feature 48895), тому збігу не буде **навіть
після** того, як їй проставлять `usesPoolKey`. Це другий, незалежний розрив того самого ланцюга.

**Виправити.** Тримати список назв на тип істоти (`["Wild Shape", "Druid: Wild Shape (2024)"]`)
або звʼязувати фічу з типом істоти окремим полем, а не літералом англійської назви.

---

## P5-06 (P2) Короткий відпочинок відновив би пул Дикої форми повністю, а не на одне використання

**Правило.** `data/2024/srd/classes.md:3533` — «regain **one** expended use when you finish a
Short Rest».

**Доказ.** `src/server/db/rest-actions.ts:221-241`: для кожного пулу з провайдером, у якого
`limitedUsesPer = SHORT_REST`, ставиться `usesRemaining = maxUses` — повний максимум, без
поняття «+1». Іншого шляху для пулів у коротким відпочинку немає.

Зараз це сплячий дефект (пулу немає взагалі — P5-04), але він спрацює рівно тим днем, коли
P5-04 закриють даними: друїд 5 рівня діставатиме всі 2 використання за короткий відпочинок
замість одного.

**Виправити.** Дати `Feature` спосіб сказати «за короткий відпочинок повертається N», і в
`shortRest` рахувати `min(max, remaining + N)`.

---

## P5-07 (P1) Первісне призначення: вибору Warden / Magician немає взагалі

**Правило.** `data/2024/srd/classes.md:3521-3527` — «#### Level 1: Primal Order. You have
dedicated yourself to **one of the following** sacred roles **of your choice**. _Magician._ …one
extra cantrip from the Druid spell list… bonus to Intelligence (Arcana or Nature) checks…
_Warden._ …proficiency with Martial weapons and training with Medium armor.»

**Доказ.** Фіча `Druid: Primal Order (2024)` (feature 48894) прикріплена на 1 рівні, але
`prisma.classChoiceOption.findMany({ where: { classId: 342 } })` → **порожньо**
(`work/.../probe.json → "classChoices": []`). Серед усіх 2024-класів взагалі є лише чотири
групи виборів: `PALADIN_2024::Бойовий стиль`, `RANGER_2024::Бойовий стиль`,
`WARLOCK_2024::Потойбічні виклики`, `FIGHTER_2024::Бойовий стиль`
(`work/.../probe2.json → allClassChoiceGroupsFor2024Classes`).

**Доказ (лист).** `shots/P5-sheet-original.png`: у списку рис є «Первісне призначення» без
жодної позначки вибору, поруч із «Ельфійський родовід (Лісовий ельф) ВИБІР».

**Наслідок.** Гравець-Warden не отримує володіння військовою зброєю й середнім обладунком
(а це прямо КБ і атаки), гравець-Magician — додаткового замовляння і бонусу до Магії/Природи.
Виправити на листі теж не можна: вибір не існує.

**Виправити.** Сідом додати `ChoiceOption` групи «Первісне призначення» з опціями
`Warden` / `Magician` і `classChoiceOption` на рівень 1 класу 342; володіння вішати через
`weaponProficiencies`/`armorProficiencies` опції, як у Бойових стилів.

---

## P5-08 (P1) Лісовий ельф: швидкість 35 футів не застосовується — лист показує 30

**Правило.** `data/2024/srd/character-origins.md:221-222` — «Wood Elf. **Your Speed increases to
35 feet.** You also know the Druidcraft cantrip.»

**Доказ (дані).** У базі значення є:
`select option_id, option_name_eng, modifies_speed from race_choice_option where option_id=131`
→ `131 | Wood Elf | 35`.

**Доказ (код).** `grep -rni "modifies_speed\|modifiesSpeed" src prisma/schema.prisma` дає рівно
один рядок — оголошення колонки `prisma/schema.prisma:969`. **Жоден файл у `src/` її не читає.**

**Доказ (лист).** `shots/P5-sheet-original.png`: плитка «ШВИДКІСТЬ 30», хоча на тому самому
екрані текст вибору каже «Ваша швидкість зростає до 35 футів».

**Виправити.** `bonus-calculator.ts` (похідна швидкість) має брати максимум із базової швидкості
виду й `modifiesSpeed` обраних `raceChoiceOptions`.

---

# Перевірено й правильно

* **Похідні числа листа 5-рівневого друїда**: ХП 38 (8 + 4×5 + 5×2 при СТА 15), КБ 13
  (шкіряний 11 + СПР 2), комірки 1-3 = 4/3/2, СК 15, бонус атаки заклинаннями +7,
  майстерність +3, хіт-дайси 5/5 d8, МУД 19 після ASI 4 рівня. `shots/P5-sheet-original.png`.
* **Дика форма 2024, межі**: «Відомі форми 0 / 6» на 5 рівні — рядок таблиці Beast Shapes
  `classes.md:3555-3568` (рівень 4 → 6 форм) ✔; «КР до 1» — Коло місяця, `floor(5/3) = 1` ✔;
  «плавання дозволено» ✔ (у таблиці 2024 стовпчика плавання немає взагалі, тільки Fly Speed);
  «політ з 8 рівня» ✔; «тимчасові ХП +15» = рівень 5 × 3 (потроєння Кола місяця) ✔;
  «вхід і вихід — бонусна дія» ✔; «заміна однієї форми за довгий відпочинок» ✔
  (`classes.md:3531`, `3570`, `3578`).
* **Рівні риc друїда 2024** проти `classes.md`: Spellcasting/Druidic/Primal Order на 1,
  Wild Shape і Wild Companion на 2, підклас на 3, ASI на 4, Wild Resurgence на 5 — збігається
  один в один (`work/.../probe2.json → classFeatures`).
* **Коло місяця 2024**: Circle Forms і Circle of the Moon Spells на 3, Improved Circle Forms
  на 6, Moonlight Step на 10, Lunar Form на 14 — за книгою; підклас справді з 3 рівня
  (`class.subclassLevel = 3`).
* **Сторінка бастіону** `/char/13/bastion` віддає 200, підписана «ОПЦІЙНА СИСТЕМА 2024», має
  кнопку «Створити» і «Каталог приміщень бастіону» (`shots/P5-bastion.png`).
* **Заклинання від родоводу** приїхали з правильним джерелом: Ремесло друїдів / Скорохід /
  Переміщення без сліду, `origin = RACE`, `sourceName = "Elven Lineage: Wood Elf (2024)"`,
  усі підготовлені — це відповідає Р38 (одне заклинання з кількох джерел = один рядок).
* **Консоль браузера чиста**: ні `console.error`, ні `pageerror` на листі, копії, бастіоні й
  діалозі шеринга.
* **Створення й 4 підвищення рівня пройшли без помилок**: `creationError: null`,
  `levelUpErrors: []`.

# Не перевірено (бракло часу / потрібен інший крок)

* **Перетворення у вовка**: жодної форми не прикріплено, а прикріплення йде через
  `WildshapeCard` → каталог бестіарію (`@/lib/bestiaryData`, файловий, не БД). Не перевірено,
  чи фільтр бестіарію бере записи 2024 і чи ріже за КР/польотом.
* **Друк / PDF**: діалог `PrintCharacterDialog` не відкривався, PDF не витягнутий.
* **Шеринг у новому контексті**: діалог відкрився (`shots/P5-share-dialog.png`), але посилання
  генерується окремою кнопкою «Згенерувати посилання» — токен не створено
  (`pers.sharetoken = null`, `pers_share_token` порожня), тож анонімний перегляд не перевірено.
* **Хід бастіону (Р26)** і вибір приміщень із передумовами — не перевірено.
* **Magic Initiate (друїд)**: фіча «Посвячений у магію: список друїда» на листі є, з
  лічильником безкоштовного застосування (LONG_REST / 1), але **двох замовлянь і заклинання
  1 рівня немає** — моя фікстура подала лише вибір «Список заклинань», тож це може бути мій
  недобір, а не дефект. Треба перевірити в конструкторі, чи є крок вибору цих заклинань.
* **Видалення копії** — не робив, `pers 19` і `pers 20` лишилися в `spells_test`.
